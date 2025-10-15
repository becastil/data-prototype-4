import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../../../../../../lib/prisma";
import nodemailer from "nodemailer";
import { EmailDeliverySchema } from "@medical-reporting/lib";
import { ZodError } from "zod";

// Simple rate limiting: max 10 emails per user per hour
// TODO: Replace in-memory rate limiting with database-backed or Redis solution
// for production. Current implementation resets on server restart/pod recreation,
// which could allow rate limit bypass in serverless/container environments.
// Consider: Upstash Redis, Vercel KV, or database table with TTL
const emailRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const limit = emailRateLimits.get(userId);

  if (!limit || now > limit.resetAt) {
    emailRateLimits.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 }); // 1 hour
    return { allowed: true, remaining: 9 };
  }

  if (limit.count >= 10) {
    return { allowed: false, remaining: 0 };
  }

  limit.count++;
  return { allowed: true, remaining: 10 - limit.count };
}

/**
 * POST /api/budget/deliver/send
 *
 * Sends email with PDF attachment.
 * Creates email delivery audit log.
 *
 * Request body:
 * {
 *   to: string[],
 *   cc?: string[],
 *   subject: string,
 *   htmlBody: string,
 *   pdfBase64: string,
 *   planYearId: string
 * }
 *
 * Environment variables required:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 * - MAIL_FROM
 *
 * Returns: { success: true, messageId: string }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse and validate request body
    const body = await req.json();
    const validated = EmailDeliverySchema.parse(body);

    const { to, cc, subject, htmlBody, pdfBase64, planYearId } = validated;

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    // Get user for audit logging
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || !user.clientId) {
      return NextResponse.json(
        { error: "User not found or not associated with a client" },
        { status: 404 }
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 10 emails per hour." },
        { status: 429 }
      );
    }

    // Verify plan year access
    const planYear = await prisma.planYear.findUnique({
      where: { id: planYearId },
      include: { client: true },
    });

    if (!planYear || planYear.clientId !== user.clientId) {
      return NextResponse.json(
        { error: "Plan year not found or access denied" },
        { status: 403 }
      );
    }

    // Validate environment variables
    const requiredEnvVars = [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "MAIL_FROM",
    ];

    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
      console.error("Missing SMTP configuration:", missingVars);
      return NextResponse.json(
        {
          error: "Email service not configured",
          details:
            process.env.NODE_ENV === "development"
              ? `Missing: ${missingVars.join(", ")}`
              : undefined,
        },
        { status: 503 }
      );
    }

    // Configure SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT!),
      secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
      // Additional options for better compatibility
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    // Verify SMTP connection
    try {
      await transporter.verify();
    } catch (verifyError: unknown) {
      console.error("SMTP verification failed:", verifyError);
      const verificationMessage =
        verifyError instanceof Error ? verifyError.message : "Verification failed";
      return NextResponse.json(
        {
          error: "Email service connection failed",
          details:
            process.env.NODE_ENV === "development"
              ? verificationMessage
              : undefined,
        },
        { status: 503 }
      );
    }

    // Send email
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM!,
      to: to.join(", "),
      cc: cc && cc.length > 0 ? cc.join(", ") : undefined,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: "Claims_vs_Budget.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    // Log delivery to database
    await prisma.emailDeliveryLog.create({
      data: {
        planYearId,
        recipients: to,
        subject,
        sentBy: user.id,
        pdfSize: pdfBuffer.length,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      recipients: to.length,
      remaining: rateLimit.remaining,
    });
  } catch (error: unknown) {
    console.error("Email send error:", error);
    const isProd = process.env.NODE_ENV === "production";

    // Handle validation errors separately
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: isProd ? [] : error.issues,
        },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to send email";

    return NextResponse.json(
      {
        error: isProd ? "Internal server error" : "Failed to send email",
        message: isProd ? undefined : message,
      },
      { status: 500 }
    );
  }
}

