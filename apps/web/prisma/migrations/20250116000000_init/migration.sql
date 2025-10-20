-- Preserve legacy tables before creating the new schema
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users_legacy'
  ) THEN
    EXECUTE 'ALTER TABLE "public"."users" RENAME TO "users_legacy"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'dashboard_configs'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'dashboard_configs_legacy'
  ) THEN
    EXECUTE 'ALTER TABLE "public"."dashboard_configs" RENAME TO "dashboard_configs_legacy"';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('HDHP', 'PPO_BASE', 'PPO_BUYUP', 'ALL_PLANS');

-- CreateEnum
CREATE TYPE "ClaimantStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'PENDING');

-- CreateEnum
CREATE TYPE "AdminFeeType" AS ENUM ('PEPM', 'PMPM', 'FLAT');

-- CreateEnum
CREATE TYPE "AdjustmentItemType" AS ENUM ('UC_SETTLEMENT', 'RX_REBATES', 'STOPLOSS_REIMB');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'VIEWER', 'BROKER');

-- CreateEnum
CREATE TYPE "FeeUnitType" AS ENUM ('ANNUAL', 'MONTHLY', 'PEPM', 'PEPEM', 'PERCENT_OF_CLAIMS', 'FLAT');

-- CreateEnum
CREATE TYPE "FeeCategory" AS ENUM ('FIXED', 'CLAIMS', 'RX', 'ADMIN', 'STOP_LOSS', 'OTHER');

-- CreateTable
CREATE TABLE "Client" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cadence" TEXT NOT NULL DEFAULT 'monthly',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "PlanType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTier" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanYear" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "year_start" TIMESTAMP(3) NOT NULL,
    "year_end" TIMESTAMP(3) NOT NULL,
    "isl_limit" DECIMAL(12,2) NOT NULL DEFAULT 200000,
    "stop_loss_tracking_mode" TEXT NOT NULL DEFAULT 'BY_PLAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthSnapshot" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "month_date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyPlanStat" (
    "id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "total_subscribers" INTEGER NOT NULL,
    "medical_paid" DECIMAL(12,2) NOT NULL,
    "rx_paid" DECIMAL(12,2) NOT NULL,
    "spec_stop_loss_reimb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "est_rx_rebates" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "admin_fees" DECIMAL(12,2) NOT NULL,
    "stop_loss_fees" DECIMAL(12,2) NOT NULL,
    "budgeted_premium" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPlanStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HighClaimant" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "claimant_key" TEXT NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "ClaimantStatus" NOT NULL,
    "primary_diagnosis" TEXT,
    "med_paid" DECIMAL(12,2) NOT NULL,
    "rx_paid" DECIMAL(12,2) NOT NULL,
    "total_paid" DECIMAL(12,2) NOT NULL,
    "amount_exceeding_isl" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HighClaimant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CAndESummaryRow" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "month_date" TIMESTAMP(3) NOT NULL,
    "item_number" INTEGER NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "is_user_adjustment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CAndESummaryRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Input" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "rx_rebate_pepm_estimate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ibnr_adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "aggregate_factor" DECIMAL(5,4) NOT NULL DEFAULT 1.25,
    "asl_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Input_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumEquivalent" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "tier_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumEquivalent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminFeeComponent" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "fee_type" "AdminFeeType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "monthly_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminFeeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StopLossFeeByTier" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "tier_id" UUID NOT NULL,
    "isl_rate" DECIMAL(12,2) NOT NULL,
    "asl_rate" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StopLossFeeByTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAdjustment" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "month_date" TIMESTAMP(3) NOT NULL,
    "item_number" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObservationNote" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "month_date" TIMESTAMP(3),
    "text" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObservationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "client_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

DO $$ DECLARE
  uses_snake_case BOOLEAN := FALSE;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users_legacy'
  ) THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users_legacy'
        AND column_name = 'created_at'
    )
    INTO uses_snake_case;

    IF uses_snake_case THEN
      EXECUTE '
        INSERT INTO "public"."User" ("id", "email", "role", "client_id", "createdAt", "updatedAt")
        SELECT id, email, role, client_id,
               COALESCE(created_at, NOW()),
               COALESCE(updated_at, NOW())
        FROM "public"."users_legacy"
        ON CONFLICT ("id") DO NOTHING
      ';
    ELSE
      EXECUTE '
        INSERT INTO "public"."User" ("id", "email", "role", "client_id", "createdAt", "updatedAt")
        SELECT id, email, role, client_id,
               COALESCE("createdAt", NOW()),
               COALESCE("updatedAt", NOW())
        FROM "public"."users_legacy"
        ON CONFLICT ("id") DO NOTHING
      ';
    END IF;
  END IF;
END $$;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadAudit" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "rows_imported" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UploadAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyActuals" (
    "id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "service_month" TIMESTAMP(3) NOT NULL,
    "domestic_facility_ip_op" DECIMAL(12,2) NOT NULL,
    "non_domestic_ip_op" DECIMAL(12,2) NOT NULL,
    "non_hospital_medical" DECIMAL(12,2) NOT NULL,
    "rx_claims" DECIMAL(12,2) NOT NULL,
    "ee_count" INTEGER NOT NULL,
    "member_count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyActuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyConfig" (
    "id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "service_month" TIMESTAMP(3) NOT NULL,
    "expected_claims" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stop_loss_reimb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rx_rebates" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeWindow" (
    "id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "fee_name" TEXT NOT NULL,
    "unit_type" "FeeUnitType" NOT NULL,
    "rate" DECIMAL(12,4) NOT NULL,
    "applies_to" "FeeCategory" NOT NULL,
    "effective_start" TIMESTAMP(3) NOT NULL,
    "effective_end" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetConfig" (
    "id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "claims_model_type" TEXT NOT NULL DEFAULT 'DIRECT',
    "pct_claims_base" TEXT NOT NULL DEFAULT 'ACTUAL',
    "rounding_mode" TEXT NOT NULL DEFAULT 'HALF_UP',
    "currency_precision" INTEGER NOT NULL DEFAULT 2,
    "default_horizon_months" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDeliveryLog" (
    "id" UUID NOT NULL,
    "plan_year_id" UUID NOT NULL,
    "recipients" TEXT[],
    "subject" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_by" UUID NOT NULL,
    "pdf_size" INTEGER NOT NULL,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_active_idx" ON "Client"("active");

-- CreateIndex
CREATE INDEX "Plan_client_id_type_idx" ON "Plan"("client_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_client_id_name_key" ON "Plan"("client_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTier_plan_id_label_key" ON "PlanTier"("plan_id", "label");

-- CreateIndex
CREATE INDEX "PlanYear_client_id_year_start_year_end_idx" ON "PlanYear"("client_id", "year_start", "year_end");

-- CreateIndex
CREATE UNIQUE INDEX "PlanYear_client_id_year_start_key" ON "PlanYear"("client_id", "year_start");

-- CreateIndex
CREATE INDEX "MonthSnapshot_client_id_month_date_idx" ON "MonthSnapshot"("client_id", "month_date");

-- CreateIndex
CREATE UNIQUE INDEX "MonthSnapshot_client_id_plan_year_id_month_date_key" ON "MonthSnapshot"("client_id", "plan_year_id", "month_date");

-- CreateIndex
CREATE INDEX "MonthlyPlanStat_plan_id_snapshot_id_idx" ON "MonthlyPlanStat"("plan_id", "snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPlanStat_snapshot_id_plan_id_key" ON "MonthlyPlanStat"("snapshot_id", "plan_id");

-- CreateIndex
CREATE INDEX "HighClaimant_client_id_plan_year_id_total_paid_idx" ON "HighClaimant"("client_id", "plan_year_id", "total_paid");

-- CreateIndex
CREATE UNIQUE INDEX "HighClaimant_client_id_plan_year_id_claimant_key_key" ON "HighClaimant"("client_id", "plan_year_id", "claimant_key");

-- CreateIndex
CREATE INDEX "CAndESummaryRow_client_id_plan_year_id_month_date_idx" ON "CAndESummaryRow"("client_id", "plan_year_id", "month_date");

-- CreateIndex
CREATE UNIQUE INDEX "CAndESummaryRow_client_id_plan_year_id_month_date_item_numb_key" ON "CAndESummaryRow"("client_id", "plan_year_id", "month_date", "item_number");

-- CreateIndex
CREATE UNIQUE INDEX "Input_client_id_plan_year_id_key" ON "Input"("client_id", "plan_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "PremiumEquivalent_plan_id_tier_id_key" ON "PremiumEquivalent"("plan_id", "tier_id");

-- CreateIndex
CREATE INDEX "AdminFeeComponent_plan_id_idx" ON "AdminFeeComponent"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "StopLossFeeByTier_plan_id_tier_id_key" ON "StopLossFeeByTier"("plan_id", "tier_id");

-- CreateIndex
CREATE INDEX "UserAdjustment_client_id_plan_year_id_month_date_idx" ON "UserAdjustment"("client_id", "plan_year_id", "month_date");

-- CreateIndex
CREATE UNIQUE INDEX "UserAdjustment_client_id_plan_year_id_month_date_item_numbe_key" ON "UserAdjustment"("client_id", "plan_year_id", "month_date", "item_number");

-- CreateIndex
CREATE INDEX "ObservationNote_client_id_plan_year_id_month_date_idx" ON "ObservationNote"("client_id", "plan_year_id", "month_date");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_client_id_role_idx" ON "User"("client_id", "role");

-- CreateIndex
CREATE INDEX "AuditLog_client_id_timestamp_idx" ON "AuditLog"("client_id", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_actor_id_timestamp_idx" ON "AuditLog"("actor_id", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entity_id_idx" ON "AuditLog"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "UploadAudit_client_id_plan_year_id_uploaded_at_idx" ON "UploadAudit"("client_id", "plan_year_id", "uploaded_at");

-- CreateIndex
CREATE INDEX "MonthlyActuals_plan_year_id_service_month_idx" ON "MonthlyActuals"("plan_year_id", "service_month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyActuals_plan_year_id_service_month_key" ON "MonthlyActuals"("plan_year_id", "service_month");

-- CreateIndex
CREATE INDEX "MonthlyConfig_plan_year_id_service_month_idx" ON "MonthlyConfig"("plan_year_id", "service_month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyConfig_plan_year_id_service_month_key" ON "MonthlyConfig"("plan_year_id", "service_month");

-- CreateIndex
CREATE INDEX "FeeWindow_plan_year_id_effective_start_effective_end_idx" ON "FeeWindow"("plan_year_id", "effective_start", "effective_end");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetConfig_plan_year_id_key" ON "BudgetConfig"("plan_year_id");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_plan_year_id_sent_at_idx" ON "EmailDeliveryLog"("plan_year_id", "sent_at");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTier" ADD CONSTRAINT "PlanTier_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanYear" ADD CONSTRAINT "PlanYear_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthSnapshot" ADD CONSTRAINT "MonthSnapshot_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthSnapshot" ADD CONSTRAINT "MonthSnapshot_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPlanStat" ADD CONSTRAINT "MonthlyPlanStat_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "MonthSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPlanStat" ADD CONSTRAINT "MonthlyPlanStat_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HighClaimant" ADD CONSTRAINT "HighClaimant_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HighClaimant" ADD CONSTRAINT "HighClaimant_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HighClaimant" ADD CONSTRAINT "HighClaimant_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CAndESummaryRow" ADD CONSTRAINT "CAndESummaryRow_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CAndESummaryRow" ADD CONSTRAINT "CAndESummaryRow_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Input" ADD CONSTRAINT "Input_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Input" ADD CONSTRAINT "Input_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumEquivalent" ADD CONSTRAINT "PremiumEquivalent_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumEquivalent" ADD CONSTRAINT "PremiumEquivalent_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "PlanTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminFeeComponent" ADD CONSTRAINT "AdminFeeComponent_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopLossFeeByTier" ADD CONSTRAINT "StopLossFeeByTier_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopLossFeeByTier" ADD CONSTRAINT "StopLossFeeByTier_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "PlanTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAdjustment" ADD CONSTRAINT "UserAdjustment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAdjustment" ADD CONSTRAINT "UserAdjustment_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservationNote" ADD CONSTRAINT "ObservationNote_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservationNote" ADD CONSTRAINT "ObservationNote_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservationNote" ADD CONSTRAINT "ObservationNote_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadAudit" ADD CONSTRAINT "UploadAudit_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadAudit" ADD CONSTRAINT "UploadAudit_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadAudit" ADD CONSTRAINT "UploadAudit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyActuals" ADD CONSTRAINT "MonthlyActuals_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyConfig" ADD CONSTRAINT "MonthlyConfig_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeWindow" ADD CONSTRAINT "FeeWindow_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetConfig" ADD CONSTRAINT "BudgetConfig_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "PlanYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
