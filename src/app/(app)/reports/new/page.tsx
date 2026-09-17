import { ReportForm } from "@/components/report-form/ReportForm";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate, todayInTz, weekdayName } from "@/lib/dates";
import { emptyFormState } from "@/lib/report-mapper";

export const metadata = { title: "New Daily Report" };

export const dynamic = "force-dynamic";

export default function NewReportPage() {
  const today = todayInTz();
  return (
    <>
      <PageHeader
        eyebrow="Daily Laboratory Operations Report"
        title="New Daily Report"
        description={`${weekdayName(today)}, ${formatDate(today)} · Fields are optional unless marked *. Use Save as Draft to finish later.`}
        actions={
          <LinkButton href="/reports" variant="ghost">
            Cancel
          </LinkButton>
        }
      />
      <ReportForm initial={emptyFormState({ today, preparedByName: "" })} />
    </>
  );
}
