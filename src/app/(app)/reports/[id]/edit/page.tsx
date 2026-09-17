import { ReportForm } from "@/components/report-form/ReportForm";
import { StatusBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate, formatDateTime } from "@/lib/dates";
import { redirect } from "next/navigation";
import { loadReportOr404 } from "@/lib/page-helpers";
import { reportToFormState } from "@/lib/report-mapper";
import { serializeReport } from "@/lib/report-service";

export const metadata = { title: "Edit Report" };

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await loadReportOr404(id, { allowDeleted: true });
  const report = serializeReport(raw);

  // Deleted reports must be restored before they can be edited
  if (raw.deletedAt) redirect(`/reports/${raw.id}`);

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            Editing · {formatDate(report.reportDate)} <StatusBadge status={report.status} />
          </span>
        }
        title={report.reportNo}
        description={`Last updated ${formatDateTime(report.updatedAt)} by ${report.updatedByName}`}
        actions={
          <LinkButton href={`/reports/${report.id}`} variant="ghost">
            Back to report
          </LinkButton>
        }
      />
      <ReportForm
        initial={reportToFormState(report)}
        existing={{
          id: report.id,
          reportNo: report.reportNo,
          status: report.status,
          updatedAt: report.updatedAt,
          verification:
            report.status === "VERIFIED"
              ? { verifiedByName: report.verifiedByName, verifiedAt: report.verifiedAt, verifiedSignature: report.verifiedSignature }
              : null,
        }}
      />
    </>
  );
}
