import { errorResponse, contentDisposition, getClientIp } from "@/lib/api";
import { logAuditSafe } from "@/lib/audit";
import { renderReportPdf } from "@/lib/pdf/report-pdf";
import { prisma } from "@/lib/prisma";
import { getReport, serializeReport } from "@/lib/report-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reports/:id/pdf            → opens the PDF in the browser (Generate PDF / Print)
 * GET /api/reports/:id/pdf?download=1 → forces a file download (Download PDF)
 * The PDF is always rendered from the current database record.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sp = new URL(req.url).searchParams;
    const download = sp.get("download") === "1";
    const purpose = sp.get("purpose") === "print" ? "print" : download ? "download" : "view";

    const report = serializeReport(await getReport(id, { allowDeleted: true }));
    const pdf = await renderReportPdf(report);

    await logAuditSafe(prisma, {
      action: "PDF_GENERATED",
      actorName: null,
      entityType: "Report",
      entityId: report.id,
      reportNo: report.reportNo,
      ip: getClientIp(req),
      details: { purpose, status: report.status, bytes: pdf.length },
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": contentDisposition(
          download ? "attachment" : "inline",
          `${report.reportNo}_${report.reportDate}.pdf`,
        ),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
