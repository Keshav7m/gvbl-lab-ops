import "server-only";
import { Prisma, type ReportStatus } from "@prisma/client";
import type { ReportListItem, SerializedReport } from "@/types/report";
import { ApiError } from "./api-error";
import { diffReports, logAudit } from "./audit";
import { REPORT_STATUSES } from "./constants";
import { dateOnlyToDb, dbDateToString, formatDateTime, resolveDateRange, weekdayName } from "./dates";
import { prisma } from "./prisma";
import { allocateReportNumber } from "./report-number";
import type { ReportFilters } from "./report-filters";
import type { ReportPayload } from "./validation";

export const reportInclude = {
  samples: { orderBy: { position: "asc" } },
  kits: { orderBy: { position: "asc" } },
  consumables: { orderBy: { position: "asc" } },
} satisfies Prisma.ReportInclude;

export type FullReport = Prisma.ReportGetPayload<{ include: typeof reportInclude }>;

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

const toBool = (v: "YES" | "NO" | null) => (v === null ? null : v === "YES");

function scalarData(p: ReportPayload) {
  return {
    reportDate: dateOnlyToDb(p.reportDate),
    day: weekdayName(p.reportDate),
    department: p.department,
    preparedByName: p.preparedByName,
    notes: p.notes,
    pendingSamples: p.pendingSamples,
    newSamplesReceived: p.newSamplesReceived,
    samplesProcessedToday: p.samplesProcessedToday,
    completedDispatched: p.completedDispatched,
    totalUnderProcessing: p.totalUnderProcessing,
    sampleQuality: p.sampleQuality,
    sopCriteriaMet: toBool(p.sopCriteriaMet),
    samplesGoodCondition: toBool(p.samplesGoodCondition),
    // Hidden follow-up fields are cleared so the stored record matches what the user saw.
    conditionDetails: p.samplesGoodCondition === "YES" ? null : p.conditionDetails,
    pickupByGvblStaff: toBool(p.pickupByGvblStaff),
    pickupBy: p.pickupByGvblStaff === "NO" ? null : p.pickupBy,
    activities: p.activities,
    otherActivity: p.activities.includes("OTHER") ? p.otherActivity : null,
    invoiceStatus: p.invoiceStatus,
    invoiceRemarks: p.invoiceRemarks,
    stockUpdated: p.stockUpdated,
    reagentsReceived: p.reagentsReceived,
    lowStockAlert: p.lowStockAlert,
    inventoryRemarks: p.inventoryRemarks,
    sequencingPlatform: p.sequencingPlatform,
    runId: p.runId,
    flowCellId: p.flowCellId,
    samplesSentForSequencing: p.samplesSentForSequencing,
    workSummary: p.workSummary,
    issuesStatus: p.issuesStatus,
    issueDetails: p.issuesStatus === "NONE" ? null : p.issueDetails,
    pendingWork: p.pendingWork,
    additionalComments: p.additionalComments,
    preparedSignature: p.preparedSignature,
  };
}

async function writeChildren(tx: Prisma.TransactionClient, reportId: string, p: ReportPayload) {
  if (p.samples.length) {
    await tx.sample.createMany({
      data: p.samples.map((s, position) => ({
        reportId,
        position,
        sampleId: s.sampleId,
        projectInstitute: s.projectInstitute,
        sampleType: s.sampleType,
        sampleTypeOther: s.sampleType === "Other" ? s.sampleTypeOther : null,
        currentStatus: s.currentStatus,
        receivedFrom: s.receivedFrom,
        sentTo: s.sentTo,
        coordinatedBy: s.coordinatedBy,
        remarks: s.remarks,
      })),
    });
  }
  if (p.kits.length) {
    await tx.kitReagentUsed.createMany({
      data: p.kits.map((k, position) => ({ reportId, position, ...k })),
    });
  }
  if (p.consumables.length) {
    await tx.consumableReceived.createMany({
      data: p.consumables.map((c, position) => ({ reportId, position, ...c })),
    });
  }
}

function isUniqueViolation(e: unknown, fieldHint?: string): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  if (!fieldHint) return true;
  return JSON.stringify(e.meta ?? {}).includes(fieldHint);
}

export async function createReport(p: ReportPayload, ip: string | null) {
  // Idempotency: a double-click or network retry returns the report that was already created.
  if (p.clientRequestId) {
    const existing = await prisma.report.findUnique({ where: { clientRequestId: p.clientRequestId }, include: reportInclude });
    if (existing) return { report: existing, duplicate: true };
  }

  const status: ReportStatus = p.intent === "COMPLETED" ? "COMPLETED" : "DRAFT";
  const year = Number(p.reportDate.slice(0, 4));
  const preparedAt = p.preparedAt ? new Date(p.preparedAt) : status === "COMPLETED" ? new Date() : null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const report = await prisma.$transaction(async (tx) => {
        const { reportNo, seq } = await allocateReportNumber(tx, year);
        const created = await tx.report.create({
          data: {
            ...scalarData(p),
            reportNo,
            reportYear: year,
            reportSeq: seq,
            status,
            clientRequestId: p.clientRequestId ?? null,
            preparedAt,
            createdByName: p.preparedByName,
            updatedByName: p.preparedByName,
          },
        });
        await writeChildren(tx, created.id, p);
        await logAudit(tx, {
          action: "CREATE",
          actorName: p.preparedByName,
          entityType: "Report",
          entityId: created.id,
          reportNo,
          ip,
          details: {
            status,
            reportDate: p.reportDate,
            samples: p.samples.length,
            kits: p.kits.length,
            consumables: p.consumables.length,
          },
        });
        return tx.report.findUniqueOrThrow({ where: { id: created.id }, include: reportInclude });
      }, TX_OPTIONS);
      return { report, duplicate: false };
    } catch (e) {
      if (p.clientRequestId && isUniqueViolation(e, "client_request_id")) {
        const existing = await prisma.report.findUnique({ where: { clientRequestId: p.clientRequestId }, include: reportInclude });
        if (existing) return { report: existing, duplicate: true };
      }
      // Counter race on first report of a year, or a manually edited counter: retry.
      if (isUniqueViolation(e) && attempt < 5) continue;
      throw e;
    }
  }
  throw new ApiError(500, "Could not allocate a report number. Try saving again.");
}

export async function updateReport(id: string, p: ReportPayload, ip: string | null) {
  const before = await prisma.report.findUnique({ where: { id }, include: reportInclude });
  if (!before) throw new ApiError(404, "Report not found.");
  if (before.deletedAt) throw new ApiError(400, "This report has been deleted. Restore it before editing.");
  if (p.expectedUpdatedAt && new Date(p.expectedUpdatedAt).getTime() !== before.updatedAt.getTime()) {
    throw new ApiError(
      409,
      `${before.updatedByName} changed this report at ${formatDateTime(before.updatedAt)}. Reload the page to get the latest version, then re-apply your changes.`,
    );
  }

  const wasVerified = before.status === "VERIFIED";
  const status: ReportStatus = p.intent === "COMPLETED" ? "COMPLETED" : "DRAFT";
  const preparedAt = p.preparedAt
    ? new Date(p.preparedAt)
    : status === "COMPLETED"
      ? (before.preparedAt ?? new Date())
      : null;

  const report = await prisma.$transaction(async (tx) => {
    // Optimistic lock: only update if nobody else saved in the meantime.
    const result = await tx.report.updateMany({
      where: { id, updatedAt: before.updatedAt },
      data: {
        ...scalarData(p),
        status,
        preparedAt,
        updatedByName: p.preparedByName,
        updatedAt: new Date(),
        ...(wasVerified ? { verifiedAt: null, verifiedByName: null, verifiedSignature: null } : {}),
      },
    });
    if (result.count === 0) {
      throw new ApiError(409, "Someone else saved this report a moment ago. Reload the page and try again.");
    }
    await tx.sample.deleteMany({ where: { reportId: id } });
    await tx.kitReagentUsed.deleteMany({ where: { reportId: id } });
    await tx.consumableReceived.deleteMany({ where: { reportId: id } });
    await writeChildren(tx, id, p);

    const after = await tx.report.findUniqueOrThrow({ where: { id }, include: reportInclude });
    await logAudit(tx, {
      action: "UPDATE",
      actorName: p.preparedByName,
      entityType: "Report",
      entityId: id,
      reportNo: before.reportNo,
      ip,
      details: {
        statusFrom: before.status,
        statusTo: status,
        verificationCleared: wasVerified,
        changes: diffReports(before, after) as Prisma.InputJsonValue,
      },
    });
    return after;
  }, TX_OPTIONS);

  return report;
}

export async function getReport(id: string, opts: { allowDeleted?: boolean } = {}) {
  const report = await prisma.report.findUnique({ where: { id }, include: reportInclude });
  if (!report || (report.deletedAt && !opts.allowDeleted)) throw new ApiError(404, "Report not found.");
  return report;
}

export async function verifyReport(
  id: string,
  input: { verifiedByName: string; signature: string | null },
  ip: string | null,
) {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report || report.deletedAt) throw new ApiError(404, "Report not found.");
  if (report.status !== "COMPLETED") {
    throw new ApiError(400, report.status === "DRAFT" ? "Drafts must be completed before verification." : "This report is already verified.");
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.report.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verifiedByName: input.verifiedByName,
        verifiedSignature: input.signature,
        verifiedAt: new Date(),
      },
      include: reportInclude,
    });
    await logAudit(tx, {
      action: "VERIFY",
      actorName: input.verifiedByName,
      entityType: "Report",
      entityId: id,
      reportNo: report.reportNo,
      ip,
      details: { verifiedByName: input.verifiedByName, signed: Boolean(input.signature) },
    });
    return updated;
  });
}

export async function softDeleteReport(id: string, reason: string, deletedByName: string, ip: string | null) {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report || report.deletedAt) throw new ApiError(404, "Report not found.");
  await prisma.$transaction(async (tx) => {
    await tx.report.update({ where: { id }, data: { deletedAt: new Date(), deletedByName, deleteReason: reason } });
    await logAudit(tx, {
      action: "DELETE",
      actorName: deletedByName,
      entityType: "Report",
      entityId: id,
      reportNo: report.reportNo,
      ip,
      details: { reason, statusAtDeletion: report.status, softDelete: true },
    });
  });
}

export async function restoreReport(id: string, restoredByName: string, ip: string | null) {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report || !report.deletedAt) throw new ApiError(404, "Deleted report not found.");
  await prisma.$transaction(async (tx) => {
    await tx.report.update({ where: { id }, data: { deletedAt: null, deletedByName: null, deleteReason: null } });
    await logAudit(tx, {
      action: "RESTORE",
      actorName: restoredByName,
      entityType: "Report",
      entityId: id,
      reportNo: report.reportNo,
      ip,
      details: { previousDeleteReason: report.deleteReason, deletedBy: report.deletedByName },
    });
  });
}

/** Builds the WHERE clause shared by Report History, search and Excel export. */
export function buildReportWhere(f: ReportFilters): Prisma.ReportWhereInput {
  const and: Prisma.ReportWhereInput[] = [];
  if (!f.includeDeleted) and.push({ deletedAt: null });

  const range = resolveDateRange(f.range, f);
  if (range.error) throw new ApiError(400, range.error);
  if (range.from) and.push({ reportDate: { gte: dateOnlyToDb(range.from) } });
  if (range.to) and.push({ reportDate: { lte: dateOnlyToDb(range.to) } });

  const ci = (v: string) => ({ contains: v, mode: Prisma.QueryMode.insensitive });

  if (f.reportNo) and.push({ reportNo: ci(f.reportNo) });
  if (f.preparedBy) and.push({ preparedByName: ci(f.preparedBy) });
  if (f.status && (REPORT_STATUSES as readonly string[]).includes(f.status)) and.push({ status: f.status as ReportStatus });

  // Sample filters apply to the same sample row (e.g. Sample Type = RNA AND Status = QC).
  const sample: Prisma.SampleWhereInput = {};
  if (f.sampleId) sample.sampleId = ci(f.sampleId);
  if (f.project) sample.projectInstitute = ci(f.project);
  if (f.sampleType) sample.sampleType = f.sampleType;
  if (f.sampleStatus) sample.currentStatus = f.sampleStatus;
  if (Object.keys(sample).length) and.push({ samples: { some: sample } });

  if (f.q) {
    const q = f.q;
    const or: Prisma.ReportWhereInput[] = [
      { reportNo: ci(q) },
      { preparedByName: ci(q) },
      { day: ci(q) },
      { notes: ci(q) },
      { workSummary: ci(q) },
      { runId: ci(q) },
      { samples: { some: { OR: [{ sampleId: ci(q) }, { projectInstitute: ci(q) }] } } },
    ];
    const dm = q.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (dm) {
      const iso = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
      if (!isNaN(Date.parse(iso))) or.push({ reportDate: dateOnlyToDb(iso) });
    }
    and.push({ OR: or });
  }
  return { AND: and };
}

export async function listReports(f: ReportFilters, page: number, pageSize: number) {
  const where = buildReportWhere(f);
  const [total, rows] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: [{ reportDate: "desc" }, { reportSeq: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        reportNo: true,
        reportDate: true,
        day: true,
        preparedByName: true,
        newSamplesReceived: true,
        samplesProcessedToday: true,
        activities: true,
        otherActivity: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        isDemo: true,
        _count: { select: { samples: true } },
      },
    }),
  ]);
  const items: ReportListItem[] = rows.map((r) => ({
    id: r.id,
    reportNo: r.reportNo,
    reportDate: dbDateToString(r.reportDate),
    day: r.day,
    preparedByName: r.preparedByName,
    newSamplesReceived: r.newSamplesReceived,
    samplesProcessedToday: r.samplesProcessedToday,
    activities: r.activities,
    otherActivity: r.otherActivity,
    status: r.status,
    sampleCount: r._count.samples,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    deletedAt: r.deletedAt?.toISOString() ?? null,
    isDemo: r.isDemo,
  }));
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function findReportsForExport(f: ReportFilters, ids?: string[]) {
  const where = buildReportWhere(f);
  const finalWhere: Prisma.ReportWhereInput = ids?.length ? { AND: [where, { id: { in: ids } }] } : where;
  return prisma.report.findMany({
    where: finalWhere,
    orderBy: [{ reportDate: "asc" }, { reportSeq: "asc" }],
    include: reportInclude,
    take: 50_000,
  });
}

export function serializeReport(r: FullReport): SerializedReport {
  return {
    id: r.id,
    reportNo: r.reportNo,
    status: r.status,
    reportDate: dbDateToString(r.reportDate),
    day: r.day,
    department: r.department,
    preparedByName: r.preparedByName,
    notes: r.notes,
    pendingSamples: r.pendingSamples,
    newSamplesReceived: r.newSamplesReceived,
    samplesProcessedToday: r.samplesProcessedToday,
    completedDispatched: r.completedDispatched,
    totalUnderProcessing: r.totalUnderProcessing,
    sampleQuality: r.sampleQuality,
    sopCriteriaMet: r.sopCriteriaMet,
    samplesGoodCondition: r.samplesGoodCondition,
    conditionDetails: r.conditionDetails,
    pickupByGvblStaff: r.pickupByGvblStaff,
    pickupBy: r.pickupBy,
    activities: r.activities,
    otherActivity: r.otherActivity,
    invoiceStatus: r.invoiceStatus,
    invoiceRemarks: r.invoiceRemarks,
    stockUpdated: r.stockUpdated,
    reagentsReceived: r.reagentsReceived,
    lowStockAlert: r.lowStockAlert,
    inventoryRemarks: r.inventoryRemarks,
    sequencingPlatform: r.sequencingPlatform,
    runId: r.runId,
    flowCellId: r.flowCellId,
    samplesSentForSequencing: r.samplesSentForSequencing,
    workSummary: r.workSummary,
    issuesStatus: r.issuesStatus,
    issueDetails: r.issueDetails,
    pendingWork: r.pendingWork,
    additionalComments: r.additionalComments,
    preparedSignature: r.preparedSignature,
    preparedAt: r.preparedAt?.toISOString() ?? null,
    verifiedByName: r.verifiedByName,
    verifiedSignature: r.verifiedSignature,
    verifiedAt: r.verifiedAt?.toISOString() ?? null,
    createdByName: r.createdByName,
    updatedByName: r.updatedByName,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    deletedAt: r.deletedAt?.toISOString() ?? null,
    deleteReason: r.deleteReason,
    deletedByName: r.deletedByName,
    isDemo: r.isDemo,
    samples: r.samples.map((s) => ({
      sampleId: s.sampleId,
      projectInstitute: s.projectInstitute ?? "",
      sampleType: s.sampleType ?? "",
      sampleTypeOther: s.sampleTypeOther ?? "",
      currentStatus: s.currentStatus ?? "",
      receivedFrom: s.receivedFrom ?? "",
      sentTo: s.sentTo ?? "",
      coordinatedBy: s.coordinatedBy ?? "",
      remarks: s.remarks ?? "",
    })),
    kits: r.kits.map((k) => ({ name: k.name, lotNo: k.lotNo ?? "", quantityUsed: k.quantityUsed ?? "" })),
    consumables: r.consumables.map((c) => ({
      itemName: c.itemName,
      batchLotCatalogueNo: c.batchLotCatalogueNo ?? "",
      invoiceDetails: c.invoiceDetails ?? "",
      supplier: c.supplier ?? "",
    })),
  };
}
