"use client";

import { CalendarDays, Hash } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { formatDate, weekdayName } from "@/lib/dates";
import { useReportForm } from "./context";

export function HeaderSection({ reportNo }: { reportNo?: string }) {
  const { form, set, errors, disabled } = useReportForm();
  const day = weekdayName(form.reportDate);

  return (
    <section id="section-header" className="panel scroll-mt-24 overflow-hidden">
      <div className="grid gap-px bg-rule sm:grid-cols-3">
        <div className="bg-white p-4">
          <p className="label flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" /> Report No.
          </p>
          {reportNo ? (
            <p className="tabular text-lg font-semibold text-violet-800">{reportNo}</p>
          ) : (
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-ink">Auto-generated</span> when the report is first saved
            </p>
          )}
        </div>
        <div className="bg-white p-4">
          <Field label="Date" htmlFor="reportDate" error={errors.reportDate} required>
            <Input
              id="reportDate"
              type="date"
              value={form.reportDate}
              onChange={(e) => set("reportDate", e.target.value)}
              invalid={Boolean(errors.reportDate)}
              disabled={disabled}
            />
          </Field>
        </div>
        <div className="bg-white p-4">
          <p className="label flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Day
          </p>
          <p className="text-lg font-semibold">{day || "—"}</p>
          <p className="text-xs text-ink-muted">Filled automatically from {formatDate(form.reportDate)}</p>
        </div>
      </div>

      <div className="grid gap-4 border-t border-rule bg-violet-50/50 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_1.4fr]">
        <Field label="Department" htmlFor="department" error={errors.department} required>
          <Input
            id="department"
            value={form.department}
            onChange={(e) => set("department", e.target.value)}
            invalid={Boolean(errors.department)}
            disabled={disabled}
          />
        </Field>
        <Field label="Prepared By" htmlFor="preparedByName" error={errors.preparedByName} required>
          <Input
            id="preparedByName"
            value={form.preparedByName}
            onChange={(e) => set("preparedByName", e.target.value)}
            invalid={Boolean(errors.preparedByName)}
            autoComplete="name"
            disabled={disabled}
          />
        </Field>
        <Field label="Notes" htmlFor="notes" error={errors.notes} className="sm:col-span-2 lg:col-span-1">
          <Textarea
            id="notes"
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any general note for this report"
            disabled={disabled}
          />
        </Field>
      </div>
    </section>
  );
}
