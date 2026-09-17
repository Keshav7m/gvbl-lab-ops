import { z } from "zod";
import { contentDisposition, errorResponse, getClientIp, readJson } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { logAuditSafe } from "@/lib/audit";
import { formatDate, resolveDateRange, todayInTz } from "@/lib/dates";
import { buildReportsWorkbook } from "@/lib/excel/export-reports";
import { prisma } from "@/lib/prisma";
import { parseFilters, type ReportFilters } from "@/lib/report-filters";
import { findReportsForExport, serializeReport } from "@/lib/report-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /** Same query string used by Report History, e.g. "range=custom&from=2026-09-01&to=2026-09-16" */
  query: z.string().max(4000).default(""),
  ids: z.array(z.string().max(40)).max(5000).optional(),
});

function describeFilters(f: ReportFilters): string {
  const parts: string[] = [];
  if (f.q) parts.push(`Search "${f.q}"`);
  if (f.reportNo) parts.push(`Report No. contains "${f.reportNo}"`);
  if (f.preparedBy) parts.push(`Prepared By contains "${f.preparedBy}"`);
  if (f.sampleId) parts.push(`Sample ID contains "${f.sampleId}"`);
  if (f.project) parts.push(`Project/Institute contains "${f.project}"`);
  if (f.sampleType) parts.push(`Sample Type = ${f.sampleType}`);
  if (f.sampleStatus) parts.push(`Sample Status = ${f.sampleStatus}`);
  if (f.status) parts.push(`Report Status = ${f.status}`);
  if (f.includeDeleted) parts.push("Including deleted reports");
  return parts.length ? parts.join("; ") : "None";
}

/** POST /api/reports/export — Excel workbook for the current filters or a selection of reports. */
export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await readJson(req));
    const filters = parseFilters(new URLSearchParams(body.query));
    const range = resolveDateRange(filters.range, filters);
    if (range.error) throw new ApiError(400, range.error);

    const rows = await findReportsForExport(filters, body.ids);
    if (rows.length === 0) throw new ApiError(404, "No reports match the selected dates and filters — nothing to export.");

    const reports = rows.map(serializeReport);
    const buffer = await buildReportsWorkbook(reports, {
      exportedBy: "GVBL Lab Operations System",
      rangeLabel: body.ids?.length ? `${body.ids.length} selected report(s)` : range.label,
      filterSummary: describeFilters(filters),
    });

    const rangePart =
      range.from && range.to
        ? range.from === range.to
          ? range.from
          : `${range.from}_to_${range.to}`
        : body.ids?.length
          ? "selected"
          : "all-dates";
    const filename = `GVBL-NGS-Daily-Reports_${rangePart}_exported-${todayInTz()}.xlsx`;

    await logAuditSafe(prisma, {
      action: "EXPORT",
      actorName: null,
      entityType: "Export",
      ip: getClientIp(req),
      details: {
        format: "xlsx",
        range: range.label,
        filters: describeFilters(filters),
        selectedIds: body.ids?.length ?? 0,
        reports: reports.length,
        samples: reports.reduce((n, r) => n + r.samples.length, 0),
        exportedOn: formatDate(todayInTz()),
      },
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDisposition("attachment", filename),
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
