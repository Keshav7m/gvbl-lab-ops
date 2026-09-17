import { NextResponse } from "next/server";
import { errorResponse, getClientIp, readJson } from "@/lib/api";
import { restoreReport } from "@/lib/report-service";
import { restoreSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { restoredByName } = restoreSchema.parse(await readJson(req));
    await restoreReport(id, restoredByName, getClientIp(req));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
