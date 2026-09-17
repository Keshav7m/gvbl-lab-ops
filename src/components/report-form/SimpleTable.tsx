"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, Input } from "@/components/ui/Field";
import { cellErrorKey, useReportForm, type RowOf, type TableName } from "./context";
import { RowControls } from "./RowControls";

export interface SimpleColumn<T extends TableName> {
  field: Exclude<keyof RowOf<T>, "key"> & string;
  label: string;
  width?: string;
  placeholder?: string;
}

/** Editable table used by Section 5 (Kits / Reagents Used) and Section 6 (Consumables Received). */
export function SimpleTable<T extends "kits" | "consumables">({
  table,
  columns,
  addLabel,
  rowLabel,
}: {
  table: T;
  columns: SimpleColumn<T>[];
  addLabel: string;
  rowLabel: string;
}) {
  const { form, errors, updateRow, addRow, removeRow, moveRow, disabled } = useReportForm();
  const rows = form[table] as RowOf<T>[];
  const template = `2.5rem ${columns.map((c) => c.width ?? "1fr").join(" ")} ${disabled ? "" : "6.5rem"}`;

  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-rule">
        <div className="min-w-[640px]">
          <div
            className="grid items-center gap-2 border-b border-rule bg-violet-50 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-violet-800"
            style={{ gridTemplateColumns: template }}
          >
            <span className="text-center">#</span>
            {columns.map((c) => (
              <span key={c.field}>{c.label}</span>
            ))}
            {!disabled && <span className="sr-only">Actions</span>}
          </div>
          {rows.map((row, i) => (
            <div
              key={row.key}
              className="grid items-start gap-2 border-b border-rule px-2 py-2 last:border-0"
              style={{ gridTemplateColumns: template }}
            >
              <span className="tabular pt-2 text-center text-xs font-semibold text-ink-muted">{i + 1}</span>
              {columns.map((c) => {
                const error = errors[cellErrorKey(table, row.key, c.field)];
                return (
                  <div key={c.field}>
                    <Input
                      aria-label={`${c.label}, row ${i + 1}`}
                      value={String(row[c.field as keyof RowOf<T>] ?? "")}
                      placeholder={c.placeholder}
                      onChange={(e) => updateRow(table, row.key, { [c.field]: e.target.value } as Partial<RowOf<T>>)}
                      invalid={Boolean(error)}
                      disabled={disabled}
                    />
                    <FieldError message={error} />
                  </div>
                );
              })}
              {!disabled && (
                <div className="pt-0.5">
                  <RowControls
                    index={i}
                    count={rows.length}
                    label={`${rowLabel} ${i + 1}`}
                    onUp={() => moveRow(table, row.key, -1)}
                    onDown={() => moveRow(table, row.key, 1)}
                    onRemove={() => removeRow(table, row.key)}
                  />
                </div>
              )}
            </div>
          ))}
          {rows.length === 0 && <p className="px-3 py-5 text-center text-sm text-ink-muted">No rows.</p>}
        </div>
      </div>
      {!disabled && (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => addRow(table)} icon={<Plus className="h-4 w-4" />}>
          {addLabel}
        </Button>
      )}
    </div>
  );
}
