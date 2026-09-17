"use client";

import { Field, Input, Select } from "@/components/ui/Field";
import { SAMPLE_QUALITY_OPTIONS } from "@/lib/constants";
import type { ReportFormState } from "@/types/report";
import { useReportForm } from "./context";
import { SectionCard } from "./SectionCard";

const COUNT_FIELDS: { key: keyof ReportFormState; label: string }[] = [
  { key: "pendingSamples", label: "Pending Samples" },
  { key: "newSamplesReceived", label: "New Samples Received" },
  { key: "samplesProcessedToday", label: "Samples Processed Today" },
  { key: "completedDispatched", label: "Completed / Dispatched" },
  { key: "totalUnderProcessing", label: "Total Under Processing" },
];

export function SampleSummarySection() {
  const { form, set, errors, disabled } = useReportForm();
  const entered = form.samples.filter((s) => s.sampleId.trim()).length;

  return (
    <SectionCard
      id="section-1"
      number={1}
      title="Sample Summary"
      description="Counts for today. Leave blank if not applicable."
      aside={
        <span className="text-xs text-ink-muted">
          <strong className="tabular text-ink">{entered}</strong> sample row{entered === 1 ? "" : "s"} entered in Section 2
        </span>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {COUNT_FIELDS.map(({ key, label }) => (
          <Field key={key} label={label} htmlFor={key} error={errors[key]}>
            <Input
              id={key}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              className="tabular text-base font-semibold"
              value={form[key] as string}
              onChange={(e) => set(key, e.target.value.replace(/[^\d]/g, "") as never)}
              invalid={Boolean(errors[key])}
              placeholder="0"
              disabled={disabled}
            />
          </Field>
        ))}
        <Field label="Sample Quality" htmlFor="sampleQuality" error={errors.sampleQuality}>
          <Select
            id="sampleQuality"
            value={form.sampleQuality}
            onChange={(e) => set("sampleQuality", e.target.value)}
            options={
              form.sampleQuality && !(SAMPLE_QUALITY_OPTIONS as readonly string[]).includes(form.sampleQuality)
                ? [...SAMPLE_QUALITY_OPTIONS, form.sampleQuality]
                : SAMPLE_QUALITY_OPTIONS
            }
            placeholder="Select…"
            disabled={disabled}
          />
        </Field>
      </div>
    </SectionCard>
  );
}
