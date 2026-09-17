-- GVBL NGS Laboratory — Daily Operations Management System
-- Initial schema

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'COMPLETED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UPDATED', 'NONE');

-- CreateEnum
CREATE TYPE "IssuesStatus" AS ENUM ('NONE', 'YES');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'VERIFY', 'EXPORT', 'PDF_GENERATED');

-- CreateTable
CREATE TABLE "report_counters" (
    "year" INTEGER NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "report_counters_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "report_no" TEXT NOT NULL,
    "report_year" INTEGER NOT NULL,
    "report_seq" INTEGER NOT NULL,
    "client_request_id" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "report_date" DATE NOT NULL,
    "day" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'NGS Laboratory',
    "prepared_by_name" TEXT NOT NULL,
    "notes" TEXT,
    "pending_samples" INTEGER,
    "new_samples_received" INTEGER,
    "samples_processed_today" INTEGER,
    "completed_dispatched" INTEGER,
    "total_under_processing" INTEGER,
    "sample_quality" TEXT,
    "sop_criteria_met" BOOLEAN,
    "samples_good_condition" BOOLEAN,
    "condition_details" TEXT,
    "pickup_by_gvbl_staff" BOOLEAN,
    "pickup_by" TEXT,
    "activities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "other_activity" TEXT,
    "invoice_status" "InvoiceStatus",
    "invoice_remarks" TEXT,
    "stock_updated" BOOLEAN NOT NULL DEFAULT false,
    "reagents_received" BOOLEAN NOT NULL DEFAULT false,
    "low_stock_alert" BOOLEAN NOT NULL DEFAULT false,
    "inventory_remarks" TEXT,
    "sequencing_platform" TEXT,
    "run_id" TEXT,
    "flow_cell_id" TEXT,
    "samples_sent_for_sequencing" TEXT,
    "work_summary" TEXT,
    "issues_status" "IssuesStatus",
    "issue_details" TEXT,
    "pending_work" TEXT,
    "additional_comments" TEXT,
    "prepared_signature" TEXT,
    "prepared_at" TIMESTAMP(3),
    "verified_by_name" TEXT,
    "verified_signature" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_by_name" TEXT NOT NULL,
    "updated_by_name" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_name" TEXT,
    "delete_reason" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "samples" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sample_id" TEXT NOT NULL,
    "project_institute" TEXT,
    "sample_type" TEXT,
    "sample_type_other" TEXT,
    "current_status" TEXT,
    "received_from" TEXT,
    "sent_to" TEXT,
    "coordinated_by" TEXT,
    "remarks" TEXT,

    CONSTRAINT "samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kits_reagents_used" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lot_no" TEXT,
    "quantity_used" TEXT,

    CONSTRAINT "kits_reagents_used_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumables_received" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "batch_lot_catalogue_no" TEXT,
    "invoice_details" TEXT,
    "supplier" TEXT,

    CONSTRAINT "consumables_received_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "report_no" TEXT,
    "actor_name" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reports_report_no_key" ON "reports"("report_no");

-- CreateIndex
CREATE UNIQUE INDEX "reports_client_request_id_key" ON "reports"("client_request_id");

-- CreateIndex
CREATE INDEX "reports_report_date_idx" ON "reports"("report_date");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_prepared_by_name_idx" ON "reports"("prepared_by_name");

-- CreateIndex
CREATE INDEX "reports_deleted_at_idx" ON "reports"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "reports_report_year_report_seq_key" ON "reports"("report_year", "report_seq");

-- CreateIndex
CREATE INDEX "samples_report_id_idx" ON "samples"("report_id");

-- CreateIndex
CREATE INDEX "samples_sample_id_idx" ON "samples"("sample_id");

-- CreateIndex
CREATE INDEX "samples_project_institute_idx" ON "samples"("project_institute");

-- CreateIndex
CREATE INDEX "kits_reagents_used_report_id_idx" ON "kits_reagents_used"("report_id");

-- CreateIndex
CREATE INDEX "consumables_received_report_id_idx" ON "consumables_received"("report_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits_reagents_used" ADD CONSTRAINT "kits_reagents_used_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumables_received" ADD CONSTRAINT "consumables_received_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
