"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Download, Eye, FileSpreadsheet, FileText, Pencil, RotateCcw, Search, SlidersHorizontal, Inbox } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { REPORT_STATUS_LABELS, REPORT_STATUSES, SAMPLE_STATUSES, SAMPLE_TYPES, activityLabel } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/dates";
import { countActiveFilters, filtersToSearchParams, type ReportFilters } from "@/lib/report-filters";
import { cn, displayValue } from "@/lib/utils";
import type { ReportListItem } from "@/types/report";
import { DateRangeFields, dateRangeError } from "./DateRangeFields";
import { ExportDialog } from "./ExportDialog";
import { useReportPdf } from "./PdfButtons";

interface Props {
  filters: ReportFilters;
  items: ReportListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rangeLabel: string;
  loadError: string | null;
}

const toDraft = (f: ReportFilters): Required<Omit<ReportFilters, "includeDeleted">> & { includeDeleted: boolean } => ({
  range: f.range,
  date: f.date ?? "",
  from: f.from ?? "",
  to: f.to ?? "",
  q: f.q ?? "",
  reportNo: f.reportNo ?? "",
  preparedBy: f.preparedBy ?? "",
  sampleId: f.sampleId ?? "",
  project: f.project ?? "",
  sampleType: f.sampleType ?? "",
  sampleStatus: f.sampleStatus ?? "",
  status: f.status ?? "",
  includeDeleted: Boolean(f.includeDeleted),
});

export function ReportHistory({ filters, items, total, page, pageSize, pageCount, rangeLabel, loadError }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const pdf = useReportPdf();
  const [draft, setDraft] = useState(() => toDraft(filters));
  const [showMore, setShowMore] = useState(() => countActiveFilters(filters) - (filters.range !== "all" ? 1 : 0) - (filters.q ? 1 : 0) - (filters.status ? 1 : 0) > 0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(filters));
    setSelected(new Set());
  }, [filters]);

  const navigate = (f: ReportFilters, nextPage = 1) => {
    const sp = filtersToSearchParams(f);
    if (nextPage > 1) sp.set("page", String(nextPage));
    router.push(`${pathname}${sp.toString() ? `?${sp}` : ""}`);
  };

  const apply = (e?: React.FormEvent) => {
    e?.preventDefault();
    const err = dateRangeError(draft);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    navigate({
      ...draft,
      includeDeleted: draft.includeDeleted || undefined,
    });
  };

  const reset = () => {
    setFormError(null);
    navigate({ range: "all" });
  };

  const activeCount = countActiveFilters(filters);
  const allOnPageSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) items.forEach((i) => next.delete(i.id));
      else items.forEach((i) => next.add(i.id));
      return next;
    });

  const iconBtn = "rounded p-1.5 text-ink-muted transition-colors hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form onSubmit={apply} className="panel p-4" noValidate>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Search" htmlFor="q" className="min-w-[240px] flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input
                id="q"
                className="pl-9"
                placeholder="Report no., date (dd/mm/yyyy), prepared by, sample ID, project…"
                value={draft.q}
                onChange={(e) => setDraft({ ...draft, q: e.target.value })}
              />
            </div>
          </Field>
          <DateRangeFields idPrefix="hist" compact value={draft} onChange={(v) => setDraft({ ...draft, ...v })} />
          <Field label="Status" htmlFor="status" className="w-36">
            <Select
              id="status"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              options={REPORT_STATUSES.map((s) => ({ value: s, label: REPORT_STATUS_LABELS[s] }))}
              placeholder="All statuses"
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" icon={<Search className="h-4 w-4" />}>
              Apply
            </Button>
            <Button variant="outline" onClick={() => setShowMore((s) => !s)} icon={<SlidersHorizontal className="h-4 w-4" />} aria-expanded={showMore}>
              More
            </Button>
            {activeCount > 0 && (
              <Button variant="ghost" onClick={reset} icon={<RotateCcw className="h-4 w-4" />}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {showMore && (
          <div className="mt-4 grid gap-3 border-t border-rule pt-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <Field label="Report No." htmlFor="f-reportNo">
              <Input id="f-reportNo" value={draft.reportNo} onChange={(e) => setDraft({ ...draft, reportNo: e.target.value })} />
            </Field>
            <Field label="Prepared By" htmlFor="f-preparedBy">
              <Input id="f-preparedBy" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} />
            </Field>
            <Field label="Sample ID" htmlFor="f-sampleId">
              <Input id="f-sampleId" value={draft.sampleId} onChange={(e) => setDraft({ ...draft, sampleId: e.target.value })} />
            </Field>
            <Field label="Project / Institute" htmlFor="f-project">
              <Input id="f-project" value={draft.project} onChange={(e) => setDraft({ ...draft, project: e.target.value })} />
            </Field>
            <Field label="Sample Type" htmlFor="f-sampleType">
              <Select id="f-sampleType" value={draft.sampleType} onChange={(e) => setDraft({ ...draft, sampleType: e.target.value })} options={SAMPLE_TYPES} placeholder="Any" />
            </Field>
            <Field label="Sample Status" htmlFor="f-sampleStatus">
              <Select id="f-sampleStatus" value={draft.sampleStatus} onChange={(e) => setDraft({ ...draft, sampleStatus: e.target.value })} options={SAMPLE_STATUSES} placeholder="Any" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-violet-700"
                checked={draft.includeDeleted}
                onChange={(e) => setDraft({ ...draft, includeDeleted: e.target.checked })}
              />
              Include deleted reports
            </label>
          </div>
        )}
        {formError && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">
            {formError}
          </p>
        )}
      </form>

      {/* Results */}
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <div className="text-sm">
            <span className="font-semibold tabular">{total}</span> report{total === 1 ? "" : "s"}
            <span className="text-ink-muted"> · {rangeLabel}</span>
            {activeCount > 0 && <Badge tone="violet" className="ml-2">{activeCount} filter{activeCount === 1 ? "" : "s"}</Badge>}
            {selected.size > 0 && (
              <span className="ml-3 text-ink-muted">
                {selected.size} selected ·{" "}
                <button type="button" className="font-medium text-violet-700 hover:underline" onClick={() => setSelected(new Set())}>
                  clear
                </button>
              </span>
            )}
          </div>
          <Button
            onClick={() => setExportOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800"
            icon={<FileSpreadsheet className="h-4 w-4" />}
            disabled={Boolean(loadError)}
          >
            EXPORT TO EXCEL
          </Button>
        </div>

        {loadError ? (
          <EmptyState title="Reports could not be loaded">{loadError}</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} title="No reports found">
            {activeCount > 0 ? "Try a different date range or clear the filters." : "Create the first daily report to get started."}
            <div className="mt-4">
              <LinkButton href="/reports/new" size="sm">
                New Daily Report
              </LinkButton>
            </div>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1180px]">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" className="h-4 w-4 accent-violet-700" checked={allOnPageSelected} onChange={toggleAll} aria-label="Select all reports on this page" />
                  </th>
                  <th>Report No.</th>
                  <th>Date</th>
                  <th>Prepared By</th>
                  <th className="text-right">Samples Received</th>
                  <th className="text-right">Samples Processed</th>
                  <th>Activities</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Updated At</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className={cn("hover:bg-violet-50/40", selected.has(r.id) && "bg-violet-50/60", r.deletedAt && "opacity-60")}>
                    <td>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-violet-700"
                        checked={selected.has(r.id)}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.id)) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          })
                        }
                        aria-label={`Select ${r.reportNo}`}
                      />
                    </td>
                    <td className="whitespace-nowrap">
                      <Link href={`/reports/${r.id}`} className="font-semibold text-violet-800 hover:underline">
                        {r.reportNo}
                      </Link>
                      <div className="mt-0.5 flex gap-1">
                        {r.isDemo && <Badge tone="amber">Demo</Badge>}
                        {r.deletedAt && <Badge tone="red">Deleted</Badge>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="tabular">{formatDate(r.reportDate)}</span>
                      <span className="block text-xs text-ink-muted">{r.day}</span>
                    </td>
                    <td>{r.preparedByName}</td>
                    <td className="tabular text-right font-medium">{displayValue(r.newSamplesReceived)}</td>
                    <td className="tabular text-right font-medium">{displayValue(r.samplesProcessedToday)}</td>
                    <td className="max-w-[240px]">
                      {r.activities.length === 0 ? (
                        <span className="text-ink-faint">—</span>
                      ) : (
                        <span className="line-clamp-2 text-xs text-ink-soft" title={r.activities.map(activityLabel).join(", ")}>
                          {r.activities.map((a) => (a === "OTHER" && r.otherActivity ? `Other: ${r.otherActivity}` : activityLabel(a))).join(", ")}
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap text-xs text-ink-muted">{formatDateTime(r.createdAt)}</td>
                    <td className="whitespace-nowrap text-xs text-ink-muted">{formatDateTime(r.updatedAt)}</td>
                    <td>
                      <div className="flex justify-end gap-0.5">
                        <Link href={`/reports/${r.id}`} className={iconBtn} title="View" aria-label={`View ${r.reportNo}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                        {!r.deletedAt && (
                          <Link href={`/reports/${r.id}/edit`} className={iconBtn} title="Edit" aria-label={`Edit ${r.reportNo}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                        <button type="button" className={iconBtn} title="Generate PDF" aria-label={`Generate PDF for ${r.reportNo}`} onClick={() => pdf.generate(r.id)}>
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          title="Download PDF"
                          aria-label={`Download PDF for ${r.reportNo}`}
                          disabled={pdf.busy === `download:${r.id}`}
                          onClick={() => pdf.download(r.id, r.reportNo)}
                        >
                          <Download className={cn("h-4 w-4", pdf.busy === `download:${r.id}` && "animate-pulse")} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={(p) => navigate(filters, p)} />
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} filters={filters} selectedIds={selectedIds} matchingCount={total} />
    </div>
  );
}
