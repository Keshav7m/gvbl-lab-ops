/**
 * Builds the multi-sheet Excel workbook with ExcelJS.
 * Every dynamic table row (samples, kits, consumables) gets its own spreadsheet row,
 * keyed by Report No. and Report Date so nothing is lost or flattened.
 */
import ExcelJS from "exceljs";
import { ORG, REPORT_STATUS_LABELS, formatActivities } from "@/lib/constants";
import { dateOnlyToDb, formatDateTime, toWallClockDate } from "@/lib/dates";
import type { SerializedReport } from "@/types/report";

type CellType = "text" | "date" | "datetime" | "number";
interface Column {
  header: string;
  key: string;
  width: number;
  type?: CellType;
  wrap?: boolean;
}

const BRAND = "FF5B2A86";
const TINT = "FFF7F3FB";
const BORDER = { style: "thin" as const, color: { argb: "FFDCCBEE" } };

const yn = (v: boolean | null) => (v === null ? "" : v ? "Yes" : "No");
const tick = (v: boolean) => (v ? "Yes" : "No");
const dt = (iso: string | null) => (iso ? toWallClockDate(new Date(iso)) : null);

function addSheet(wb: ExcelJS.Workbook, name: string, columns: Column[], rows: Record<string, unknown>[], tab: string) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1, xSplit: 1 }],
    properties: { tabColor: { argb: tab } },
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  rows.forEach((r) => ws.addRow(r));

  const header = ws.getRow(1);
  header.height = 34;
  for (let c = 1; c <= columns.length; c++) {
    const cell = header.getCell(c);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10.5 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
  }

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= columns.length; c++) {
      const col = columns[c - 1];
      const cell = row.getCell(c);
      if (col.type === "date") cell.numFmt = "dd/mm/yyyy";
      if (col.type === "datetime") cell.numFmt = "dd/mm/yyyy hh:mm AM/PM";
      cell.alignment = { vertical: "top", wrapText: Boolean(col.wrap), horizontal: col.type === "number" ? "right" : "left" };
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
      if (r % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TINT } };
    }
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

export interface ExportMeta {
  exportedBy: string;
  rangeLabel: string;
  filterSummary: string;
}

export async function buildReportsWorkbook(reports: SerializedReport[], meta: ExportMeta): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${ORG.displayName} — Lab Operations System`;
  wb.created = new Date();
  wb.title = "Daily Laboratory Operations Reports";

  addSheet(
    wb,
    "Daily Reports",
    [
      { header: "Report No.", key: "reportNo", width: 20 },
      { header: "Status", key: "status", width: 12 },
      { header: "Date", key: "date", width: 12, type: "date" },
      { header: "Day", key: "day", width: 12 },
      { header: "Department", key: "department", width: 16 },
      { header: "Prepared By", key: "preparedBy", width: 20 },
      { header: "Notes", key: "notes", width: 30, wrap: true },
      { header: "Pending Samples", key: "pending", width: 11, type: "number" },
      { header: "New Samples Received", key: "newReceived", width: 12, type: "number" },
      { header: "Samples Processed Today", key: "processed", width: 12, type: "number" },
      { header: "Completed / Dispatched", key: "completed", width: 12, type: "number" },
      { header: "Total Under Processing", key: "underProcessing", width: 12, type: "number" },
      { header: "Sample Quality", key: "quality", width: 13 },
      { header: "SOP Criteria Met", key: "sop", width: 10 },
      { header: "Samples in Good Condition", key: "goodCondition", width: 11 },
      { header: "Condition Details (If No)", key: "conditionDetails", width: 30, wrap: true },
      { header: "Pickup by GVBL Staff", key: "pickup", width: 10 },
      { header: "Pickup By", key: "pickupBy", width: 18 },
      { header: "Laboratory Activities", key: "activities", width: 42, wrap: true },
      { header: "Invoice Updated", key: "invoice", width: 11 },
      { header: "Invoice Remarks / Details", key: "invoiceRemarks", width: 30, wrap: true },
      { header: "Inventory Updated", key: "stock", width: 11 },
      { header: "Reagents Received", key: "reagentsReceived", width: 11 },
      { header: "Low Stock Alert", key: "lowStock", width: 10 },
      { header: "Inventory Remarks / Items", key: "inventoryRemarks", width: 30, wrap: true },
      { header: "Platform", key: "platform", width: 20 },
      { header: "Run ID / Batch No.", key: "runId", width: 18 },
      { header: "Flow Cell / Cartridge ID", key: "flowCell", width: 18 },
      { header: "Samples Sent for Sequencing", key: "sentForSeq", width: 22, wrap: true },
      { header: "Today's Work Summary", key: "workSummary", width: 50, wrap: true },
      { header: "Issues / Deviations", key: "issues", width: 12 },
      { header: "Issue / Deviation Details", key: "issueDetails", width: 40, wrap: true },
      { header: "Pending Work / Handover", key: "pendingWork", width: 45, wrap: true },
      { header: "Additional Comments", key: "comments", width: 40, wrap: true },
      { header: "Sample Rows", key: "sampleRows", width: 9, type: "number" },
      { header: "Prepared At", key: "preparedAt", width: 18, type: "datetime" },
      { header: "Verified By", key: "verifiedBy", width: 20 },
      { header: "Verified At", key: "verifiedAt", width: 18, type: "datetime" },
      { header: "Created By", key: "createdBy", width: 20 },
      { header: "Created At", key: "createdAt", width: 18, type: "datetime" },
      { header: "Last Updated By", key: "updatedBy", width: 20 },
      { header: "Updated At", key: "updatedAt", width: 18, type: "datetime" },
    ],
    reports.map((r) => ({
      reportNo: r.reportNo,
      status: REPORT_STATUS_LABELS[r.status],
      date: dateOnlyToDb(r.reportDate),
      day: r.day,
      department: r.department,
      preparedBy: r.preparedByName,
      notes: r.notes ?? "",
      pending: r.pendingSamples,
      newReceived: r.newSamplesReceived,
      processed: r.samplesProcessedToday,
      completed: r.completedDispatched,
      underProcessing: r.totalUnderProcessing,
      quality: r.sampleQuality ?? "",
      sop: yn(r.sopCriteriaMet),
      goodCondition: yn(r.samplesGoodCondition),
      conditionDetails: r.conditionDetails ?? "",
      pickup: yn(r.pickupByGvblStaff),
      pickupBy: r.pickupBy ?? "",
      activities: formatActivities(r.activities, r.otherActivity),
      invoice: r.invoiceStatus === "UPDATED" ? "Yes" : r.invoiceStatus === "NONE" ? "None" : "",
      invoiceRemarks: r.invoiceRemarks ?? "",
      stock: tick(r.stockUpdated),
      reagentsReceived: tick(r.reagentsReceived),
      lowStock: tick(r.lowStockAlert),
      inventoryRemarks: r.inventoryRemarks ?? "",
      platform: r.sequencingPlatform ?? "",
      runId: r.runId ?? "",
      flowCell: r.flowCellId ?? "",
      sentForSeq: r.samplesSentForSequencing ?? "",
      workSummary: r.workSummary ?? "",
      issues: r.issuesStatus === "YES" ? "Yes" : r.issuesStatus === "NONE" ? "None" : "",
      issueDetails: r.issueDetails ?? "",
      pendingWork: r.pendingWork ?? "",
      comments: r.additionalComments ?? "",
      sampleRows: r.samples.length,
      preparedAt: dt(r.preparedAt),
      verifiedBy: r.verifiedByName ?? "",
      verifiedAt: dt(r.verifiedAt),
      createdBy: r.createdByName,
      createdAt: dt(r.createdAt),
      updatedBy: r.updatedByName,
      updatedAt: dt(r.updatedAt),
    })),
    BRAND,
  );

  addSheet(
    wb,
    "Sample Details",
    [
      { header: "Report No.", key: "reportNo", width: 20 },
      { header: "Report Date", key: "date", width: 12, type: "date" },
      { header: "Sample ID", key: "sampleId", width: 18 },
      { header: "Project / Institute", key: "project", width: 32, wrap: true },
      { header: "Sample Type", key: "type", width: 14 },
      { header: "Current Status", key: "status", width: 14 },
      { header: "Received From", key: "receivedFrom", width: 24, wrap: true },
      { header: "Sent To", key: "sentTo", width: 24, wrap: true },
      { header: "Coordinated By", key: "coordinatedBy", width: 20 },
      { header: "Remarks", key: "remarks", width: 40, wrap: true },
    ],
    reports.flatMap((r) =>
      r.samples.map((s) => ({
        reportNo: r.reportNo,
        date: dateOnlyToDb(r.reportDate),
        sampleId: s.sampleId,
        project: s.projectInstitute,
        type: s.sampleType === "Other" && s.sampleTypeOther ? `Other (${s.sampleTypeOther})` : s.sampleType,
        status: s.currentStatus,
        receivedFrom: s.receivedFrom,
        sentTo: s.sentTo,
        coordinatedBy: s.coordinatedBy,
        remarks: s.remarks,
      })),
    ),
    "FF3F5BC4",
  );

  addSheet(
    wb,
    "Kits-Reagents Used",
    [
      { header: "Report No.", key: "reportNo", width: 20 },
      { header: "Report Date", key: "date", width: 12, type: "date" },
      { header: "Kit / Reagent Name", key: "name", width: 44, wrap: true },
      { header: "Lot No.", key: "lotNo", width: 18 },
      { header: "Quantity Used", key: "qty", width: 18 },
    ],
    reports.flatMap((r) =>
      r.kits.map((k) => ({ reportNo: r.reportNo, date: dateOnlyToDb(r.reportDate), name: k.name, lotNo: k.lotNo, qty: k.quantityUsed })),
    ),
    "FF8A56C2",
  );

  addSheet(
    wb,
    "Consumables-Reagents Received",
    [
      { header: "Report No.", key: "reportNo", width: 20 },
      { header: "Report Date", key: "date", width: 12, type: "date" },
      { header: "Item / Reagent Name", key: "item", width: 40, wrap: true },
      { header: "Batch / Lot / Catalogue No.", key: "batch", width: 24 },
      { header: "Invoice Details", key: "invoice", width: 30, wrap: true },
      { header: "Supplier", key: "supplier", width: 28, wrap: true },
    ],
    reports.flatMap((r) =>
      r.consumables.map((c) => ({
        reportNo: r.reportNo,
        date: dateOnlyToDb(r.reportDate),
        item: c.itemName,
        batch: c.batchLotCatalogueNo,
        invoice: c.invoiceDetails,
        supplier: c.supplier,
      })),
    ),
    "FF283B88",
  );

  const info = wb.addWorksheet("Export Info", { properties: { tabColor: { argb: "FF9A95A6" } } });
  info.columns = [
    { key: "k", width: 28 },
    { key: "v", width: 70 },
  ];
  const title = info.addRow([ORG.name]);
  title.font = { bold: true, size: 14, color: { argb: BRAND } };
  info.addRow(["Daily Laboratory Operations Reports — Excel export"]).font = { italic: true, color: { argb: "FF6F6A7C" } };
  info.addRow([]);
  const rows: [string, string | number][] = [
    ["Department", ORG.defaultDepartment],
    ["Exported by", meta.exportedBy],
    ["Exported at", formatDateTime(new Date())],
    ["Date range", meta.rangeLabel],
    ["Filters", meta.filterSummary || "None"],
    ["Reports", reports.length],
    ["Sample rows", reports.reduce((n, r) => n + r.samples.length, 0)],
    ["Kit / reagent rows", reports.reduce((n, r) => n + r.kits.length, 0)],
    ["Consumable rows", reports.reduce((n, r) => n + r.consumables.length, 0)],
  ];
  rows.forEach(([k, v]) => {
    const row = info.addRow([k, v]);
    row.getCell(1).font = { bold: true, color: { argb: "FF4A4458" } };
    row.getCell(2).alignment = { horizontal: "left", wrapText: true };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
