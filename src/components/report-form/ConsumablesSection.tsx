"use client";

import { SectionCard } from "./SectionCard";
import { SimpleTable } from "./SimpleTable";

export function ConsumablesSection() {
  return (
    <SectionCard id="section-6" number={6} title="Consumables / Reagents Received">
      <SimpleTable
        table="consumables"
        addLabel="Add item received"
        rowLabel="item"
        columns={[
          { field: "itemName", label: "Item / Reagent Name", width: "1.6fr" },
          { field: "batchLotCatalogueNo", label: "Batch / Lot / Catalogue No.", width: "1.2fr" },
          { field: "invoiceDetails", label: "Invoice Details", width: "1.2fr" },
          { field: "supplier", label: "Supplier", width: "1.1fr" },
        ]}
      />
    </SectionCard>
  );
}
