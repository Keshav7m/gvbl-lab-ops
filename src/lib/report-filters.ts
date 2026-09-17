import { isDateRangeKey, type DateRangeKey } from "./dates";

export interface ReportFilters {
  range: DateRangeKey;
  date?: string;
  from?: string;
  to?: string;
  q?: string;
  reportNo?: string;
  preparedBy?: string;
  sampleId?: string;
  project?: string;
  sampleType?: string;
  sampleStatus?: string;
  status?: string;
  includeDeleted?: boolean;
}

const TEXT_KEYS = [
  "date",
  "from",
  "to",
  "q",
  "reportNo",
  "preparedBy",
  "sampleId",
  "project",
  "sampleType",
  "sampleStatus",
  "status",
] as const;

export function parseFilters(sp: URLSearchParams): ReportFilters {
  const rangeParam = sp.get("range");
  const f: ReportFilters = { range: isDateRangeKey(rangeParam) ? rangeParam : "all" };
  for (const key of TEXT_KEYS) {
    const v = sp.get(key)?.trim();
    if (v) f[key] = v.slice(0, 200);
  }
  if (sp.get("includeDeleted") === "1") f.includeDeleted = true;
  return f;
}

export function filtersToSearchParams(f: ReportFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.range && f.range !== "all") sp.set("range", f.range);
  for (const key of TEXT_KEYS) {
    if (key === "date" && f.range !== "date") continue;
    if ((key === "from" || key === "to") && f.range !== "custom") continue;
    const v = f[key];
    if (v) sp.set(key, v);
  }
  if (f.includeDeleted) sp.set("includeDeleted", "1");
  return sp;
}

export function countActiveFilters(f: ReportFilters): number {
  let c = f.range !== "all" ? 1 : 0;
  for (const key of ["q", "reportNo", "preparedBy", "sampleId", "project", "sampleType", "sampleStatus", "status"] as const) {
    if (f[key]) c++;
  }
  if (f.includeDeleted) c++;
  return c;
}
