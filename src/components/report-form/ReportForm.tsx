"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Save, FileClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiRequest, ClientApiError, type ApiIssue } from "@/lib/client-api";
import { formatDateTime } from "@/lib/dates";
import { uid } from "@/lib/ids";
import { emptyConsumable, emptyKit, emptySample, formStateToPayload, payloadRowKeyMap } from "@/lib/report-mapper";
import { reportSchema } from "@/lib/validation";
import type { ReportFormState, SerializedReport } from "@/types/report";
import { ActivitiesSection } from "./ActivitiesSection";
import { ConsumablesSection } from "./ConsumablesSection";
import { cellErrorKey, ReportFormContext, type ReportFormApi, type TableName } from "./context";
import { HeaderSection } from "./HeaderSection";
import { InventorySection } from "./InventorySection";
import { InvoiceSection } from "./InvoiceSection";
import { KitsSection } from "./KitsSection";
import { SampleDetailsSection } from "./SampleDetailsSection";
import { SampleQualitySection } from "./SampleQualitySection";
import { SampleSummarySection } from "./SampleSummarySection";
import { SequencingSection } from "./SequencingSection";
import { SignOffSection, type VerificationInfo } from "./SignOffSection";
import { IssuesSection, PendingWorkSection, WorkStatusSection } from "./TextSections";

interface ExistingReportMeta {
  id: string;
  reportNo: string;
  status: SerializedReport["status"];
  updatedAt: string;
  verification: VerificationInfo | null;
}

interface ReportFormProps {
  initial: ReportFormState;
  existing?: ExistingReportMeta;
}

const EMPTY_ROW = { samples: emptySample, kits: emptyKit, consumables: emptyConsumable } as const;

/** Converts validation paths ("samples.2.sampleId") into form error keys. */
function mapIssues(issues: ApiIssue[], form: ReportFormState): Record<string, string> {
  const keyMap = payloadRowKeyMap(form);
  const out: Record<string, string> = {};
  for (const { path, message } of issues) {
    const [head, index, field] = path.split(".");
    let key = path;
    if ((head === "samples" || head === "kits" || head === "consumables") && index !== undefined) {
      const rowKey = keyMap[head][Number(index)];
      key = rowKey && field ? cellErrorKey(head, rowKey, field) : head;
    }
    if (!out[key]) out[key] = message;
  }
  return out;
}

function scrollToFirstError() {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if ("focus" in el) setTimeout(() => el.focus({ preventScroll: true }), 300);
  });
}

export function ReportForm({ initial, existing }: ReportFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<ReportFormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<null | "DRAFT" | "COMPLETED">(null);
  const [dirty, setDirty] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(existing?.updatedAt ?? null);

  const savingRef = useRef(false);
  const updatedAtRef = useRef<string | undefined>(existing?.updatedAt);
  const clientRequestId = useRef(uid());
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const markDirty = useCallback(() => setDirty(true), []);

  const clearError = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const api = useMemo<ReportFormApi>(
    () => ({
      form,
      errors,
      disabled: saving !== null,
      set: (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        clearError(key as string);
        markDirty();
      },
      updateRow: (table, key, patch) => {
        setForm((f) => ({
          ...f,
          [table]: (f[table] as { key: string }[]).map((r) => (r.key === key ? { ...r, ...patch } : r)),
        }));
        Object.keys(patch).forEach((field) => clearError(cellErrorKey(table, key, field)));
        markDirty();
      },
      addRow: (table: TableName) => {
        setForm((f) => ({ ...f, [table]: [...f[table], EMPTY_ROW[table]()] }));
        markDirty();
      },
      removeRow: (table, key) => {
        setForm((f) => ({ ...f, [table]: (f[table] as { key: string }[]).filter((r) => r.key !== key) }));
        markDirty();
      },
      moveRow: (table, key, direction) => {
        setForm((f) => {
          const rows = [...(f[table] as { key: string }[])];
          const i = rows.findIndex((r) => r.key === key);
          const j = i + direction;
          if (i < 0 || j < 0 || j >= rows.length) return f;
          [rows[i], rows[j]] = [rows[j], rows[i]];
          return { ...f, [table]: rows };
        });
        markDirty();
      },
    }),
    [form, errors, saving, clearError, markDirty],
  );

  // Warn before closing the tab or following an in-app link with unsaved changes.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!window.confirm("You have unsaved changes in this report. Leave the page and discard them?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const save = async (intent: "DRAFT" | "COMPLETED") => {
    if (savingRef.current) return; // double-click protection
    setBannerError(null);

    const payload = formStateToPayload(form, intent, {
      clientRequestId: existing ? undefined : clientRequestId.current,
      expectedUpdatedAt: updatedAtRef.current,
    });

    const check = reportSchema.safeParse(payload);
    if (!check.success) {
      const mapped = mapIssues(
        check.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        form,
      );
      setErrors(mapped);
      toast.error("Report not saved", `${Object.keys(mapped).length} field(s) need attention.`);
      scrollToFirstError();
      return;
    }

    savingRef.current = true;
    setSaving(intent);
    try {
      const { report } = await apiRequest<{ report: SerializedReport }>(existing ? `/api/reports/${existing.id}` : "/api/reports", {
        method: existing ? "PUT" : "POST",
        json: payload,
      });
      setErrors({});
      setDirty(false);
      dirtyRef.current = false;
      updatedAtRef.current = report.updatedAt;
      setLastSavedAt(report.updatedAt);

      if (intent === "COMPLETED") {
        toast.success("Report saved successfully.", `${report.reportNo} has been stored in the database.`);
        router.push(`/reports/${report.id}`);
        router.refresh();
      } else {
        toast.success("Draft saved.", `${report.reportNo} — you can continue editing later from Report History.`);
        if (!existing) {
          router.replace(`/reports/${report.id}/edit`);
        }
        router.refresh();
      }
    } catch (e) {
      if (e instanceof ClientApiError && e.issues.length) {
        setErrors(mapIssues(e.issues, form));
        scrollToFirstError();
      }
      const message = e instanceof Error ? e.message : "The report could not be saved.";
      setBannerError(message);
      toast.error("Report not saved", message);
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <ReportFormContext.Provider value={api}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save("COMPLETED");
        }}
        className="space-y-5 pb-28"
      >
        {bannerError && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">The report was not saved.</p>
              <p className="mt-0.5">{bannerError}</p>
              <p className="mt-1 text-red-700/80">Everything you typed is still on this page.</p>
            </div>
          </div>
        )}

        <HeaderSection reportNo={existing?.reportNo} />
        <SampleSummarySection />
        <SampleDetailsSection />
        <div className="grid gap-5 xl:grid-cols-2">
          <SampleQualitySection />
          <ActivitiesSection />
        </div>
        <KitsSection />
        <ConsumablesSection />
        <div className="grid gap-5 xl:grid-cols-2">
          <InvoiceSection />
          <InventorySection />
        </div>
        <SequencingSection />
        <WorkStatusSection />
        <div className="grid gap-5 xl:grid-cols-2">
          <IssuesSection />
          <PendingWorkSection />
        </div>
        <SignOffSection verification={existing?.verification} />

        {/* Sticky save bar */}
        <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-white/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="text-xs text-ink-muted">
              {errorCount > 0 ? (
                <span className="flex items-center gap-1.5 font-semibold text-red-600">
                  <AlertTriangle className="h-4 w-4" /> {errorCount} field(s) need attention
                </span>
              ) : dirty ? (
                <span className="flex items-center gap-1.5 font-medium text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Unsaved changes
                </span>
              ) : lastSavedAt ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Saved {formatDateTime(lastSavedAt)}
                </span>
              ) : (
                <span>Not saved yet</span>
              )}
            </div>
            <div className="flex flex-1 justify-end gap-2 sm:flex-none">
              <Button
                variant="outline"
                size="lg"
                onClick={() => save("DRAFT")}
                loading={saving === "DRAFT"}
                disabled={saving !== null}
                icon={<FileClock className="h-4 w-4" />}
              >
                Save as Draft
              </Button>
              <Button
                type="submit"
                size="lg"
                loading={saving === "COMPLETED"}
                disabled={saving !== null}
                icon={<Save className="h-5 w-5" />}
                className="min-w-[190px] tracking-wide"
              >
                SAVE REPORT
              </Button>
            </div>
          </div>
        </div>
      </form>
    </ReportFormContext.Provider>
  );
}
