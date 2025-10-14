import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { PrismaClient } from "@prisma/client";
import { parseFile } from "@medical-reporting/lib";

/**
 * POST /api/budget/upload
 *
 * Parses and validates CSV/XLSX file containing monthly actuals data.
 * Stores validated rows in MonthlyActuals table with upsert logic.
 * Creates upload audit trail.
 *
 * Request: multipart/form-data
 * - file: CSV or XLSX file
 * - planYearId: UUID of plan year
 *
 * Returns:
 * - success: boolean
 * - rowsImported: number
 * - preview: array of first 5 rows
 * - errors: array of validation errors (if any)
 */
export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = new PrismaClient();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const planYearId = formData.get("planYearId") as string;

    if (!file || !planYearId) {
      return NextResponse.json(
        { error: "Missing file or planYearId" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;

    // Parse and validate file
    const parseResult = await parseFile(buffer, filename);

    // If there are validation errors, return them without saving
    if (parseResult.errors.length > 0) {
      return NextResponse.json({
        success: false,
        errors: parseResult.errors,
        preview: parseResult.data.slice(0, 5),
        totalRows: parseResult.totalRows,
      });
    }

    // Get user from DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || !user.clientId) {
      return NextResponse.json(
        { error: "User not found or not associated with a client" },
        { status: 404 }
      );
    }

    // Verify plan year belongs to user's client
    const planYear = await prisma.planYear.findUnique({
      where: { id: planYearId },
    });

    if (!planYear || planYear.clientId !== user.clientId) {
      return NextResponse.json(
        { error: "Plan year not found or access denied" },
        { status: 403 }
      );
    }

    // Store data in transaction
    await prisma.$transaction(async (tx) => {
      // Create upload audit record
      await tx.uploadAudit.create({
        data: {
          clientId: user.clientId!,
          planYearId,
          filename,
          userId: user.id,
          rowsImported: parseResult.data.length,
        },
      });

      // Upsert monthly actuals
      for (const row of parseResult.data) {
        await tx.monthlyActuals.upsert({
          where: {
            planYearId_serviceMonth: {
              planYearId,
              serviceMonth: row.service_month,
            },
          },
          create: {
            planYearId,
            serviceMonth: row.service_month,
            domesticFacilityIpOp: row.domestic_facility_ip_op,
            nonDomesticIpOp: row.non_domestic_ip_op,
            nonHospitalMedical: row.non_hospital_medical,
            rxClaims: row.rx_claims,
            eeCount: row.ee_count_active_cobra,
            memberCount: row.member_count,
          },
          update: {
            domesticFacilityIpOp: row.domestic_facility_ip_op,
            nonDomesticIpOp: row.non_domestic_ip_op,
            nonHospitalMedical: row.non_hospital_medical,
            rxClaims: row.rx_claims,
            eeCount: row.ee_count_active_cobra,
            memberCount: row.member_count,
          },
        });
      }
    });

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      rowsImported: parseResult.data.length,
      preview: parseResult.data.slice(0, 5),
      totalRows: parseResult.totalRows,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    await prisma.$disconnect();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
