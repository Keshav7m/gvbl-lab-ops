import type { ReportStatusKey } from "@/lib/constants";

export type YesNo = "" | "YES" | "NO";

export interface SampleRow {
  key: string;
  sampleId: string;
  projectInstitute: string;
  sampleType: string;
  sampleTypeOther: string;
  currentStatus: string;
  receivedFrom: string;
  sentTo: string;
  coordinatedBy: string;
  remarks: string;
}

export interface KitRow {
  key: string;
  name: string;
  lotNo: string;
  quantityUsed: string;
}

export interface ConsumableRow {
  key: string;
  itemName: string;
  batchLotCatalogueNo: string;
  invoiceDetails: string;
  supplier: string;
}

/** Shape of the report while it is being edited in the browser (all inputs as strings). */
export interface ReportFormState {
  reportDate: string;
  department: string;
  preparedByName: string;
  notes: string;

  pendingSamples: string;
  newSamplesReceived: string;
  samplesProcessedToday: string;
  completedDispatched: string;
  totalUnderProcessing: string;
  sampleQuality: string;

  sopCriteriaMet: YesNo;
  samplesGoodCondition: YesNo;
  conditionDetails: string;
  pickupByGvblStaff: YesNo;
  pickupBy: string;

  activities: string[];
  otherActivity: string;

  invoiceStatus: "" | "UPDATED" | "NONE";
  invoiceRemarks: string;

  stockUpdated: boolean;
  reagentsReceived: boolean;
  lowStockAlert: boolean;
  inventoryRemarks: string;

  sequencingPlatform: string;
  runId: string;
  flowCellId: string;
  samplesSentForSequencing: string;

  workSummary: string;
  issuesStatus: "" | "NONE" | "YES";
  issueDetails: string;
  pendingWork: string;
  additionalComments: string;

  preparedSignature: string | null;
  preparedAt: string;

  samples: SampleRow[];
  kits: KitRow[];
  consumables: ConsumableRow[];
}

/** JSON-safe report passed from the server to client components. */
export interface SerializedReport {
  id: string;
  reportNo: string;
  status: ReportStatusKey;
  reportDate: string;
  day: string;
  department: string;
  preparedByName: string;
  notes: string | null;

  pendingSamples: number | null;
  newSamplesReceived: number | null;
  samplesProcessedToday: number | null;
  completedDispatched: number | null;
  totalUnderProcessing: number | null;
  sampleQuality: string | null;

  sopCriteriaMet: boolean | null;
  samplesGoodCondition: boolean | null;
  conditionDetails: string | null;
  pickupByGvblStaff: boolean | null;
  pickupBy: string | null;

  activities: string[];
  otherActivity: string | null;

  invoiceStatus: "UPDATED" | "NONE" | null;
  invoiceRemarks: string | null;

  stockUpdated: boolean;
  reagentsReceived: boolean;
  lowStockAlert: boolean;
  inventoryRemarks: string | null;

  sequencingPlatform: string | null;
  runId: string | null;
  flowCellId: string | null;
  samplesSentForSequencing: string | null;

  workSummary: string | null;
  issuesStatus: "NONE" | "YES" | null;
  issueDetails: string | null;
  pendingWork: string | null;
  additionalComments: string | null;

  preparedSignature: string | null;
  preparedAt: string | null;
  verifiedByName: string | null;
  verifiedSignature: string | null;
  verifiedAt: string | null;

  createdByName: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deleteReason: string | null;
  deletedByName: string | null;
  isDemo: boolean;

  samples: Omit<SampleRow, "key">[];
  kits: Omit<KitRow, "key">[];
  consumables: Omit<ConsumableRow, "key">[];
}

export interface ReportListItem {
  id: string;
  reportNo: string;
  reportDate: string;
  day: string;
  preparedByName: string;
  newSamplesReceived: number | null;
  samplesProcessedToday: number | null;
  activities: string[];
  otherActivity: string | null;
  status: ReportStatusKey;
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isDemo: boolean;
}
