import Link from "next/link";
import type { AuditAction, Prisma } from "@prisma/client";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Audit Trail" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const TONE: Record<AuditAction, "violet" | "green" | "red" | "amber" | "neutral"> = {
  CREATE: "violet",
  UPDATE: "neutral",
  DELETE: "red",
  RESTORE: "amber",
  VERIFY: "green",
  EXPORT: "neutral",
  PDF_GENERATED: "neutral",
};

function summarise(action: AuditAction, details: Prisma.JsonValue): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const d = details as Record<string, unknown>;
  switch (action) {
    case "CREATE":
      return `Saved as ${String(d.status ?? "").toLowerCase()} · ${d.samples ?? 0} sample(s), ${d.kits ?? 0} kit(s), ${d.consumables ?? 0} consumable(s)`;
    case "UPDATE": {
      const changes = d.changes && typeof d.changes === "object" ? Object.keys(d.changes) : [];
      const status = d.statusFrom !== d.statusTo ? ` · status ${d.statusFrom} → ${d.statusTo}` : "";
      return `${changes.length} field(s) changed${changes.length ? `: ${changes.slice(0, 6).join(", ")}${changes.length > 6 ? "…" : ""}` : ""}${status}${d.verificationCleared ? " · verification cleared" : ""}`;
    }
    case "DELETE":
      return `Reason: ${d.reason ?? "—"}`;
    case "VERIFY":
      return d.signed ? "Signed" : "Verified without drawn signature";
    case "EXPORT":
      return `${d.reports ?? 0} report(s), ${d.samples ?? 0} sample row(s) · ${d.range ?? ""}${d.filters && d.filters !== "None" ? ` · ${d.filters}` : ""}`;
    case "PDF_GENERATED":
      return `Purpose: ${d.purpose ?? "view"}`;
    default:
      return "";
  }
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string; q?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const action = (AUDIT_ACTIONS as readonly string[]).includes(sp.action ?? "") ? (sp.action as AuditAction) : undefined;
  const q = sp.q?.trim().slice(0, 100);

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(q
      ? {
          OR: [
            { reportNo: { contains: q, mode: "insensitive" } },
            { actorName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    return `/audit${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Record of every change"
        title="Audit Trail"
        description="Every report created, updated, verified, deleted or restored, and every PDF and Excel export. Entries cannot be edited."
      />

      <form className="panel mb-4 flex flex-wrap items-end gap-3 p-4" method="get">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="label">
            Report No. or name
          </label>
          <input id="q" name="q" defaultValue={q} className="control" placeholder="e.g. GVBL-NGS-2026-0012 or Parag" />
        </div>
        <div className="w-52">
          <label htmlFor="action" className="label">
            Action
          </label>
          <select id="action" name="action" defaultValue={action ?? ""} className="control">
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-10 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800">
          Filter
        </button>
        {(action || q) && (
          <Link href="/audit" className="h-10 px-2 text-sm font-medium leading-10 text-ink-muted hover:text-violet-700">
            Reset
          </Link>
        )}
      </form>

      <div className="panel overflow-hidden">
        {logs.length === 0 ? (
          <EmptyState icon={<ScrollText className="h-6 w-6" />} title="No audit entries" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Report</th>
                  <th>By</th>
                  <th>Details</th>
                  <th>IP address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-xs text-ink-muted">{formatDateTime(log.createdAt)}</td>
                    <td>
                      <Badge tone={TONE[log.action]}>{AUDIT_ACTION_LABELS[log.action]}</Badge>
                    </td>
                    <td className="whitespace-nowrap">
                      {log.reportNo && log.entityId ? (
                        <Link href={`/reports/${log.entityId}`} className="font-medium text-violet-800 hover:underline">
                          {log.reportNo}
                        </Link>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td>{log.actorName}</td>
                    <td className="max-w-md text-xs text-ink-soft">{summarise(log.action, log.details)}</td>
                    <td className="tabular text-xs text-ink-faint">{log.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-rule px-4 py-3 text-sm text-ink-muted">
            <span>
              Page {page} of {pageCount} · {total} entries
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <LinkButton href={link(page - 1)} variant="outline" size="sm">
                  Previous
                </LinkButton>
              )}
              {page < pageCount && (
                <LinkButton href={link(page + 1)} variant="outline" size="sm">
                  Next
                </LinkButton>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
