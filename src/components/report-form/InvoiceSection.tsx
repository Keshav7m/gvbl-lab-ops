"use client";

import { Segmented } from "@/components/ui/Choice";
import { Field, Textarea } from "@/components/ui/Field";
import { useReportForm } from "./context";
import { SectionCard } from "./SectionCard";

export function InvoiceSection() {
  const { form, set, errors, disabled } = useReportForm();
  return (
    <SectionCard id="section-7" number={7} title="Invoice Update">
      <Segmented
        ariaLabel="Invoice update"
        value={form.invoiceStatus}
        onChange={(v) => set("invoiceStatus", v)}
        options={[
          { value: "UPDATED", label: "Invoice Updated" },
          { value: "NONE", label: "None" },
        ]}
        disabled={disabled}
      />
      <Field label="Remarks" htmlFor="invoiceRemarks" error={errors.invoiceRemarks} className="mt-4">
        <Textarea
          id="invoiceRemarks"
          rows={3}
          value={form.invoiceRemarks}
          onChange={(e) => set("invoiceRemarks", e.target.value)}
          placeholder="Invoice numbers, vendors, amounts…"
          disabled={disabled}
        />
      </Field>
    </SectionCard>
  );
}
