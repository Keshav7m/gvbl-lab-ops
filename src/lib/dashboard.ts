import "server-only";
import { LAB_ACTIVITIES, type ReportStatusKey } from "./constants";
import { addDays, addMonths, dateOnlyToDb, dbDateToString, monthKey, monthLabel, shortDayLabel, startOfMonth, todayInTz } from "./dates";
import { prisma } from "./prisma";

export interface DashboardStats {
  today: string;
  todayReportCount: number;
  latestReportDate: string | null;
  samples: {
    newReceived: number;
    processed: number;
    completed: number;
    underProcessing: number | null;
    pending: number | null;
  };
  reports: { total: number; drafts: number; completed: number; verified: number; thisMonth: number };
  dailySeries: { date: string; label: string; received: number; processed: number; completed: number }[];
  monthlySeries: { month: string; label: string; reports: number; received: number; processed: number }[];
  activityFrequency: { key: string; label: string; count: number }[];
  statusBreakdown: { status: ReportStatusKey; count: number }[];
  recent: { id: string; reportNo: string; reportDate: string; preparedByName: string; status: ReportStatusKey; updatedAt: string }[];
  drafts: { id: string; reportNo: string; reportDate: string; preparedByName: string; updatedAt: string }[];
  openIssues: number;
  lowStockAlerts: number;
}

const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);

/**
 * Dashboard figures. Daily counts (received / processed / completed) are summed across
 * all reports for the day. Running totals (pending / under processing) are snapshots,
 * so they are taken from the most recently updated report for the day instead of summed.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const today = todayInTz();
  const base = { deletedAt: null };
  const chartFrom = addMonths(startOfMonth(today), -11);
  const dailyFrom = addDays(today, -13);
  const last30 = addDays(today, -29);

  const [rows, statusGroups, recent, drafts, latest] = await Promise.all([
    prisma.report.findMany({
      where: { AND: [base, { reportDate: { gte: dateOnlyToDb(chartFrom) } }] },
      select: {
        reportDate: true,
        status: true,
        newSamplesReceived: true,
        samplesProcessedToday: true,
        completedDispatched: true,
        totalUnderProcessing: true,
        pendingSamples: true,
        activities: true,
        issuesStatus: true,
        lowStockAlert: true,
        updatedAt: true,
      },
    }),
    prisma.report.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    prisma.report.findMany({
      where: base,
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, reportNo: true, reportDate: true, preparedByName: true, status: true, updatedAt: true },
    }),
    prisma.report.findMany({
      where: { AND: [base, { status: "DRAFT" }] },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, reportNo: true, reportDate: true, preparedByName: true, updatedAt: true },
    }),
    prisma.report.findFirst({ where: base, orderBy: { reportDate: "desc" }, select: { reportDate: true } }),
  ]);

  const byDate = rows.map((r) => ({ ...r, date: dbDateToString(r.reportDate) }));
  const todays = byDate.filter((r) => r.date === today);
  const latestToday = [...todays].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

  const dailySeries = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(dailyFrom, i);
    const day = byDate.filter((r) => r.date === date);
    return {
      date,
      label: shortDayLabel(date),
      received: sum(day.map((r) => r.newSamplesReceived)),
      processed: sum(day.map((r) => r.samplesProcessedToday)),
      completed: sum(day.map((r) => r.completedDispatched)),
    };
  });

  const monthlySeries = Array.from({ length: 12 }, (_, i) => {
    const month = monthKey(addMonths(chartFrom, i));
    const inMonth = byDate.filter((r) => monthKey(r.date) === month);
    return {
      month,
      label: monthLabel(month),
      reports: inMonth.length,
      received: sum(inMonth.map((r) => r.newSamplesReceived)),
      processed: sum(inMonth.map((r) => r.samplesProcessedToday)),
    };
  });

  const recent30 = byDate.filter((r) => r.date >= last30);
  const activityFrequency = LAB_ACTIVITIES.map((a) => ({
    key: a.key,
    label: a.label,
    count: recent30.filter((r) => r.activities.includes(a.key)).length,
  }));

  const counts: Record<ReportStatusKey, number> = { DRAFT: 0, COMPLETED: 0, VERIFIED: 0 };
  statusGroups.forEach((g) => (counts[g.status] = g._count._all));
  const thisMonthKey = monthKey(today);

  return {
    today,
    todayReportCount: todays.length,
    latestReportDate: latest ? dbDateToString(latest.reportDate) : null,
    samples: {
      newReceived: sum(todays.map((r) => r.newSamplesReceived)),
      processed: sum(todays.map((r) => r.samplesProcessedToday)),
      completed: sum(todays.map((r) => r.completedDispatched)),
      underProcessing: latestToday?.totalUnderProcessing ?? null,
      pending: latestToday?.pendingSamples ?? null,
    },
    reports: {
      total: counts.DRAFT + counts.COMPLETED + counts.VERIFIED,
      drafts: counts.DRAFT,
      completed: counts.COMPLETED,
      verified: counts.VERIFIED,
      thisMonth: byDate.filter((r) => monthKey(r.date) === thisMonthKey).length,
    },
    dailySeries,
    monthlySeries,
    activityFrequency,
    statusBreakdown: (Object.keys(counts) as ReportStatusKey[]).map((status) => ({ status, count: counts[status] })),
    recent: recent.map((r) => ({
      id: r.id,
      reportNo: r.reportNo,
      reportDate: dbDateToString(r.reportDate),
      preparedByName: r.preparedByName,
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
    })),
    drafts: drafts.map((r) => ({
      id: r.id,
      reportNo: r.reportNo,
      reportDate: dbDateToString(r.reportDate),
      preparedByName: r.preparedByName,
      updatedAt: r.updatedAt.toISOString(),
    })),
    openIssues: recent30.filter((r) => r.issuesStatus === "YES").length,
    lowStockAlerts: recent30.filter((r) => r.lowStockAlert).length,
  };
}
