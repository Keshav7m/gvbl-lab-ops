import { ArrowLeft, Pencil } from "lucide-react";
import { PdfButtons } from "@/components/reports/PdfButtons";
import { ReportActions } from "@/components/reports/ReportActions";
import { ReportView } from "@/components/reports/ReportView";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/dates";
import { loadReportOr404 } from "@/lib/page-helpers";
import { serializeReport } from "@/lib/report-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const r = await loadReportOr404(id, { allowDeleted: true });
    return { title: r.reportNo };
  } catch {
    return { title: "Report" };
  }
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = serializeReport(await loadReportOr404(id, { allowDeleted: true }));
  const deleted = Boolean(report.deletedAt);

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            {report.day}, {formatDate(report.reportDate)} <StatusBadge status={report.status} />
            {report.isDemo && <Badge tone="amber">Demo data</Badge>}
            {deleted && <Badge tone="red">Deleted</Badge>}
          </span>
        }
        title={report.reportNo}
        description={`Prepared by ${report.preparedByName} · ${report.department}`}
        actions={
          <>
            <LinkButton href="/reports" variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
              History
            </LinkButton>
            {!deleted && (
              <LinkButton href={`/reports/${report.id}/edit`} variant="secondary" icon={<Pencil className="h-4 w-4" />}>
                Edit
              </LinkButton>
            )}
            <PdfButtons id={report.id} reportNo={report.reportNo} />
            <ReportActions id={report.id} reportNo={report.reportNo} status={report.status} deleted={deleted} />
          </>
        }
      />
      <ReportView report={report} />
    </>
  );
}
