import { NextResponse } from "next/server";
import { errorResponse, getClientIp, readJson } from "@/lib/api";
import { serializeReport, verifyReport } from "@/lib/report-service";
import { verifySchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = verifySchema.parse(await readJson(req));
    const report = await verifyReport(id, { verifiedByName: input.verifiedByName, signature: input.signature }, getClientIp(req));
    return NextResponse.json({ report: serializeReport(report) });
  } catch (e) {
    return errorResponse(e);
  }
}
