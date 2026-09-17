import type { Prisma } from "@prisma/client";

export function reportNumberPrefix(): string {
  return process.env.REPORT_NUMBER_PREFIX || "GVBL-NGS";
}

export function formatReportNumber(year: number, seq: number): string {
  return `${reportNumberPrefix()}-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Allocates the next report number for a year, e.g. GVBL-NGS-2026-0042.
 * The counter row is incremented inside the caller's transaction, so two people saving
 * at the same moment can never receive the same number (the row lock serialises them,
 * and reports.report_no is UNIQUE as a final guarantee).
 */
export async function allocateReportNumber(tx: Prisma.TransactionClient, year: number) {
  const counter = await tx.reportCounter.upsert({
    where: { year },
    create: { year, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  return { reportNo: formatReportNumber(year, counter.lastSeq), seq: counter.lastSeq };
}
