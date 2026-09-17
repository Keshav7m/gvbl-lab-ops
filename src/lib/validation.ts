import { z } from "zod";
import { ACTIVITY_KEYS, SAMPLE_STATUSES, SAMPLE_TYPES } from "./constants";
import { addDays, isDateString, todayInTz } from "./dates";

/** Optional free text: trimmed, empty string becomes null. */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .nullish()
    .transform((v) => (v ? v : null));

const count = z
  .number({ invalid_type_error: "Enter a valid whole number" })
  .int("Must be a whole number")
  .min(0, "Cannot be negative")
  .max(1_000_000, "Value is too large")
  .nullish()
  .transform((v) => v ?? null);

const yesNo = z
  .enum(["YES", "NO"])
  .nullish()
  .transform((v) => v ?? null);

const signatureImage = z
  .string()
  .max(600_000, "Signature image is too large")
  .refine((v) => v.startsWith("data:image/png;base64,"), "Invalid signature image")
  .nullish()
  .transform((v) => v || null);

export const sampleRowSchema = z.object({
  sampleId: z.string().trim().min(1, "Sample ID is required").max(100, "Sample ID is too long"),
  projectInstitute: text(200),
  sampleType: z.enum(SAMPLE_TYPES).nullish().transform((v) => v ?? null),
  sampleTypeOther: text(100),
  currentStatus: z.enum(SAMPLE_STATUSES).nullish().transform((v) => v ?? null),
  receivedFrom: text(200),
  sentTo: text(200),
  coordinatedBy: text(200),
  remarks: text(1000),
});

export const kitRowSchema = z.object({
  name: z.string().trim().min(1, "Kit / Reagent name is required").max(200),
  lotNo: text(100),
  quantityUsed: text(100),
});

export const consumableRowSchema = z.object({
  itemName: z.string().trim().min(1, "Item / Reagent name is required").max(200),
  batchLotCatalogueNo: text(150),
  invoiceDetails: text(300),
  supplier: text(200),
});

export const reportSchema = z
  .object({
    intent: z.enum(["DRAFT", "COMPLETED"]),
    clientRequestId: z.string().max(100).nullish(),
    expectedUpdatedAt: z.string().nullish(),

    reportDate: z.string().refine(isDateString, "Report date is required"),
    department: z.string().trim().max(100).default("NGS Laboratory").transform((v) => v || "NGS Laboratory"),
    preparedByName: z.string().trim().min(1, "Prepared By is required").max(120),
    notes: text(1000),

    pendingSamples: count,
    newSamplesReceived: count,
    samplesProcessedToday: count,
    completedDispatched: count,
    totalUnderProcessing: count,
    sampleQuality: text(50),

    sopCriteriaMet: yesNo,
    samplesGoodCondition: yesNo,
    conditionDetails: text(2000),
    pickupByGvblStaff: yesNo,
    pickupBy: text(200),

    activities: z
      .array(z.enum(ACTIVITY_KEYS))
      .max(ACTIVITY_KEYS.length)
      .default([])
      .transform((a) => Array.from(new Set(a))),
    otherActivity: text(300),

    invoiceStatus: z.enum(["UPDATED", "NONE"]).nullish().transform((v) => v ?? null),
    invoiceRemarks: text(2000),

    stockUpdated: z.boolean().default(false),
    reagentsReceived: z.boolean().default(false),
    lowStockAlert: z.boolean().default(false),
    inventoryRemarks: text(2000),

    sequencingPlatform: text(100),
    runId: text(100),
    flowCellId: text(100),
    samplesSentForSequencing: text(1000),

    workSummary: text(20000),
    issuesStatus: z.enum(["NONE", "YES"]).nullish().transform((v) => v ?? null),
    issueDetails: text(5000),
    pendingWork: text(20000),
    additionalComments: text(5000),

    preparedSignature: signatureImage,
    preparedAt: z
      .string()
      .refine((v) => !isNaN(Date.parse(v)), "Invalid date & time")
      .nullish()
      .transform((v) => v || null),

    samples: z.array(sampleRowSchema).max(1000, "A single report can hold at most 1000 samples").default([]),
    kits: z.array(kitRowSchema).max(300).default([]),
    consumables: z.array(consumableRowSchema).max(300).default([]),
  })
  .superRefine((d, ctx) => {
    // One day of leeway for staff working across midnight / time-zone differences
    if (isDateString(d.reportDate) && d.reportDate > addDays(todayInTz(), 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reportDate"], message: "Report date cannot be in the future" });
    }

    const seen = new Map<string, number>();
    d.samples.forEach((s, i) => {
      const key = s.sampleId.trim().toUpperCase();
      if (!key) return;
      const first = seen.get(key);
      if (first !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["samples", i, "sampleId"],
          message: `Duplicate Sample ID (same as sample ${first + 1})`,
        });
      } else {
        seen.set(key, i);
      }
    });

    // Conditional fields are only enforced when the report is being completed.
    if (d.intent !== "COMPLETED") return;
    if (d.samplesGoodCondition === "NO" && !d.conditionDetails) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["conditionDetails"], message: "Give the reason / details" });
    }
    if (d.pickupByGvblStaff === "YES" && !d.pickupBy) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pickupBy"], message: "Enter who picked up the samples" });
    }
    if (d.activities.includes("OTHER") && !d.otherActivity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherActivity"], message: "Specify the other activity" });
    }
    if (d.issuesStatus === "YES" && !d.issueDetails) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["issueDetails"], message: "Describe the issue / deviation" });
    }
  });

export type ReportPayloadInput = z.input<typeof reportSchema>;
export type ReportPayload = z.output<typeof reportSchema>;

export const verifySchema = z.object({
  verifiedByName: z.string().trim().min(1, "Enter the verifier name").max(120),
  signature: signatureImage,
  confirm: z.literal(true, { errorMap: () => ({ message: "Confirm that you have reviewed the report" }) }),
});

const actorName = z.string().trim().min(2, "Enter your name").max(120);

export const deleteSchema = z.object({
  deletedByName: actorName,
  reason: z.string().trim().min(3, "Give a reason for deleting this report").max(500),
});

export const restoreSchema = z.object({
  restoredByName: actorName,
});

export function issuesToFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
