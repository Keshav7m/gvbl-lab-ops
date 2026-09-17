import { FilePlus2 } from "lucide-react";
import { ReportHistory } from "@/components/reports/ReportHistory";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError } from "@/lib/api-error";
import { resolveDateRange } from "@/lib/dates";
import { parseFilters } from "@/lib/report-filters";
import { listReports } from "@/lib/report-service";
import type { ReportListItem } from "@/types/report";

export const metadata = { title: "Report History" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function ReportHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const sp = new URLSearchParams();
  Object.entries(raw).forEach(([k, v]) => {
    if (typeof v === "string") sp.set(k, v);
  });
  const filters = parseFilters(sp);
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const range = resolveDateRange(filters.range, filters);

  let result: { items: ReportListItem[]; total: number; pageCount: number } = { items: [], total: 0, pageCount: 1 };
  let loadError: string | null = null;
  try {
    result = await listReports(filters, page, PAGE_SIZE);
  } catch (e) {
    if (e instanceof ApiError) loadError = e.message;
    else throw e;
  }

  return (
    <>
      <PageHeader
        eyebrow="All saved reports"
        title="Report History"
        description="Search, filter, open, edit and export every daily report stored in the system."
        actions={
          <LinkButton href="/reports/new" icon={<FilePlus2 className="h-4 w-4" />}>
            New Daily Report
          </LinkButton>
        }
      />
      <ReportHistory
        filters={filters}
        items={result.items}
        total={result.total}
        page={page}
        pageSize={PAGE_SIZE}
        pageCount={result.pageCount}
        rangeLabel={range.error ? "invalid date range" : range.label}
        loadError={loadError}
      />
    </>
  );
}
