"use client";

import { Segmented, YES_NO_OPTIONS } from "@/components/ui/Choice";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { PICKUP_LABEL } from "@/lib/constants";
import { useReportForm } from "./context";
import { SectionCard } from "./SectionCard";

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {children}
    </div>
  );
}

export function SampleQualitySection() {
  const { form, set, errors, disabled } = useReportForm();
  return (
    <SectionCard id="section-3" number={3} title="Sample Quality">
      <div>
        <Question label="Did the samples meet SOP criteria?">
          <Segmented
            ariaLabel="Samples met SOP criteria"
            value={form.sopCriteriaMet}
            onChange={(v) => set("sopCriteriaMet", v)}
            options={YES_NO_OPTIONS}
            disabled={disabled}
          />
        </Question>
        <Question label="Samples in good condition?">
          <Segmented
            ariaLabel="Samples in good condition"
            value={form.samplesGoodCondition}
            onChange={(v) => set("samplesGoodCondition", v)}
            options={YES_NO_OPTIONS}
            disabled={disabled}
          />
        </Question>
        {form.samplesGoodCondition !== "YES" && (
          <Field
            label="If No, reason / details"
            htmlFor="conditionDetails"
            error={errors.conditionDetails}
            className="py-3"
            required={form.samplesGoodCondition === "NO"}
          >
            <Textarea
              id="conditionDetails"
              rows={2}
              value={form.conditionDetails}
              onChange={(e) => set("conditionDetails", e.target.value)}
              invalid={Boolean(errors.conditionDetails)}
              disabled={disabled}
            />
          </Field>
        )}
        <Question label={`${PICKUP_LABEL}?`}>
          <Segmented
            ariaLabel={PICKUP_LABEL}
            value={form.pickupByGvblStaff}
            onChange={(v) => set("pickupByGvblStaff", v)}
            options={YES_NO_OPTIONS}
            disabled={disabled}
          />
        </Question>
        {form.pickupByGvblStaff !== "NO" && (
          <Field label="Pickup by" htmlFor="pickupBy" error={errors.pickupBy} className="pt-3" required={form.pickupByGvblStaff === "YES"}>
            <Input
              id="pickupBy"
              value={form.pickupBy}
              onChange={(e) => set("pickupBy", e.target.value)}
              invalid={Boolean(errors.pickupBy)}
              placeholder="Staff member name"
              disabled={disabled}
            />
          </Field>
        )}
      </div>
    </SectionCard>
  );
}
