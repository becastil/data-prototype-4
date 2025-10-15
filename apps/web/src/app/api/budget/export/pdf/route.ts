import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";

/**
 * POST /api/budget/export/pdf
 *
 * Generates PDF from HTML string using Puppeteer.
 * Optimized for 2-page Letter format with Gallagher branding.
 *
 * Request body: HTML string
 *
 * Returns: PDF buffer with appropriate headers
 */
export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const planYearId = req.headers.get("x-plan-year-id");

  if (!planYearId) {
    return NextResponse.json(
      { error: "Missing plan year context" },
      { status: 400 }
    );
  }

  let browser: puppeteer.Browser | null = null;
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || !user.clientId) {
      return NextResponse.json(
        { error: "User not found or not associated with a client" },
        { status: 404 }
      );
    }

    const planYear = await prisma.planYear.findUnique({
      where: { id: planYearId },
    });

    if (!planYear || planYear.clientId !== user.clientId) {
      return NextResponse.json(
        { error: "Plan year not found or access denied" },
        { status: 403 }
      );
    }

    const html = await req.text();

    if (!html || html.length === 0) {
      return NextResponse.json(
        { error: "Missing HTML content" },
        { status: 400 }
      );
    }

    // Launch Puppeteer with optimized args for server environment
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // Set content and wait for network idle
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Generate PDF with specific options for Letter format
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.6in",
        left: "0.5in",
      },
      displayHeaderFooter: false, // We handle headers/footers in HTML
    });

    await browser.close();

    // Return PDF with proper headers
    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Claims_vs_Budget.pdf"',
        "Content-Length": pdf.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    console.error("PDF generation error:", error);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }

    const isProd = process.env.NODE_ENV === "production";
    const message =
      error instanceof Error ? error.message : "Failed to generate PDF";
    const stack =
      !isProd && error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: "PDF generation failed",
        message,
        stack,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
