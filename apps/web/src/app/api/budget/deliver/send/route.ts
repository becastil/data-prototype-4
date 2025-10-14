import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../../../../../lib/prisma";
import nodemailer from "nodemailer";
import { EmailDeliverySchema } from "@medical-reporting/lib";

// Simple rate limiting: max 10 emails per user per hour
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
    } catch (verifyError: any) {
      console.error("SMTP verification failed:", verifyError);
      return NextResponse.json(
        {
          error: "Email service connection failed",
          details:
            process.env.NODE_ENV === "development"
              ? verifyError.message
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
  } catch (error: any) {
    console.error("Email send error:", error);

    // Handle validation errors separately
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: process.env.NODE_ENV === "production" ? [] : error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "production" ? "Internal server error" : "Failed to send email",
        message: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to generate email body HTML
 */
export function generateEmailBody(
  clientName: string,
  planYearLabel: string,
  ytdVariancePct: number,
  topDelta: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    h2 {
      color: #0066b2;
      border-bottom: 2px solid #0066b2;
      padding-bottom: 10px;
    }
    h3 {
      color: #1f2937;
      margin-top: 20px;
    }
    ul, ol {
      margin: 10px 0;
      padding-left: 25px;
    }
    li {
      margin: 8px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #d1d5db;
      font-size: 10pt;
      color: #6b7280;
    }
    .highlight {
      background: #dbeafe;
      padding: 3px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h2>Claims & Expenses vs Budget Report</h2>

  <p>Dear Team,</p>

  <p>Please find attached the <strong>Claims & Expenses vs Budget</strong> report for <strong>${clientName}</strong> (${planYearLabel}).</p>

  <h3>Executive Summary</h3>
  <ul>
    <li>YTD variance: <span class="highlight">${
      ytdVariancePct > 0 ? "+" : ""
    }${ytdVariancePct.toFixed(1)}%</span> vs budget</li>
    <li>Top delta: ${topDelta}</li>
  </ul>

  <p>The attached 2-page PDF contains:</p>
  <ol>
    <li><strong>Detailed monthly expense table</strong> with variance analysis by month, including year-to-date and last 3 months summaries</li>
    <li><strong>Visual trend charts</strong> and expense mix breakdown for quick insights</li>
  </ol>

  <p>This report provides comprehensive variance analysis to support budget planning and financial decision-making.</p>

  <div class="footer">
    <p><strong>Disclaimer:</strong> This report contains aggregated claims data for budget analysis purposes only. All figures are subject to final reconciliation and may not reflect real-time updates. Please contact your Gallagher representative with any questions.</p>

    <p style="margin-top: 15px;">
      <strong>Gallagher Benefits Services</strong><br>
      Confidential & Proprietary
    </p>
  </div>
</body>
</html>
  `;
}
