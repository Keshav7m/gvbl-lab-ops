"use client";

import { Field, Input, Select } from "@/components/ui/Field";
import { DATE_RANGE_OPTIONS, type DateRangeKey } from "@/lib/dates";

export interface DateRangeValue {
  range: DateRangeKey;
  date: string;
  from: string;
  to: string;
}

export function dateRangeError(v: DateRangeValue): string | null {
  if (v.range === "date" && !v.date) return "Select a date.";
  if (v.range === "custom") {
    if (!v.from || !v.to) return "Select both From Date and To Date.";
    if (v.from > v.to) return "From Date must be on or before To Date.";
  }
  return null;
}

/** Date filter used by Report History and the Excel export dialog. */
export function DateRangeFields({
  value,
  onChange,
  idPrefix,
  compact,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  idPrefix: string;
  compact?: boolean;
}) {
  const error = dateRangeError(value);
  const showError = error && (value.range === "custom" ? value.from && value.to : false);
  return (
    <div className={compact ? "flex flex-wrap items-end gap-3" : "grid gap-3 sm:grid-cols-3"}>
      <Field label="Date Filter" htmlFor={`${idPrefix}-range`} className={compact ? "w-44" : undefined}>
        <Select
          id={`${idPrefix}-range`}
          value={value.range}
          onChange={(e) => onChange({ ...value, range: e.target.value as DateRangeKey })}
          options={DATE_RANGE_OPTIONS}
        />
      </Field>
      {value.range === "date" && (
        <Field label="Date" htmlFor={`${idPrefix}-date`} className={compact ? "w-44" : undefined}>
          <Input id={`${idPrefix}-date`} type="date" value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} />
        </Field>
      )}
      {value.range === "custom" && (
        <>
          <Field label="From Date" htmlFor={`${idPrefix}-from`} className={compact ? "w-44" : undefined}>
            <Input
              id={`${idPrefix}-from`}
              type="date"
              value={value.from}
              max={value.to || undefined}
              invalid={Boolean(showError)}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </Field>
          <Field label="To Date" htmlFor={`${idPrefix}-to`} className={compact ? "w-44" : undefined} error={showError ? error! : undefined}>
            <Input
              id={`${idPrefix}-to`}
              type="date"
              value={value.to}
              min={value.from || undefined}
              invalid={Boolean(showError)}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </Field>
        </>
      )}
    </div>
  );
}
