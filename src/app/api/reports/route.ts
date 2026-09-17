import { NextResponse } from "next/server";
import { errorResponse, getClientIp, readJson } from "@/lib/api";
import { parseFilters } from "@/lib/report-filters";
import { createReport, listReports, serializeReport } from "@/lib/report-service";
import { reportSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/reports — Report History list with filters and pagination. */
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(sp.get("pageSize")) || 20));
    return NextResponse.json(await listReports(parseFilters(sp), page, pageSize));
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST /api/reports — create a report (Save Report or Save as Draft). */
export async function POST(req: Request) {
  try {
    const payload = reportSchema.parse(await readJson(req));
    const { report, duplicate } = await createReport(payload, getClientIp(req));
    return NextResponse.json({ report: serializeReport(report), duplicate }, { status: duplicate ? 200 : 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
