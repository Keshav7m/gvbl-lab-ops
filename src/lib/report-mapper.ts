/**
 * Conversions between the browser form state, the API payload and the stored report.
 * Safe to import from client components.
 */
import type {
  ConsumableRow,
  KitRow,
  ReportFormState,
  SampleRow,
  SerializedReport,
  YesNo,
} from "@/types/report";
import { ORG } from "./constants";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "./dates";
import { uid } from "./ids";
import type { ReportPayloadInput } from "./validation";

export const emptySample = (): SampleRow => ({
  key: uid(),
  sampleId: "",
  projectInstitute: "",
  sampleType: "",
  sampleTypeOther: "",
  currentStatus: "",
  receivedFrom: "",
  sentTo: "",
  coordinatedBy: "",
  remarks: "",
});

export const emptyKit = (): KitRow => ({ key: uid(), name: "", lotNo: "", quantityUsed: "" });

export const emptyConsumable = (): ConsumableRow => ({
  key: uid(),
  itemName: "",
  batchLotCatalogueNo: "",
  invoiceDetails: "",
  supplier: "",
});

export function emptyFormState(opts: { today: string; preparedByName: string }): ReportFormState {
  return {
    reportDate: opts.today,
    department: ORG.defaultDepartment,
    preparedByName: opts.preparedByName,
    notes: "",
    pendingSamples: "",
    newSamplesReceived: "",
    samplesProcessedToday: "",
    completedDispatched: "",
    totalUnderProcessing: "",
    sampleQuality: "",
    sopCriteriaMet: "",
    samplesGoodCondition: "",
    conditionDetails: "",
    pickupByGvblStaff: "",
    pickupBy: "",
    activities: [],
    otherActivity: "",
    invoiceStatus: "",
    invoiceRemarks: "",
    stockUpdated: false,
    reagentsReceived: false,
    lowStockAlert: false,
    inventoryRemarks: "",
    sequencingPlatform: "",
    runId: "",
    flowCellId: "",
    samplesSentForSequencing: "",
    workSummary: "",
    issuesStatus: "",
    issueDetails: "",
    pendingWork: "",
    additionalComments: "",
    preparedSignature: null,
    preparedAt: toDateTimeLocalValue(new Date()),
    samples: [emptySample()],
    kits: [emptyKit()],
    consumables: [emptyConsumable()],
  };
}

const s = (v: string | null | undefined) => v ?? "";
const n = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const boolToYesNo = (v: boolean | null): YesNo => (v === null ? "" : v ? "YES" : "NO");

export function reportToFormState(r: SerializedReport): ReportFormState {
  return {
    reportDate: r.reportDate,
    department: r.department,
    preparedByName: r.preparedByName,
    notes: s(r.notes),
    pendingSamples: n(r.pendingSamples),
    newSamplesReceived: n(r.newSamplesReceived),
    samplesProcessedToday: n(r.samplesProcessedToday),
    completedDispatched: n(r.completedDispatched),
    totalUnderProcessing: n(r.totalUnderProcessing),
    sampleQuality: s(r.sampleQuality),
    sopCriteriaMet: boolToYesNo(r.sopCriteriaMet),
    samplesGoodCondition: boolToYesNo(r.samplesGoodCondition),
    conditionDetails: s(r.conditionDetails),
    pickupByGvblStaff: boolToYesNo(r.pickupByGvblStaff),
    pickupBy: s(r.pickupBy),
    activities: [...r.activities],
    otherActivity: s(r.otherActivity),
    invoiceStatus: r.invoiceStatus ?? "",
    invoiceRemarks: s(r.invoiceRemarks),
    stockUpdated: r.stockUpdated,
    reagentsReceived: r.reagentsReceived,
    lowStockAlert: r.lowStockAlert,
    inventoryRemarks: s(r.inventoryRemarks),
    sequencingPlatform: s(r.sequencingPlatform),
    runId: s(r.runId),
    flowCellId: s(r.flowCellId),
    samplesSentForSequencing: s(r.samplesSentForSequencing),
    workSummary: s(r.workSummary),
    issuesStatus: r.issuesStatus ?? "",
    issueDetails: s(r.issueDetails),
    pendingWork: s(r.pendingWork),
    additionalComments: s(r.additionalComments),
    preparedSignature: r.preparedSignature,
    preparedAt: toDateTimeLocalValue(r.preparedAt),
    samples: r.samples.length
      ? r.samples.map((x) => ({
          key: uid(),
          sampleId: x.sampleId,
          projectInstitute: s(x.projectInstitute),
          sampleType: s(x.sampleType),
          sampleTypeOther: s(x.sampleTypeOther),
          currentStatus: s(x.currentStatus),
          receivedFrom: s(x.receivedFrom),
          sentTo: s(x.sentTo),
          coordinatedBy: s(x.coordinatedBy),
          remarks: s(x.remarks),
        }))
      : [emptySample()],
    kits: r.kits.length
      ? r.kits.map((x) => ({ key: uid(), name: x.name, lotNo: s(x.lotNo), quantityUsed: s(x.quantityUsed) }))
      : [emptyKit()],
    consumables: r.consumables.length
      ? r.consumables.map((x) => ({
          key: uid(),
          itemName: x.itemName,
          batchLotCatalogueNo: s(x.batchLotCatalogueNo),
          invoiceDetails: s(x.invoiceDetails),
          supplier: s(x.supplier),
        }))
      : [emptyConsumable()],
  };
}

function isBlankRow(row: object): boolean {
  return Object.entries(row).every(([k, v]) => k === "key" || v === "" || v === null || v === undefined);
}

const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));
const yn = (v: YesNo): "YES" | "NO" | null => (v === "" ? null : v);

/** Converts form state into the API payload. Completely empty table rows are dropped. */
export function formStateToPayload(
  f: ReportFormState,
  intent: "DRAFT" | "COMPLETED",
  extras: { clientRequestId?: string; expectedUpdatedAt?: string } = {},
): ReportPayloadInput {
  return {
    intent,
    clientRequestId: extras.clientRequestId ?? null,
    expectedUpdatedAt: extras.expectedUpdatedAt ?? null,
    reportDate: f.reportDate,
    department: f.department,
    preparedByName: f.preparedByName,
    notes: f.notes,
    pendingSamples: num(f.pendingSamples),
    newSamplesReceived: num(f.newSamplesReceived),
    samplesProcessedToday: num(f.samplesProcessedToday),
    completedDispatched: num(f.completedDispatched),
    totalUnderProcessing: num(f.totalUnderProcessing),
    sampleQuality: f.sampleQuality,
    sopCriteriaMet: yn(f.sopCriteriaMet),
    samplesGoodCondition: yn(f.samplesGoodCondition),
    conditionDetails: f.conditionDetails,
    pickupByGvblStaff: yn(f.pickupByGvblStaff),
    pickupBy: f.pickupBy,
    activities: f.activities as ReportPayloadInput["activities"],
    otherActivity: f.otherActivity,
    invoiceStatus: f.invoiceStatus === "" ? null : f.invoiceStatus,
    invoiceRemarks: f.invoiceRemarks,
    stockUpdated: f.stockUpdated,
    reagentsReceived: f.reagentsReceived,
    lowStockAlert: f.lowStockAlert,
    inventoryRemarks: f.inventoryRemarks,
    sequencingPlatform: f.sequencingPlatform,
    runId: f.runId,
    flowCellId: f.flowCellId,
    samplesSentForSequencing: f.samplesSentForSequencing,
    workSummary: f.workSummary,
    issuesStatus: f.issuesStatus === "" ? null : f.issuesStatus,
    issueDetails: f.issueDetails,
    pendingWork: f.pendingWork,
    additionalComments: f.additionalComments,
    preparedSignature: f.preparedSignature,
    preparedAt: f.preparedAt ? fromDateTimeLocalValue(f.preparedAt) : null,
    samples: f.samples
      .filter((r) => !isBlankRow(r))
      .map(({ key: _key, ...r }) => ({
        ...r,
        sampleType: (r.sampleType || null) as NonNullable<ReportPayloadInput["samples"]>[number]["sampleType"],
        currentStatus: (r.currentStatus || null) as NonNullable<ReportPayloadInput["samples"]>[number]["currentStatus"],
      })),
    kits: f.kits.filter((r) => !isBlankRow(r)).map(({ key: _key, ...r }) => r),
    consumables: f.consumables.filter((r) => !isBlankRow(r)).map(({ key: _key, ...r }) => r),
  };
}

/**
 * Validation paths refer to the filtered payload rows. This maps e.g. "samples.2.sampleId"
 * back to the row key used in the form so the error shows beside the right input.
 */
export function payloadRowKeyMap(f: ReportFormState): Record<"samples" | "kits" | "consumables", string[]> {
  return {
    samples: f.samples.filter((r) => !isBlankRow(r)).map((r) => r.key),
    kits: f.kits.filter((r) => !isBlankRow(r)).map((r) => r.key),
    consumables: f.consumables.filter((r) => !isBlankRow(r)).map((r) => r.key),
  };
}
