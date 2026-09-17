/**
 * Generates the A4 PDF version of a Daily Laboratory Operations Report with PDFKit.
 *
 * The layout follows the paper form: logo + company masthead with Report No./Date/Day box,
 * the slanted title banner, Department/Prepared By/Notes strip, then numbered sections
 * (3 & 4 and 7 & 8 side by side, as on the scanned sheet). Tables continue on new pages
 * with their header row repeated; long free text flows across pages; every page gets a
 * footer with page numbers, and pages after the first get a compact running header.
 */
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { LAB_ACTIVITIES, ORG, PICKUP_LABEL, REPORT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { SerializedReport } from "@/types/report";

type Doc = PDFKit.PDFDocument;
type FontKind = "regular" | "semibold" | "bold" | "italic";

const COLOR = {
  primary: "#5B2A86",
  tint: "#F4EEFA",
  zebra: "#FBF9FD",
  border: "#CDBFDF",
  rule: "#E4DDEC",
  ink: "#231C2E",
  soft: "#4A4458",
  muted: "#6F6A7C",
  white: "#FFFFFF",
  alert: "#A3261B",
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 36;
const CW = PAGE_W - M * 2;
const TOP_CONTINUED = 66;
const BOTTOM_MARGIN = 54;
const LIMIT = PAGE_H - BOTTOM_MARGIN;
const GAP = 10;
const PILL_H = 17;
const PAD = 9;

interface Block {
  height: (w: number) => number;
  draw: (x: number, y: number, w: number, h: number) => void;
}

function fontFiles() {
  const dir = path.join(process.cwd(), "assets", "fonts");
  const files = {
    regular: path.join(dir, "IBMPlexSans-Regular.ttf"),
    semibold: path.join(dir, "IBMPlexSans-SemiBold.ttf"),
    bold: path.join(dir, "IBMPlexSans-Bold.ttf"),
    italic: path.join(dir, "IBMPlexSans-Italic.ttf"),
  };
  return Object.values(files).every((f) => fs.existsSync(f)) ? files : null;
}

class ReportPdf {
  private doc: Doc;
  private fonts: Record<FontKind, string>;
  private embedded: boolean;

  constructor(
    private r: SerializedReport,
    private opts: { generatedBy?: string } = {},
  ) {
    const files = fontFiles();
    this.embedded = Boolean(files);
    this.doc = new PDFDocument({
      size: "A4",
      margins: { top: M, bottom: BOTTOM_MARGIN, left: M, right: M },
      bufferPages: true,
      ...(files ? { font: files.regular } : {}),
      info: {
        Title: `${r.reportNo} — Daily Laboratory Operations Report`,
        Author: ORG.displayName,
        Subject: `${r.department} daily operations report for ${formatDate(r.reportDate)}`,
        Creator: "GVBL Lab Operations System",
      },
    });
    if (files) {
      this.doc.registerFont("Plex", files.regular);
      this.doc.registerFont("Plex-SemiBold", files.semibold);
      this.doc.registerFont("Plex-Bold", files.bold);
      this.doc.registerFont("Plex-Italic", files.italic);
      this.fonts = { regular: "Plex", semibold: "Plex-SemiBold", bold: "Plex-Bold", italic: "Plex-Italic" };
    } else {
      this.fonts = { regular: "Helvetica", semibold: "Helvetica-Bold", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" };
    }
    this.doc.on("pageAdded", () => {
      this.doc.page.margins.top = TOP_CONTINUED;
      this.doc.page.margins.bottom = BOTTOM_MARGIN;
      this.doc.x = M;
      this.doc.y = TOP_CONTINUED;
    });
  }

  // ─── primitives ────────────────────────────────────────────────────────────

  private clean(s: string): string {
    const normalised = s.replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
    // Built-in PDF fonts only cover Latin-1; embedded Plex covers far more.
    return this.embedded ? normalised : normalised.replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "?");
  }

  private font(kind: FontKind, size: number, color: string = COLOR.ink) {
    return this.doc.font(this.fonts[kind]).fontSize(size).fillColor(color);
  }

  private textHeight(s: string, width: number, kind: FontKind, size: number): number {
    this.font(kind, size);
    return this.doc.heightOfString(this.clean(s), { width, lineGap: 1 });
  }

  private write(
    s: string,
    x: number,
    y: number,
    width: number,
    kind: FontKind,
    size: number,
    color: string = COLOR.ink,
    extra: PDFKit.Mixins.TextOptions = {},
  ) {
    this.font(kind, size, color);
    this.doc.text(this.clean(s), x, y, { width, lineGap: 1, ...extra });
  }

  private ensure(h: number) {
    if (this.doc.y + h > LIMIT) this.doc.addPage();
  }

  private pill(title: string, x: number, y: number) {
    this.font("bold", 8.2);
    const w = this.doc.widthOfString(title) + 18;
    this.doc.roundedRect(x, y, w, PILL_H, 3).fill(COLOR.primary);
    this.doc.fillColor(COLOR.white).text(title, x + 9, y + 4.3, { lineBreak: false });
  }

  private checkbox(x: number, y: number, checked: boolean, label: string, width?: number) {
    const d = this.doc;
    d.lineWidth(0.8).strokeColor(checked ? COLOR.primary : COLOR.muted).rect(x, y + 1.5, 8, 8).stroke();
    if (checked) {
      d.save();
      d.lineWidth(1.5).strokeColor(COLOR.primary).moveTo(x + 1.6, y + 5.6).lineTo(x + 3.6, y + 8).lineTo(x + 7.2, y + 2.8).stroke();
      d.restore();
    }
    if (width) this.write(label, x + 12, y, width - 12, checked ? "semibold" : "regular", 8.3);
    else {
      this.font(checked ? "semibold" : "regular", 8.3);
      d.text(this.clean(label), x + 12, y, { lineBreak: false });
    }
  }

  private labelWidth(label: string, size = 8): number {
    this.font("regular", size);
    return this.doc.widthOfString(label);
  }

  private yesNo(x: number, y: number, value: boolean | null) {
    this.checkbox(x, y, value === true, "Yes");
    this.checkbox(x + 40, y, value === false, "No");
  }

  /** "Label: value" with the value wrapping in the remaining width; blank values get a writing line. */
  private fieldHeight(label: string, value: string | null | undefined, w: number): number {
    const lw = this.labelWidth(label) + 5;
    return Math.max(13, value ? this.textHeight(value, w - lw, "semibold", 8.5) : 13) + 3;
  }

  private field(label: string, value: string | null | undefined, x: number, y: number, w: number) {
    const lw = this.labelWidth(label) + 5;
    this.font("regular", 8, COLOR.muted);
    this.doc.text(label, x, y + 0.8, { lineBreak: false });
    if (value) this.write(value, x + lw, y, w - lw, "semibold", 8.5);
    else this.doc.moveTo(x + lw, y + 10).lineTo(x + w, y + 10).lineWidth(0.5).strokeColor(COLOR.rule).stroke();
  }

  private framed(title: string, measure: (cw: number) => number, render: (cx: number, cy: number, cw: number) => void): Block {
    return {
      height: (w) => PILL_H + 6 + measure(w - PAD * 2) + PAD,
      draw: (x, y, w, h) => {
        this.doc.roundedRect(x, y + PILL_H / 2, w, h - PILL_H / 2, 4).lineWidth(0.8).strokeColor(COLOR.border).stroke();
        this.pill(title, x + 8, y);
        render(x + PAD, y + PILL_H + 6, w - PAD * 2);
      },
    };
  }

  private place(blocks: Block[], ratios: number[] = [1]) {
    const gap = 12;
    const widths = ratios.map((ratio) => (CW - gap * (blocks.length - 1)) * ratio);
    const h = Math.max(...blocks.map((b, i) => b.height(widths[i])));
    this.ensure(h);
    const y = this.doc.y;
    let x = M;
    blocks.forEach((b, i) => {
      b.draw(x, y, widths[i], h);
      x += widths[i] + gap;
    });
    this.doc.x = M;
    this.doc.y = y + h + GAP;
  }

  // ─── page furniture ────────────────────────────────────────────────────────

  private masthead() {
    const d = this.doc;
    const r = this.r;
    const top = M;
    const logo = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logo)) d.image(logo, M - 4, top - 4, { width: 80, height: 80 });

    const metaW = 172;
    const metaX = PAGE_W - M - metaW;
    const nameX = M + 84;
    const nameW = metaX - nameX - 10;

    let size = 21;
    this.font("bold", size, COLOR.soft);
    while (size > 12 && d.widthOfString(ORG.name) > nameW) {
      size -= 0.5;
      d.fontSize(size);
    }
    d.text(ORG.name, nameX, top + 12, { width: nameW, lineBreak: false });

    this.font("italic", 9.5, COLOR.muted);
    const tw = d.widthOfString(ORG.tagline);
    const tx = nameX + (nameW - tw) / 2;
    const ty = top + 18 + size;
    d.text(ORG.tagline, tx, ty, { lineBreak: false });
    d.lineWidth(0.6).strokeColor(COLOR.border);
    d.moveTo(nameX + 4, ty + 6.5).lineTo(tx - 8, ty + 6.5).stroke();
    d.moveTo(tx + tw + 8, ty + 6.5).lineTo(nameX + nameW - 4, ty + 6.5).stroke();

    const rows: [string, string][] = [
      ["Report No.", r.reportNo],
      ["Date", formatDate(r.reportDate)],
      ["Day", r.day || "—"],
    ];
    const boxY = top + 4;
    d.roundedRect(metaX, boxY, metaW, 60, 4).lineWidth(0.8).strokeColor(COLOR.border).stroke();
    rows.forEach(([label, value], i) => {
      const ry = boxY + 5 + i * 18.5;
      this.font("regular", 7.5, COLOR.muted);
      d.text(label, metaX + 8, ry + 3, { lineBreak: false });
      // Values never wrap: shrink the font until it fits (long report numbers)
      const valueText = this.clean(value);
      const valueW = metaW - 58;
      let vs = 9;
      this.font("semibold", vs, COLOR.ink);
      while (vs > 6.5 && d.widthOfString(valueText) > valueW) {
        vs -= 0.25;
        d.fontSize(vs);
      }
      d.text(valueText, metaX + 52, ry + 1.8 + (9 - vs) / 2, { lineBreak: false });
      if (i < rows.length - 1) {
        d.moveTo(metaX + 6, ry + 16.5).lineTo(metaX + metaW - 6, ry + 16.5).lineWidth(0.4).strokeColor(COLOR.rule).stroke();
      }
    });

    const by = top + 82;
    const bh = 24;
    d.polygon([M + 16, by], [PAGE_W - M - 16, by], [PAGE_W - M, by + bh], [M, by + bh]).fill(COLOR.primary);
    this.font("bold", 12.5, COLOR.white);
    d.text(ORG.reportTitle, M, by + 5.5, { width: CW, align: "center", characterSpacing: 0.5, lineBreak: false });

    // Department | Prepared By | Notes
    const y = by + bh + 8;
    const cells: [string, string, number][] = [
      ["Department", r.department, 0.27],
      ["Prepared By", r.preparedByName, 0.3],
      ["Notes", r.notes ?? "", 0.43],
    ];
    const heights = cells.map(([, v, ratio]) => this.textHeight(v || "—", CW * ratio - 16, "semibold", 9));
    const h = Math.max(...heights) + 22;
    d.rect(M, y, CW, h).fill(COLOR.tint);
    let cx = M;
    cells.forEach(([label, value, ratio], i) => {
      const w = CW * ratio;
      this.write(label, cx + 8, y + 5, w - 16, "regular", 7.5, COLOR.muted);
      this.write(value || "—", cx + 8, y + 15, w - 16, "semibold", 9, value ? COLOR.ink : COLOR.muted);
      if (i > 0) d.moveTo(cx, y + 5).lineTo(cx, y + h - 5).lineWidth(0.5).strokeColor(COLOR.border).stroke();
      cx += w;
    });
    d.x = M;
    d.y = y + h + 12;
  }

  private runningHeaderAndFooters() {
    const d = this.doc;
    const r = this.r;
    const range = d.bufferedPageRange();
    const logo = path.join(process.cwd(), "public", "logo.png");
    const generated = `Generated ${formatDateTime(new Date())}${this.opts.generatedBy ? ` by ${this.opts.generatedBy}` : ""}`;
    const watermark = r.deletedAt ? "DELETED" : r.status === "DRAFT" ? "DRAFT" : null;

    for (let i = 0; i < range.count; i++) {
      d.switchToPage(range.start + i);
      const savedBottom = d.page.margins.bottom;
      d.page.margins.bottom = 0;

      if (i > 0) {
        if (fs.existsSync(logo)) d.image(logo, M - 2, 20, { width: 30, height: 30 });
        this.font("bold", 9.5, COLOR.soft);
        d.text(ORG.name, M + 32, 25, { lineBreak: false });
        this.font("regular", 7.5, COLOR.muted);
        d.text("Daily Laboratory Operations Report", M + 32, 37, { lineBreak: false });
        this.font("semibold", 9, COLOR.ink);
        d.text(r.reportNo, M, 25, { width: CW, align: "right", lineBreak: false });
        this.font("regular", 7.5, COLOR.muted);
        d.text(`${formatDate(r.reportDate)}, ${r.day}`, M, 37, { width: CW, align: "right", lineBreak: false });
        d.moveTo(M, 54).lineTo(PAGE_W - M, 54).lineWidth(1).strokeColor(COLOR.primary).stroke();
      }

      const fy = PAGE_H - 38;
      d.moveTo(M, fy).lineTo(PAGE_W - M, fy).lineWidth(0.5).strokeColor(COLOR.rule).stroke();
      this.font("regular", 7, COLOR.muted);
      d.text(`${ORG.displayName}  |  ${r.department}`, M, fy + 6, { width: CW / 2, lineBreak: false });
      d.text(generated, M, fy + 16, { width: CW * 0.7, lineBreak: false });
      this.font("semibold", 7.5, COLOR.soft);
      d.text(`${r.reportNo}  |  ${REPORT_STATUS_LABELS[r.status]}`, M, fy + 6, { width: CW, align: "right", lineBreak: false });
      this.font("regular", 7.5, COLOR.muted);
      d.text(`Page ${i + 1} of ${range.count}`, M, fy + 16, { width: CW, align: "right", lineBreak: false });

      if (watermark) {
        d.save();
        d.rotate(-35, { origin: [PAGE_W / 2, PAGE_H / 2] });
        d.fillOpacity(0.06);
        this.font("bold", 110, r.deletedAt ? COLOR.alert : COLOR.primary);
        d.text(watermark, 0, PAGE_H / 2 - 60, { width: PAGE_W, align: "center", lineBreak: false });
        d.restore();
      }
      d.page.margins.bottom = savedBottom;
    }
  }

  // ─── sections ──────────────────────────────────────────────────────────────

  private sampleSummary(): Block {
    const r = this.r;
    const items: [string, string | number | null][] = [
      ["Pending Samples", r.pendingSamples],
      ["New Samples Received", r.newSamplesReceived],
      ["Samples Processed Today", r.samplesProcessedToday],
      ["Completed / Dispatched", r.completedDispatched],
      ["Total Under Processing", r.totalUnderProcessing],
      ["Sample Quality", r.sampleQuality],
    ];
    const labelH = (cw: number) => Math.max(...items.map(([l]) => this.textHeight(l, cw / 6 - 8, "semibold", 7.5)));
    return this.framed(
      "1. SAMPLE SUMMARY",
      (cw) => labelH(cw) + 22,
      (cx, cy, cw) => {
        const cellW = cw / 6;
        const lh = labelH(cw);
        items.forEach(([label, value], i) => {
          const x = cx + i * cellW;
          this.write(label, x + 4, cy, cellW - 8, "semibold", 7.5, COLOR.soft, { align: "center" });
          const has = value !== null && value !== "";
          const isText = typeof value === "string";
          this.write(has ? String(value) : "—", x + 4, cy + lh + (isText ? 5 : 2), cellW - 8, "bold", isText ? 10 : 14, has ? COLOR.primary : COLOR.muted, {
            align: "center",
          });
          if (i > 0) this.doc.moveTo(x, cy).lineTo(x, cy + lh + 20).lineWidth(0.5).strokeColor(COLOR.rule).stroke();
        });
      },
    );
  }

  private table(title: string, columns: { header: string; sub?: string; ratio: number }[], rows: string[][], emptyText: string) {
    const d = this.doc;
    const widths = columns.map((c) => c.ratio * CW);
    const pad = 5;
    const size = 8;

    const headerHeight = Math.max(
      ...columns.map(
        (c, i) =>
          this.textHeight(c.header, widths[i] - pad * 2, "semibold", 8) +
          (c.sub ? this.textHeight(c.sub, widths[i] - pad * 2, "regular", 6.5) + 1 : 0),
      ),
    ) + pad * 2;
    const rowHeights = rows.map(
      (row) => Math.max(10, ...row.map((cell, i) => this.textHeight(cell || "—", widths[i] - pad * 2, "regular", size))) + pad * 2,
    );

    const grid = (y: number, h: number) => {
      d.lineWidth(0.6).strokeColor(COLOR.border).rect(M, y, CW, h).stroke();
      let x = M;
      widths.slice(0, -1).forEach((w) => {
        x += w;
        d.moveTo(x, y).lineTo(x, y + h).stroke();
      });
    };
    const drawHeader = () => {
      const y = d.y;
      d.rect(M, y, CW, headerHeight).fill(COLOR.tint);
      let x = M;
      columns.forEach((c, i) => {
        const hh = this.textHeight(c.header, widths[i] - pad * 2, "semibold", 8);
        this.write(c.header, x + pad, y + pad, widths[i] - pad * 2, "semibold", 8, COLOR.primary, { align: "center" });
        if (c.sub) this.write(c.sub, x + pad, y + pad + hh + 1, widths[i] - pad * 2, "regular", 6.5, COLOR.muted, { align: "center" });
        x += widths[i];
      });
      grid(y, headerHeight);
      d.y = y + headerHeight;
    };

    this.ensure(PILL_H + 6 + headerHeight + (rowHeights[0] ?? 22));
    this.pill(title, M, d.y);
    d.y += PILL_H + 5;
    drawHeader();

    if (!rows.length) {
      const y = d.y;
      this.write(emptyText, M + pad, y + 6, CW - pad * 2, "italic", 8, COLOR.muted, { align: "center" });
      d.lineWidth(0.6).strokeColor(COLOR.border).rect(M, y, CW, 22).stroke();
      d.y = y + 22;
    }

    rows.forEach((row, ri) => {
      const rh = rowHeights[ri];
      if (d.y + rh > LIMIT) {
        d.addPage();
        this.font("semibold", 8, COLOR.primary);
        d.text(`${title} (continued)`, M, d.y, { lineBreak: false });
        d.y += 14;
        drawHeader();
      }
      const y = d.y;
      if (ri % 2 === 1) d.rect(M, y, CW, rh).fill(COLOR.zebra);
      let x = M;
      row.forEach((cell, i) => {
        this.write(cell || "—", x + pad, y + pad, widths[i] - pad * 2, "regular", size, cell ? COLOR.ink : COLOR.muted);
        x += widths[i];
      });
      grid(y, rh);
      d.y = y + rh;
    });
    d.x = M;
    d.y += GAP + 2;
  }

  private sampleDetails() {
    const rows = this.r.samples.map((s, i) => {
      const coordination = [
        s.receivedFrom && `Received From: ${s.receivedFrom}`,
        s.sentTo && `Sent To: ${s.sentTo}`,
        s.coordinatedBy && `Coordinated By: ${s.coordinatedBy}`,
        s.remarks && `Remarks: ${s.remarks}`,
      ]
        .filter(Boolean)
        .join("\n");
      const type = s.sampleType === "Other" && s.sampleTypeOther ? `Other (${s.sampleTypeOther})` : s.sampleType;
      return [String(i + 1), s.sampleId, s.projectInstitute, type, s.currentStatus, coordination];
    });
    this.table(
      `2. SAMPLE DETAILS${rows.length ? ` (${rows.length})` : ""}`,
      [
        { header: "#", ratio: 0.045 },
        { header: "Sample ID", ratio: 0.14 },
        { header: "Project / Institute", ratio: 0.18 },
        { header: "Sample Type", sub: "DNA / RNA / cfDNA / FFPE / Other", ratio: 0.13 },
        { header: "Current Status", sub: "Received / QC / Extraction / Library / Sequencing / Completed", ratio: 0.145 },
        { header: "Sample Coordination", sub: "Received From / Sent To / Coordinated By / Remarks", ratio: 0.36 },
      ],
      rows,
      "No samples recorded for this report.",
    );
  }

  private sampleQuality(): Block {
    const r = this.r;
    const rowH = 16;
    return this.framed(
      "3. SAMPLE QUALITY",
      (cw) => rowH * 3 + this.fieldHeight("If No:", r.conditionDetails, cw) + this.fieldHeight("Pickup by:", r.pickupBy, cw) + 4,
      (cx, cy, cw) => {
        const yesX = cx + cw - 72;
        let y = cy;
        this.write("SOP criteria met?", cx, y, yesX - cx - 6, "regular", 8.3);
        this.yesNo(yesX, y, r.sopCriteriaMet);
        y += rowH;
        this.write("Samples in good condition?", cx, y, yesX - cx - 6, "regular", 8.3);
        this.yesNo(yesX, y, r.samplesGoodCondition);
        y += rowH;
        this.field("If No:", r.conditionDetails, cx, y, cw);
        y += this.fieldHeight("If No:", r.conditionDetails, cw) + 4;
        this.write(PICKUP_LABEL, cx, y, yesX - cx - 6, "regular", 8.3);
        this.yesNo(yesX, y, r.pickupByGvblStaff);
        y += rowH;
        this.field("Pickup by:", r.pickupBy, cx, y, cw);
      },
    );
  }

  private activities(): Block {
    const r = this.r;
    const left = LAB_ACTIVITIES.slice(0, 5);
    const right = LAB_ACTIVITIES.slice(5);
    const leftRatio = 0.44;
    const rowHeights = (cw: number) =>
      left.map((a, i) => {
        const b = right[i];
        const rightLabel = b.key === "OTHER" ? "Other (Specify)" : b.label;
        return (
          Math.max(
            this.textHeight(a.label, cw * leftRatio - 14, "semibold", 8.3),
            this.textHeight(rightLabel, cw * (1 - leftRatio) - 14, "semibold", 8.3),
          ) + 5
        );
      });
    const otherH = (cw: number) => (r.activities.includes("OTHER") ? this.fieldHeight("Specify:", r.otherActivity, cw) + 2 : 0);
    return this.framed(
      "4. LABORATORY ACTIVITIES (✓)".replace("✓", this.embedded ? "✓" : "tick"),
      (cw) => rowHeights(cw).reduce((a, b) => a + b, 0) + otherH(cw),
      (cx, cy, cw) => {
        const hs = rowHeights(cw);
        let y = cy;
        left.forEach((a, i) => {
          const b = right[i];
          this.checkbox(cx, y, r.activities.includes(a.key), a.label, cw * leftRatio - 4);
          this.checkbox(cx + cw * leftRatio, y, r.activities.includes(b.key), b.key === "OTHER" ? "Other (Specify)" : b.label, cw * (1 - leftRatio));
          y += hs[i];
        });
        if (r.activities.includes("OTHER")) this.field("Specify:", r.otherActivity, cx, y, cw);
      },
    );
  }

  private invoice(): Block {
    const r = this.r;
    return this.framed(
      "7. INVOICE UPDATE",
      (cw) => 17 + this.fieldHeight("Remarks / Details:", r.invoiceRemarks, cw),
      (cx, cy, cw) => {
        this.checkbox(cx, cy, r.invoiceStatus === "UPDATED", "Invoice Updated");
        this.checkbox(cx + 110, cy, r.invoiceStatus === "NONE", "None");
        this.field("Remarks / Details:", r.invoiceRemarks, cx, cy + 17, cw);
      },
    );
  }

  private inventory(): Block {
    const r = this.r;
    const boxes: [string, boolean][] = [
      ["Stock Updated", r.stockUpdated],
      ["Reagents Received", r.reagentsReceived],
      ["Low Stock Alert", r.lowStockAlert],
    ];
    const layout = (cw: number) => {
      let x = 0;
      let line = 0;
      return boxes.map(([label]) => {
        this.font("semibold", 8.3);
        const w = this.doc.widthOfString(label) + 26;
        if (x > 0 && x + w > cw) {
          x = 0;
          line++;
        }
        const pos = { x, line };
        x += w;
        return pos;
      });
    };
    return this.framed(
      "8. INVENTORY / STOCK UPDATE",
      (cw) => (Math.max(...layout(cw).map((p) => p.line)) + 1) * 16 + 1 + this.fieldHeight("Remarks / Items:", r.inventoryRemarks, cw),
      (cx, cy, cw) => {
        const pos = layout(cw);
        boxes.forEach(([label, checked], i) => {
          const color = label === "Low Stock Alert" && checked ? COLOR.alert : undefined;
          this.checkbox(cx + pos[i].x, cy + pos[i].line * 16, checked, label);
          if (color) this.doc.fillColor(COLOR.ink);
        });
        const lines = Math.max(...pos.map((p) => p.line)) + 1;
        this.field("Remarks / Items:", r.inventoryRemarks, cx, cy + lines * 16 + 1, cw);
      },
    );
  }

  private sequencing(): Block {
    const r = this.r;
    const pairs: [string, string | null][][] = [
      [
        ["Platform:", r.sequencingPlatform],
        ["Run ID / Batch No.:", r.runId],
      ],
      [
        ["Flow Cell / Cartridge ID:", r.flowCellId],
        ["Samples Sent for Sequencing:", r.samplesSentForSequencing],
      ],
    ];
    const rowH = (cw: number, pair: [string, string | null][]) =>
      Math.max(...pair.map(([l, v]) => this.fieldHeight(l, v, cw / 2 - 10))) + 4;
    return this.framed(
      "9. SEQUENCING DETAILS (IF APPLICABLE)",
      (cw) => pairs.reduce((sum, p) => sum + rowH(cw, p), 0),
      (cx, cy, cw) => {
        let y = cy;
        pairs.forEach((pair) => {
          pair.forEach(([l, v], i) => this.field(l, v, cx + i * (cw / 2 + 10), y, cw / 2 - 10));
          y += rowH(cw, pair);
        });
      },
    );
  }

  private issues(): Block {
    const r = this.r;
    return this.framed(
      "11. ISSUES / DEVIATIONS",
      (cw) => 17 + this.fieldHeight("Details:", r.issueDetails, cw),
      (cx, cy, cw) => {
        this.checkbox(cx, cy, r.issuesStatus === "NONE", "None");
        this.checkbox(cx + 70, cy, r.issuesStatus === "YES", "Yes (Details Below)");
        this.field("Details:", r.issueDetails, cx, cy + 17, cw);
      },
    );
  }

  /** Free-text section. Boxed when it fits on one page; otherwise flows across pages. */
  private textSection(title: string, body: string | null) {
    const d = this.doc;
    const innerW = CW - PAD * 2;
    const text = body?.trim() ? body : "";
    const th = Math.max(14, this.textHeight(text || "—", innerW, "regular", 9));
    const h = PILL_H + 6 + th + PAD;
    if (h <= LIMIT - TOP_CONTINUED) {
      const block = this.framed(title, () => th, (cx, cy, cw) => {
        if (text) this.write(text, cx, cy, cw, "regular", 9);
        else this.write("—", cx, cy, cw, "regular", 9, COLOR.muted);
      });
      this.place([block]);
      return;
    }
    this.ensure(PILL_H + 60);
    this.pill(title, M, d.y);
    d.y += PILL_H + 6;
    this.font("regular", 9, COLOR.ink);
    d.text(this.clean(text), M + PAD, d.y, { width: innerW, lineGap: 1 });
    d.x = M;
    d.y += GAP;
  }

  private signOff() {
    const r = this.r;
    const sigH = 40;
    const block = (title: string, name: string | null, sig: string | null, at: string | null, pendingNote: string | null): Block =>
      this.framed(
        title,
        (cw) => this.fieldHeight("Name:", name, cw) + sigH + 8 + 14,
        (cx, cy, cw) => {
          this.field("Name:", name, cx, cy, cw);
          const sy = cy + this.fieldHeight("Name:", name, cw) + 2;
          this.font("regular", 8, COLOR.muted);
          this.doc.text("Signature:", cx, sy + sigH / 2 - 5, { lineBreak: false });
          const sx = cx + this.labelWidth("Signature:") + 6;
          let drawn = false;
          if (sig?.startsWith("data:image/png;base64,")) {
            try {
              this.doc.image(Buffer.from(sig.split(",")[1], "base64"), sx, sy, { fit: [Math.min(150, cw - (sx - cx)), sigH], valign: "center" });
              drawn = true;
            } catch {
              drawn = false;
            }
          }
          if (!drawn) {
            if (pendingNote) this.write(pendingNote, sx, sy + sigH / 2 - 5, cw - (sx - cx), "italic", 8, COLOR.muted);
          }
          this.doc.moveTo(sx, sy + sigH).lineTo(cx + cw, sy + sigH).lineWidth(0.5).strokeColor(COLOR.rule).stroke();
          this.field("Date & Time:", at ? formatDateTime(at) : null, cx, sy + sigH + 6, cw);
        },
      );
    this.place(
      [
        block("PREPARED BY", r.preparedByName, r.preparedSignature, r.preparedAt, r.status === "DRAFT" && !r.preparedSignature ? "Draft — not yet submitted" : null),
        block("VERIFIED BY", r.verifiedByName, r.verifiedSignature, r.verifiedAt, r.status !== "VERIFIED" ? "Pending verification" : null),
      ],
      [0.5, 0.5],
    );
    this.ensure(14);
    this.write(`•  ${ORG.footerNote}`, M, this.doc.y - 2, CW, "italic", 7.5, COLOR.muted);
  }

  render(): Promise<Buffer> {
    const d = this.doc;
    const r = this.r;
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      d.on("data", (c: Buffer) => chunks.push(c));
      d.on("end", () => resolve(Buffer.concat(chunks)));
      d.on("error", reject);
      try {
        this.masthead();
        this.place([this.sampleSummary()]);
        this.sampleDetails();
        this.place([this.sampleQuality(), this.activities()], [0.45, 0.55]);
        this.table(
          "5. KITS / REAGENTS USED",
          [
            { header: "#", ratio: 0.045 },
            { header: "Kit / Reagent Name", ratio: 0.475 },
            { header: "Lot No.", ratio: 0.24 },
            { header: "Quantity Used", ratio: 0.24 },
          ],
          r.kits.map((k, i) => [String(i + 1), k.name, k.lotNo, k.quantityUsed]),
          "No kits or reagents recorded.",
        );
        this.table(
          "6. CONSUMABLES / REAGENTS RECEIVED",
          [
            { header: "#", ratio: 0.045 },
            { header: "Item / Reagent Name", ratio: 0.3 },
            { header: "Batch / Lot / Catalogue No.", ratio: 0.215 },
            { header: "Invoice Details", ratio: 0.22 },
            { header: "Supplier", ratio: 0.22 },
          ],
          r.consumables.map((c, i) => [String(i + 1), c.itemName, c.batchLotCatalogueNo, c.invoiceDetails, c.supplier]),
          "No consumables or reagents received.",
        );
        this.place([this.invoice(), this.inventory()], [0.5, 0.5]);
        this.place([this.sequencing()]);
        this.textSection("10. TODAY'S WORK STATUS", r.workSummary);
        this.place([this.issues()]);
        this.textSection("12. PENDING WORK / HANDOVER", r.pendingWork);
        this.textSection("13. ADDITIONAL COMMENTS", r.additionalComments);
        this.signOff();
        this.runningHeaderAndFooters();
        d.end();
      } catch (e) {
        reject(e);
      }
    });
  }
}

export function renderReportPdf(report: SerializedReport, opts: { generatedBy?: string } = {}): Promise<Buffer> {
  return new ReportPdf(report, opts).render();
}
