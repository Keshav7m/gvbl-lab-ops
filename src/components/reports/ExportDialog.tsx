"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { downloadFile, errorMessage } from "@/lib/client-api";
import { filtersToSearchParams, type ReportFilters } from "@/lib/report-filters";
import { cn } from "@/lib/utils";
import { DateRangeFields, dateRangeError, type DateRangeValue } from "./DateRangeFields";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  filters: ReportFilters;
  selectedIds: string[];
  matchingCount: number;
}

export function ExportDialog({ open, onClose, filters, selectedIds, matchingCount }: ExportDialogProps) {
  const toast = useToast();
  const [scope, setScope] = useState<"filters" | "selected">("filters");
  const [range, setRange] = useState<DateRangeValue>({ range: "all", date: "", from: "", to: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setScope(selectedIds.length ? "selected" : "filters");
    setRange({ range: filters.range, date: filters.date ?? "", from: filters.from ?? "", to: filters.to ?? "" });
    setError(null);
  }, [open, filters, selectedIds.length]);

  const rangeError = scope === "filters" ? dateRangeError(range) : null;

  const run = async () => {
    if (rangeError) {
      setError(rangeError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const f: ReportFilters = scope === "selected" ? { range: "all", includeDeleted: filters.includeDeleted } : { ...filters, ...range };
      const name = await downloadFile(
        "/api/reports/export",
        {
          method: "POST",
          json: { query: filtersToSearchParams(f).toString(), ids: scope === "selected" ? selectedIds : undefined },
        },
        "GVBL-NGS-Daily-Reports.xlsx",
      );
      toast.success("Excel file exported", name);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const option = (value: "filters" | "selected", title: string, detail: string, disabled?: boolean) => (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border p-3",
        scope === value ? "border-violet-500 bg-violet-50" : "border-rule hover:bg-mist",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="radio"
        name="export-scope"
        className="mt-1 accent-violet-700"
        checked={scope === value}
        disabled={disabled}
        onChange={() => setScope(value)}
      />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-ink-muted">{detail}</span>
      </span>
    </label>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="lg"
      title="Export to Excel"
      description="Creates an .xlsx workbook with sheets for Daily Reports, Sample Details, Kits/Reagents Used and Consumables/Reagents Received."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={run} loading={busy} icon={<FileSpreadsheet className="h-4 w-4" />} className="bg-emerald-700 hover:bg-emerald-800">
            Export to Excel
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {option("filters", "Reports matching filters", `Current search filters with the date range below (${matchingCount} on screen now)`)}
          {option(
            "selected",
            `Selected reports (${selectedIds.length})`,
            selectedIds.length ? "Only the rows ticked in the table" : "Tick rows in the table to use this",
            selectedIds.length === 0,
          )}
        </div>
        {scope === "filters" && (
          <div className="rounded-md border border-rule p-3">
            <DateRangeFields idPrefix="export" value={range} onChange={setRange} />
            <p className="mt-2 text-xs text-ink-muted">
              Choose <strong>All Records</strong> to export every date, <strong>Selected Date</strong> for one day, or{" "}
              <strong>Custom Date Range</strong>.
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
