import { NextResponse } from "next/server";
import { errorResponse, getClientIp, readJson } from "@/lib/api";
import { getReport, serializeReport, softDeleteReport, updateReport } from "@/lib/report-service";
import { deleteSchema, reportSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json({ report: serializeReport(await getReport(id, { allowDeleted: true })) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const payload = reportSchema.parse(await readJson(req));
    const report = await updateReport(id, payload, getClientIp(req));
    return NextResponse.json({ report: serializeReport(report) });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Soft delete: the row stays in the database and can be restored from the report page. */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { reason, deletedByName } = deleteSchema.parse(await readJson(req));
    await softDeleteReport(id, reason, deletedByName, getClientIp(req));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
