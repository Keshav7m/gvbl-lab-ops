"use client";

import { Field, Input, Textarea } from "@/components/ui/Field";
import { SEQUENCING_PLATFORMS } from "@/lib/constants";
import { useReportForm } from "./context";
import { SectionCard } from "./SectionCard";

export function SequencingSection() {
  const { form, set, errors, disabled } = useReportForm();
  return (
    <SectionCard id="section-9" number={9} title="Sequencing Details">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Platform" htmlFor="sequencingPlatform" error={errors.sequencingPlatform} hint="Pick a suggestion or type any platform">
          <Input
            id="sequencingPlatform"
            list="sequencing-platforms"
            value={form.sequencingPlatform}
            onChange={(e) => set("sequencingPlatform", e.target.value)}
            disabled={disabled}
          />
          <datalist id="sequencing-platforms">
            {SEQUENCING_PLATFORMS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Run ID / Batch No." htmlFor="runId" error={errors.runId}>
          <Input id="runId" value={form.runId} onChange={(e) => set("runId", e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Flow Cell / Cartridge ID" htmlFor="flowCellId" error={errors.flowCellId}>
          <Input id="flowCellId" value={form.flowCellId} onChange={(e) => set("flowCellId", e.target.value)} disabled={disabled} />
        </Field>
        <Field
          label="Samples Sent for Sequencing"
          htmlFor="samplesSentForSequencing"
          error={errors.samplesSentForSequencing}
          className="md:col-span-3"
        >
          <Textarea
            id="samplesSentForSequencing"
            rows={2}
            value={form.samplesSentForSequencing}
            onChange={(e) => set("samplesSentForSequencing", e.target.value)}
            placeholder="Number of samples and/or Sample IDs"
            disabled={disabled}
          />
        </Field>
      </div>
    </SectionCard>
  );
}
