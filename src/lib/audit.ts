import type { AuditAction, Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditEntry {
  action: AuditAction;
  /** Name of the person performing the action (there are no user accounts). */
  actorName: string | null | undefined;
  entityType: "Report" | "Export";
  entityId?: string | null;
  reportNo?: string | null;
  details?: Prisma.InputJsonValue;
  ip?: string | null;
}

export async function logAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      reportNo: entry.reportNo ?? null,
      actorName: entry.actorName?.trim() || "Laboratory user",
      details: entry.details,
      ipAddress: entry.ip ?? null,
    },
  });
}

/** Non-blocking variant for read-only events (PDF, export) — failures are logged, not thrown. */
export async function logAuditSafe(db: Db, entry: AuditEntry): Promise<void> {
  try {
    await logAudit(db, entry);
  } catch (e) {
    console.error("[audit] failed to record", entry.action, e);
  }
}

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

const SKIP_KEYS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "createdByName",
  "updatedByName",
  "clientRequestId",
  "samples",
  "kits",
  "consumables",
  "preparedSignature",
  "verifiedSignature",
]);

type Snapshotable = Record<string, unknown> & {
  reportDate: Date;
  preparedSignature: string | null;
  verifiedSignature: string | null;
  samples: Record<string, unknown>[];
  kits: Record<string, unknown>[];
  consumables: Record<string, unknown>[];
};

function stripRow(row: Record<string, unknown>) {
  const { id: _id, reportId: _reportId, position: _position, ...rest } = row;
  return rest;
}

function snapshot(r: Snapshotable): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    if (SKIP_KEYS.has(k)) continue;
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  out.reportDate = r.reportDate.toISOString().slice(0, 10);
  out.preparedSignature = r.preparedSignature ? `signature#${hashString(r.preparedSignature)}` : null;
  out.verifiedSignature = r.verifiedSignature ? `signature#${hashString(r.verifiedSignature)}` : null;
  out.samples = r.samples.map(stripRow);
  out.kits = r.kits.map(stripRow);
  out.consumables = r.consumables.map(stripRow);
  return out;
}

function brief(v: unknown): unknown {
  if (typeof v === "string" && v.length > 200) return `${v.slice(0, 199)}…`;
  return v ?? null;
}

/** Field-level differences between two versions of a report, for the audit trail. */
export function diffReports(before: Snapshotable, after: Snapshotable): Record<string, { from: unknown; to: unknown }> {
  const a = snapshot(before);
  const b = snapshot(after);
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = JSON.stringify(a[key] ?? null);
    const vb = JSON.stringify(b[key] ?? null);
    if (va === vb) continue;
    if (Array.isArray(a[key]) && ["samples", "kits", "consumables"].includes(key)) {
      const from = (a[key] as unknown[]).length;
      const to = (b[key] as unknown[]).length;
      changes[key] = { from: `${from} row(s)`, to: `${to} row(s)${from === to ? " (edited)" : ""}` };
    } else {
      changes[key] = { from: brief(a[key]), to: brief(b[key]) };
    }
  }
  return changes;
}
