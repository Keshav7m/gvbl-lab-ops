"use client";

import { SectionCard } from "./SectionCard";
import { SimpleTable } from "./SimpleTable";

export function KitsSection() {
  return (
    <SectionCard id="section-5" number={5} title="Kits / Reagents Used">
      <SimpleTable
        table="kits"
        addLabel="Add kit / reagent"
        rowLabel="kit"
        columns={[
          { field: "name", label: "Kit / Reagent Name", width: "2fr" },
          { field: "lotNo", label: "Lot No.", width: "1fr" },
          { field: "quantityUsed", label: "Quantity Used", width: "1fr", placeholder: "e.g. 24 rxn" },
        ]}
      />
    </SectionCard>
  );
}
