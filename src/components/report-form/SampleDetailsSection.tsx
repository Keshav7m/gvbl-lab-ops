"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Select } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Modal";
import { SAMPLE_STATUSES, SAMPLE_TYPES } from "@/lib/constants";
import type { SampleRow } from "@/types/report";
import { cellErrorKey, useReportForm } from "./context";
import { RowControls } from "./RowControls";
import { SectionCard } from "./SectionCard";

function isFilled(row: SampleRow) {
  return Object.entries(row).some(([k, v]) => k !== "key" && v !== "");
}

export function SampleDetailsSection() {
  const { form, errors, updateRow, addRow, removeRow, moveRow, disabled } = useReportForm();
  const [pendingRemove, setPendingRemove] = useState<SampleRow | null>(null);
  const rows = form.samples;

  const requestRemove = (row: SampleRow) => {
    if (isFilled(row)) setPendingRemove(row);
    else removeRow("samples", row.key);
  };

  const err = (row: SampleRow, field: string) => errors[cellErrorKey("samples", row.key, field)];
  const sub = "mb-1 block text-[11px] font-medium text-ink-muted";

  return (
    <SectionCard
      id="section-2"
      number={2}
      title="Sample Details"
      description="One row per sample. Add as many rows as needed; empty rows are ignored."
      aside={
        !disabled && (
          <Button variant="secondary" size="sm" onClick={() => addRow("samples")} icon={<Plus className="h-4 w-4" />}>
            Add Sample
          </Button>
        )
      }
    >
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.key} className="rounded-md border border-rule bg-white">
            <div className="flex items-center justify-between border-b border-rule bg-mist/70 px-3 py-1.5">
              <span className="text-xs font-semibold text-violet-800">
                Sample {i + 1}
                {row.sampleId && <span className="ml-2 font-normal text-ink-muted">· {row.sampleId}</span>}
              </span>
              <RowControls
                index={i}
                count={rows.length}
                label={`sample ${i + 1}`}
                onUp={() => moveRow("samples", row.key, -1)}
                onDown={() => moveRow("samples", row.key, 1)}
                onRemove={() => requestRemove(row)}
                disabled={disabled}
              />
            </div>

            <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_0.9fr_0.9fr]">
              <div>
                <label className={sub} htmlFor={`s-${row.key}-id`}>
                  Sample ID
                </label>
                <Input
                  id={`s-${row.key}-id`}
                  value={row.sampleId}
                  onChange={(e) => updateRow("samples", row.key, { sampleId: e.target.value })}
                  invalid={Boolean(err(row, "sampleId"))}
                  className="font-medium"
                  disabled={disabled}
                />
                <FieldError message={err(row, "sampleId")} />
              </div>
              <div>
                <label className={sub} htmlFor={`s-${row.key}-proj`}>
                  Project / Institute
                </label>
                <Input
                  id={`s-${row.key}-proj`}
                  value={row.projectInstitute}
                  onChange={(e) => updateRow("samples", row.key, { projectInstitute: e.target.value })}
                  invalid={Boolean(err(row, "projectInstitute"))}
                  disabled={disabled}
                />
                <FieldError message={err(row, "projectInstitute")} />
              </div>
              <div>
                <label className={sub} htmlFor={`s-${row.key}-type`}>
                  Sample Type
                </label>
                <Select
                  id={`s-${row.key}-type`}
                  value={row.sampleType}
                  onChange={(e) => updateRow("samples", row.key, { sampleType: e.target.value })}
                  options={SAMPLE_TYPES}
                  placeholder="Select…"
                  disabled={disabled}
                />
                {row.sampleType === "Other" && (
                  <Input
                    className="mt-1.5"
                    placeholder="Specify type"
                    aria-label="Specify other sample type"
                    value={row.sampleTypeOther}
                    onChange={(e) => updateRow("samples", row.key, { sampleTypeOther: e.target.value })}
                    disabled={disabled}
                  />
                )}
              </div>
              <div>
                <label className={sub} htmlFor={`s-${row.key}-status`}>
                  Current Status
                </label>
                <Select
                  id={`s-${row.key}-status`}
                  value={row.currentStatus}
                  onChange={(e) => updateRow("samples", row.key, { currentStatus: e.target.value })}
                  options={SAMPLE_STATUSES}
                  placeholder="Select…"
                  disabled={disabled}
                />
              </div>
            </div>

            <fieldset className="mx-3 mb-3 rounded-md border border-dashed border-violet-200 bg-violet-50/40 px-3 pb-3 pt-1">
              <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">Sample Coordination</legend>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    ["receivedFrom", "Received From"],
                    ["sentTo", "Sent To"],
                    ["coordinatedBy", "Coordinated By"],
                    ["remarks", "Remarks"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label className={sub} htmlFor={`s-${row.key}-${field}`}>
                      {label}
                    </label>
                    <Input
                      id={`s-${row.key}-${field}`}
                      value={row[field]}
                      onChange={(e) => updateRow("samples", row.key, { [field]: e.target.value })}
                      invalid={Boolean(err(row, field))}
                      disabled={disabled}
                    />
                    <FieldError message={err(row, field)} />
                  </div>
                ))}
              </div>
            </fieldset>
          </div>
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">No samples recorded for this report.</p>}
      </div>

      {!disabled && rows.length > 2 && (
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => addRow("samples")} icon={<Plus className="h-4 w-4" />}>
            Add another sample
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title="Remove this sample row?"
        message={
          <>
            Sample <strong>{pendingRemove?.sampleId || "(no ID)"}</strong> will be removed from this report when you save.
          </>
        }
        confirmLabel="Remove row"
        tone="danger"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) removeRow("samples", pendingRemove.key);
          setPendingRemove(null);
        }}
      />
    </SectionCard>
  );
}
