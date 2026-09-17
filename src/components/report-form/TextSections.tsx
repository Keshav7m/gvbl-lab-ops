"use client";

import { Segmented } from "@/components/ui/Choice";
import { Field, Textarea } from "@/components/ui/Field";
import { useReportForm } from "./context";
import { SectionCard } from "./SectionCard";

function CharCount({ value, max }: { value: string; max: number }) {
  if (value.length < max * 0.8) return null;
  return (
    <span className={value.length > max ? "text-red-600" : "text-ink-muted"}>
      {value.length.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}

/** 10. Today's Work Status */
export function WorkStatusSection() {
  const { form, set, errors, disabled } = useReportForm();
  return (
    <SectionCard id="section-10" number={10} title="Today's Work Status" description="Summary of work performed today">
      <Field htmlFor="workSummary" error={errors.workSummary} hint={<CharCount value={form.workSummary} max={20000} />}>
        <Textarea
          id="workSummary"
          aria-label="Today's work status"
          rows={7}
          value={form.workSummary}
          onChange={(e) => set("workSummary", e.target.value)}
          invalid={Boolean(errors.workSummary)}
          placeholder="e.g. Extracted DNA from 12 FFPE samples; library prep started for batch B-14…"
          disabled={disabled}
        />
      </Field>
    </SectionCard>
  );
}

/** 11. Issues / Deviations */
export function IssuesSection() {
  const { form, set, errors, disabled } = useReportForm();
  return (
    <SectionCard id="section-11" number={11} title="Issues / Deviations">
      <Segmented
        ariaLabel="Issues or deviations"
        value={form.issuesStatus}
        onChange={(v) => set("issuesStatus", v)}
        options={[
          { value: "NONE", label: "None" },
          { value: "YES", label: "Yes" },
        ]}
        invalid={Boolean(errors.issuesStatus)}
        disabled={disabled}
      />
      {form.issuesStatus !== "NONE" && (
        <Field
          label="Details"
          htmlFor="issueDetails"
          error={errors.issueDetails}
          className="mt-4"
          required={form.issuesStatus === "YES"}
        >
          <Textarea
            id="issueDetails"
            rows={4}
            value={form.issueDetails}
            onChange={(e) => set("issueDetails", e.target.value)}
            invalid={Boolean(errors.issueDetails)}
            placeholder="What happened, affected samples, corrective action…"
            disabled={disabled}
          />
        </Field>
      )}
    </SectionCard>
  );
}

/** 12. Pending Work / Handover */
export function PendingWorkSection() {
  const { form, set, errors, disabled } = useReportForm();
  return (
    <SectionCard id="section-12" number={12} title="Pending Work / Handover" description="Work carried over to the next shift or day">
      <Field htmlFor="pendingWork" error={errors.pendingWork}>
        <Textarea
          id="pendingWork"
          aria-label="Pending work and handover"
          rows={5}
          value={form.pendingWork}
          onChange={(e) => set("pendingWork", e.target.value)}
          disabled={disabled}
        />
      </Field>
    </SectionCard>
  );
}
