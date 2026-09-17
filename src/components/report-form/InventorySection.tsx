"use client";

import { AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/Choice";
import { Field, Textarea } from "@/components/ui/Field";
import { useReportForm } from "./context";
import { SectionCard } from "./SectionCard";

export function InventorySection() {
  const { form, set, errors, disabled } = useReportForm();
  return (
    <SectionCard id="section-8" number={8} title="Inventory / Stock Update">
      <div className="grid gap-1 sm:grid-cols-3">
        <Checkbox label="Stock Updated" checked={form.stockUpdated} onChange={(v) => set("stockUpdated", v)} disabled={disabled} />
        <Checkbox label="Reagents Received" checked={form.reagentsReceived} onChange={(v) => set("reagentsReceived", v)} disabled={disabled} />
        <Checkbox
          label={
            <span className="inline-flex items-center gap-1.5">
              Low Stock Alert {form.lowStockAlert && <AlertTriangle className="h-4 w-4 text-amber-600" />}
            </span>
          }
          checked={form.lowStockAlert}
          onChange={(v) => set("lowStockAlert", v)}
          disabled={disabled}
        />
      </div>
      <Field
        label={form.lowStockAlert ? "Remarks / items running low" : "Remarks / items"}
        htmlFor="inventoryRemarks"
        error={errors.inventoryRemarks}
        className="mt-4"
      >
        <Textarea
          id="inventoryRemarks"
          rows={3}
          value={form.inventoryRemarks}
          onChange={(e) => set("inventoryRemarks", e.target.value)}
          disabled={disabled}
        />
      </Field>
    </SectionCard>
  );
}
