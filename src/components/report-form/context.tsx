"use client";

import { createContext, useContext } from "react";
import type { ConsumableRow, KitRow, ReportFormState, SampleRow } from "@/types/report";

export type TableName = "samples" | "kits" | "consumables";
export type RowOf<T extends TableName> = T extends "samples" ? SampleRow : T extends "kits" ? KitRow : ConsumableRow;

export interface ReportFormApi {
  form: ReportFormState;
  set: <K extends keyof ReportFormState>(key: K, value: ReportFormState[K]) => void;
  /** Field errors keyed by field name, or "table:rowKey:field" for table cells. */
  errors: Record<string, string>;
  updateRow: <T extends TableName>(table: T, key: string, patch: Partial<RowOf<T>>) => void;
  addRow: (table: TableName, afterKey?: string) => void;
  removeRow: (table: TableName, key: string) => void;
  moveRow: (table: TableName, key: string, direction: -1 | 1) => void;
  disabled: boolean;
}

export const ReportFormContext = createContext<ReportFormApi | null>(null);

export function useReportForm(): ReportFormApi {
  const ctx = useContext(ReportFormContext);
  if (!ctx) throw new Error("useReportForm must be used inside <ReportForm>");
  return ctx;
}

export const cellErrorKey = (table: TableName, rowKey: string, field: string) => `${table}:${rowKey}:${field}`;
