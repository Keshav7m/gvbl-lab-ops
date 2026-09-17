/**
 * Seeds the database with clearly-marked DEMO reports so the dashboard, history,
 * PDF and Excel export can be tried immediately.
 *
 *   npm run db:seed          → inserts demo data (only if none exists yet)
 *   npm run db:remove-demo   → deletes every demo report and its audit entries
 *
 * Set SEED_DEMO_DATA="false" to skip. Real reports are never touched.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { formatReportNumber } from "../src/lib/report-number";
import { addDays, dateOnlyToDb, todayInTz, weekdayName } from "../src/lib/dates";

const prisma = new PrismaClient();
const DEMO_TAG = "[DEMO DATA] ";

const STAFF = ["Parag Lodhi", "Ananya Sharma", "Rohit Meena", "Kavya Rathore"];
const PROJECTS = ["RR Hospital — Oncology", "AIIMS Jodhpur — Rare Disease", "SMS Medical College", "GVBL Internal R&D", "Mahatma Gandhi Hospital"];
const TYPES = ["DNA", "RNA", "cfDNA", "FFPE"] as const;
const STATUSES = ["Received", "QC", "Extraction", "Library", "Sequencing", "Completed"] as const;
const KITS = [
  ["QIAamp DNA FFPE Tissue Kit", "24 rxn"],
  ["Qubit dsDNA HS Assay Kit", "18 assays"],
  ["Illumina DNA Prep", "16 samples"],
  ["AMPure XP Beads", "2.5 mL"],
  ["RNeasy Mini Kit", "12 rxn"],
  ["Agilent High Sensitivity D1000 ScreenTape", "8 lanes"],
];
const CONSUMABLES = [
  ["Filter tips 200 µL", "TIP-200F-96", "Thermo Fisher"],
  ["PCR 8-strip tubes", "PCR-8S-0.2", "Axygen"],
  ["Nuclease-free water 500 mL", "AM9938", "Invitrogen"],
  ["Ethanol absolute (molecular grade)", "E7023", "Sigma-Aldrich"],
];

/** Small deterministic PRNG so the demo data is the same on every machine. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function nextNumber(tx: Prisma.TransactionClient, year: number) {
  const c = await tx.reportCounter.upsert({ where: { year }, create: { year, lastSeq: 1 }, update: { lastSeq: { increment: 1 } } });
  return { reportNo: formatReportNumber(year, c.lastSeq), seq: c.lastSeq };
}

async function main() {
  if (process.env.SEED_DEMO_DATA === "false") {
    console.log("SEED_DEMO_DATA is false — nothing to seed.");
    return;
  }
  const existing = await prisma.report.count({ where: { isDemo: true } });
  if (existing > 0) {
    console.log(`Demo data already present (${existing} reports). Run "npm run db:remove-demo" first to re-seed.`);
    return;
  }

  const rand = rng(2026);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

  const today = todayInTz();
  let created = 0;
  let sampleCounter = 1000;

  // The last 24 working days up to yesterday (Sundays skipped), oldest first
  const dates: string[] = [];
  for (let back = 1; dates.length < 24; back++) {
    const d = addDays(today, -back);
    if (weekdayName(d) !== "Sunday") dates.unshift(d);
  }

  for (const [i, date] of dates.entries()) {
    const preparedBy = STAFF[i % STAFF.length];
    const sampleRows = int(1, 6);
    const received = int(0, 8);
    const processed = int(0, 10);
    const isLast = i >= dates.length - 2;
    const status = isLast ? "DRAFT" : i % 3 === 0 ? "VERIFIED" : "COMPLETED";
    const activities = ["DNA_EXTRACTION", "RNA_EXTRACTION", "CFDNA_FFPE_EXTRACTION", "QC_QUBIT_NANODROP", "LIBRARY_PREPARATION", "LIBRARY_QC", "POOLING_NORMALIZATION", "SEQUENCING", "DISPATCH_FOR_SEQUENCING"].filter(
      () => rand() > 0.55,
    );
    const hasIssue = rand() > 0.82;
    const lowStock = rand() > 0.85;
    const preparedAt = new Date(`${date}T12:00:00.000Z`); // ≈ 17:30 IST

    await prisma.$transaction(async (tx) => {
      const { reportNo, seq } = await nextNumber(tx, Number(date.slice(0, 4)));
      const report = await tx.report.create({
        data: {
          reportNo,
          reportYear: Number(date.slice(0, 4)),
          reportSeq: seq,
          status,
          reportDate: dateOnlyToDb(date),
          day: weekdayName(date),
          department: "NGS Laboratory",
          preparedByName: preparedBy,
          notes: `${DEMO_TAG}Sample record for demonstration.`,
          pendingSamples: int(2, 15),
          newSamplesReceived: received,
          samplesProcessedToday: processed,
          completedDispatched: int(0, processed),
          totalUnderProcessing: int(4, 20),
          sampleQuality: pick(["Good", "Good", "Acceptable", "Mixed"]),
          sopCriteriaMet: rand() > 0.1,
          samplesGoodCondition: !hasIssue,
          conditionDetails: hasIssue ? "One FFPE block received with insufficient tumour content; client informed." : null,
          pickupByGvblStaff: rand() > 0.5,
          pickupBy: "Rohit Meena",
          activities,
          invoiceStatus: rand() > 0.6 ? "UPDATED" : "NONE",
          invoiceRemarks: rand() > 0.6 ? "Invoice INV-2026-" + int(100, 999) + " entered in accounts register." : null,
          stockUpdated: rand() > 0.4,
          reagentsReceived: rand() > 0.7,
          lowStockAlert: lowStock,
          inventoryRemarks: lowStock ? "Qubit HS assay tubes below 50 — reorder raised." : null,
          sequencingPlatform: activities.includes("SEQUENCING") ? "Illumina NextSeq 2000" : null,
          runId: activities.includes("SEQUENCING") ? `NS2K-${date.replace(/-/g, "")}-01` : null,
          flowCellId: activities.includes("SEQUENCING") ? `P2-${int(10000, 99999)}` : null,
          samplesSentForSequencing: activities.includes("SEQUENCING") ? `${int(4, 24)} libraries pooled` : null,
          workSummary: `${DEMO_TAG}Routine processing. ${activities.length ? "Performed: " + activities.length + " activity type(s)." : "No experiment performed."}`,
          issuesStatus: hasIssue ? "YES" : "NONE",
          issueDetails: hasIssue ? "Low DNA yield for one FFPE sample (4.2 ng/µL). Re-extraction scheduled." : null,
          pendingWork: "Library QC for pending samples; update stock register.",
          additionalComments: null,
          preparedAt: status === "DRAFT" ? null : preparedAt,
          verifiedByName: status === "VERIFIED" ? "Dr. Varun" : null,
          verifiedAt: status === "VERIFIED" ? new Date(preparedAt.getTime() + 3 * 3600_000) : null,
          createdByName: preparedBy,
          updatedByName: preparedBy,
          isDemo: true,
          createdAt: preparedAt,
        },
      });

      await tx.sample.createMany({
        data: Array.from({ length: sampleRows }, (_, position) => {
          const type = pick(TYPES);
          return {
            reportId: report.id,
            position,
            sampleId: `DEMO-${type}-${++sampleCounter}`,
            projectInstitute: pick(PROJECTS),
            sampleType: type,
            currentStatus: pick(STATUSES),
            receivedFrom: pick(["RR Hospital", "AIIMS Jodhpur", "Courier — BlueDart", "Walk-in"]),
            sentTo: rand() > 0.6 ? "Sequencing core" : null,
            coordinatedBy: pick(STAFF),
            remarks: rand() > 0.7 ? "Stored at −80 °C" : null,
          };
        }),
      });
      await tx.kitReagentUsed.createMany({
        data: Array.from({ length: int(0, 3) }, (_, position) => {
          const [name, qty] = pick(KITS);
          return { reportId: report.id, position, name, lotNo: `LOT${int(100000, 999999)}`, quantityUsed: qty };
        }),
      });
      if (rand() > 0.6) {
        const [itemName, cat, supplier] = pick(CONSUMABLES);
        await tx.consumableReceived.create({
          data: { reportId: report.id, position: 0, itemName, batchLotCatalogueNo: cat, invoiceDetails: `INV-${int(1000, 9999)}`, supplier },
        });
      }
      await tx.auditLog.create({
        data: { action: "CREATE", entityType: "Report", entityId: report.id, reportNo, actorName: preparedBy, details: { demo: true, status } },
      });
    });
    created++;
  }

  // One report reproducing the scanned paper form (Report No. 25, 16/09/2026)
  const paperDate = "2026-09-16";
  if (paperDate <= addDays(today, 1)) {
    await prisma.$transaction(async (tx) => {
      const { reportNo, seq } = await nextNumber(tx, 2026);
      const report = await tx.report.create({
        data: {
          reportNo,
          reportYear: 2026,
          reportSeq: seq,
          status: "COMPLETED",
          reportDate: dateOnlyToDb(paperDate),
          day: weekdayName(paperDate),
          department: "NGS Laboratory",
          preparedByName: "PARAG LODHI",
          notes: `${DEMO_TAG}Transcribed from paper Report No. 25.`,
          pendingSamples: null,
          newSamplesReceived: null,
          samplesProcessedToday: null,
          completedDispatched: null,
          totalUnderProcessing: null,
          sampleQuality: "Not Applicable",
          activities: [],
          workSummary: "No Experiment Performed",
          issuesStatus: "NONE",
          additionalComments: "Data obtained from RR Hospital to Dr. Varun Sir",
          preparedAt: new Date(`${paperDate}T12:30:00.000Z`),
          createdByName: "PARAG LODHI",
          updatedByName: "PARAG LODHI",
          isDemo: true,
        },
      });
      await tx.auditLog.create({
        data: { action: "CREATE", entityType: "Report", entityId: report.id, reportNo, actorName: "PARAG LODHI", details: { demo: true } },
      });
    });
    created++;
  }

  console.log(`Seeded ${created} demo reports (marked "Demo"). Remove them with: npm run db:remove-demo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
