"use client";

import { Checkbox } from "@/components/ui/Choice";
import { Field, Input } from "@/components/ui/Field";
import { LAB_ACTIVITIES } from "@/lib/constants";
import { useReportForm } from "./context";
import { SectionCard } from "./SectionCard";

export function ActivitiesSection() {
  const { form, set, errors, disabled } = useReportForm();

  const toggle = (key: string, checked: boolean) => {
    const next = checked ? [...form.activities, key] : form.activities.filter((a) => a !== key);
    // Keep the paper-form order regardless of click order
    set(
      "activities",
      LAB_ACTIVITIES.map((a) => a.key).filter((k) => next.includes(k)),
    );
  };

  return (
    <SectionCard
      id="section-4"
      number={4}
      title="Laboratory Activities"
      description="Tick all that were performed"
      aside={<span className="tabular text-xs text-ink-muted">{form.activities.length} selected</span>}
    >
      <div className="grid gap-1 sm:grid-cols-2">
        {LAB_ACTIVITIES.map((a) => (
          <Checkbox
            key={a.key}
            label={a.label}
            checked={form.activities.includes(a.key)}
            onChange={(c) => toggle(a.key, c)}
            disabled={disabled}
          />
        ))}
      </div>
      {form.activities.includes("OTHER") && (
        <Field label="Other — specify" htmlFor="otherActivity" error={errors.otherActivity} className="mt-3" required>
          <Input
            id="otherActivity"
            value={form.otherActivity}
            onChange={(e) => set("otherActivity", e.target.value)}
            invalid={Boolean(errors.otherActivity)}
            disabled={disabled}
          />
        </Field>
      )}
    </SectionCard>
  );
}
