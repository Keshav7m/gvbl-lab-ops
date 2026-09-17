/**
 * Terminology and option lists taken from the paper "Daily Laboratory Operations Report".
 * This file is imported by both the browser and the server, so keep it free of secrets.
 */

export const ORG = {
  name: "GENOMIC VALLEY BHARAT PVT. LTD.",
  displayName: "Genomic Valley Bharat Pvt. Ltd.",
  shortName: "GVBL",
  tagline: "Where Health Meets Innovation",
  defaultDepartment: "NGS Laboratory",
  reportTitle: "DAILY LABORATORY OPERATIONS REPORT",
  footerNote: "Note: Ensure all information is accurate and up to date.",
} as const;

export const SAMPLE_TYPES = ["DNA", "RNA", "cfDNA", "FFPE", "Other"] as const;
export type SampleType = (typeof SAMPLE_TYPES)[number];

export const SAMPLE_STATUSES = ["Received", "QC", "Extraction", "Library", "Sequencing", "Completed"] as const;
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export const LAB_ACTIVITIES = [
  { key: "DNA_EXTRACTION", label: "DNA Extraction" },
  { key: "RNA_EXTRACTION", label: "RNA Extraction" },
  { key: "CFDNA_FFPE_EXTRACTION", label: "cfDNA / FFPE Extraction" },
  { key: "QC_QUBIT_NANODROP", label: "QC (Qubit / NanoDrop)" },
  { key: "LIBRARY_PREPARATION", label: "Library Preparation" },
  { key: "LIBRARY_QC", label: "Library QC (Bioanalyzer / TapeStation)" },
  { key: "POOLING_NORMALIZATION", label: "Pooling / Normalization" },
  { key: "SEQUENCING", label: "Sequencing" },
  { key: "DISPATCH_FOR_SEQUENCING", label: "Dispatch for Sequencing" },
  { key: "OTHER", label: "Other" },
] as const;
export type ActivityKey = (typeof LAB_ACTIVITIES)[number]["key"];
export const ACTIVITY_KEYS = LAB_ACTIVITIES.map((a) => a.key) as unknown as [ActivityKey, ...ActivityKey[]];

export function activityLabel(key: string): string {
  return LAB_ACTIVITIES.find((a) => a.key === key)?.label ?? key;
}

export function formatActivities(keys: string[], other?: string | null): string {
  return keys
    .map((k) => (k === "OTHER" ? (other ? `Other: ${other}` : "Other") : activityLabel(k)))
    .join(", ");
}

export const SAMPLE_QUALITY_OPTIONS = ["Good", "Acceptable", "Poor", "Mixed", "Not Applicable"] as const;

/** Suggestions only — the Platform field accepts any value. */
export const SEQUENCING_PLATFORMS = [
  "Illumina NovaSeq X",
  "Illumina NovaSeq 6000",
  "Illumina NextSeq 2000",
  "Illumina NextSeq 550",
  "Illumina MiSeq",
  "Illumina iSeq 100",
  "MGI DNBSEQ-G400",
  "MGI DNBSEQ-T7",
  "Ion Torrent Genexus",
  "Oxford Nanopore PromethION",
  "PacBio Revio",
] as const;

export const REPORT_STATUSES = ["DRAFT", "COMPLETED", "VERIFIED"] as const;
export type ReportStatusKey = (typeof REPORT_STATUSES)[number];
export const REPORT_STATUS_LABELS: Record<ReportStatusKey, string> = {
  DRAFT: "Draft",
  COMPLETED: "Completed",
  VERIFIED: "Verified",
};

export const PICKUP_LABEL = "Sample pickup by GVBL Staff";

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE", "RESTORE", "VERIFY", "EXPORT", "PDF_GENERATED"] as const;

export const AUDIT_ACTION_LABELS: Record<(typeof AUDIT_ACTIONS)[number], string> = {
  CREATE: "Report created",
  UPDATE: "Report updated",
  DELETE: "Report deleted",
  RESTORE: "Report restored",
  VERIFY: "Report verified",
  EXPORT: "Excel export",
  PDF_GENERATED: "PDF generated",
};
export type AuditActionKey = (typeof AUDIT_ACTIONS)[number];
