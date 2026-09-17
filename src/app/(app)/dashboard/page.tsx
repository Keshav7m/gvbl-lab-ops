import Link from "next/link";
import { AlertTriangle, CheckCheck, FilePlus2, FlaskConical, Hourglass, Inbox, PackageOpen, TestTubes } from "lucide-react";
import { ActivityChart, DailySamplesChart, MonthlyVolumeChart } from "@/components/dashboard/Charts";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { REPORT_STATUS_LABELS } from "@/lib/constants";
import { getDashboardStats } from "@/lib/dashboard";
import { formatDate, formatDateTime, weekdayName } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await getDashboardStats();
  const noReportToday = s.todayReportCount === 0;

  return (
    <>
      <PageHeader
        eyebrow={`${weekdayName(s.today)}, ${formatDate(s.today)}`}
        title="Laboratory Dashboard"
        description={
          noReportToday
            ? `No report has been filed for today yet.${s.latestReportDate ? ` Latest report: ${formatDate(s.latestReportDate)}.` : ""}`
            : `${s.todayReportCount} report${s.todayReportCount === 1 ? "" : "s"} filed today.`
        }
        actions={
          <LinkButton href="/reports/new" size="lg" icon={<FilePlus2 className="h-5 w-5" />}>
            New Daily Report
          </LinkButton>
        }
      />

      {/* Today's samples */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Today&apos;s samples</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard accent label="New samples received" value={s.samples.newReceived} icon={<Inbox className="h-4 w-4" />} sub="Sum of today's reports" />
        <StatCard label="Samples processed" value={s.samples.processed} icon={<FlaskConical className="h-4 w-4" />} />
        <StatCard label="Completed / dispatched" value={s.samples.completed} tone="green" icon={<CheckCheck className="h-4 w-4" />} />
        <StatCard
          label="Under processing"
          value={s.samples.underProcessing}
          tone="blue"
          icon={<TestTubes className="h-4 w-4" />}
          sub={noReportToday ? "No report today" : "From latest report today"}
        />
        <StatCard
          label="Pending samples"
          value={s.samples.pending}
          tone="amber"
          icon={<Hourglass className="h-4 w-4" />}
          sub={noReportToday ? "No report today" : "From latest report today"}
        />
      </div>

      {/* Reports */}
      <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Reports</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Total reports" value={s.reports.total} />
        <StatCard label="This month" value={s.reports.thisMonth} tone="blue" />
        <StatCard label={REPORT_STATUS_LABELS.DRAFT} value={s.reports.drafts} tone="amber" />
        <StatCard label={REPORT_STATUS_LABELS.COMPLETED} value={s.reports.completed} tone="blue" />
        <StatCard label={REPORT_STATUS_LABELS.VERIFIED} value={s.reports.verified} tone="green" />
        <div className="panel flex flex-col justify-center gap-2 p-4 text-sm">
          <Link href="/reports?range=month" className={cn("flex items-center gap-2", s.openIssues ? "font-semibold text-amber-700" : "text-ink-muted")}>
            <AlertTriangle className="h-4 w-4" /> {s.openIssues} report{s.openIssues === 1 ? "" : "s"} with issues (30 days)
          </Link>
          <span className={cn("flex items-center gap-2", s.lowStockAlerts ? "font-semibold text-red-700" : "text-ink-muted")}>
            <PackageOpen className="h-4 w-4" /> {s.lowStockAlerts} low-stock alert{s.lowStockAlerts === 1 ? "" : "s"} (30 days)
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        <DailySamplesChart data={s.dailySeries} />
        <MonthlyVolumeChart data={s.monthlySeries} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <ActivityChart data={s.activityFrequency} />

        <div className="grid gap-4">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <p className="text-sm font-semibold">Recently updated</p>
              <Link href="/reports" className="text-xs font-semibold text-violet-700 hover:underline">
                All reports →
              </Link>
            </div>
            {s.recent.length === 0 ? (
              <EmptyState title="No reports yet">Create the first daily report to see it here.</EmptyState>
            ) : (
              <ul className="divide-y divide-rule">
                {s.recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/reports/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-violet-50/50">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-violet-800">{r.reportNo}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {formatDate(r.reportDate)} · {r.preparedByName} · updated {formatDateTime(r.updatedAt)}
                        </span>
                      </span>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {s.drafts.length > 0 && (
            <div className="panel overflow-hidden border-amber-200">
              <p className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">Drafts waiting to be completed</p>
              <ul className="divide-y divide-rule">
                {s.drafts.map((d) => (
                  <li key={d.id}>
                    <Link href={`/reports/${d.id}/edit`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-amber-50/50">
                      <span>
                        <span className="font-semibold">{d.reportNo}</span>
                        <span className="text-ink-muted">
                          {" "}
                          · {formatDate(d.reportDate)} · {d.preparedByName}
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-violet-700">Continue →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
