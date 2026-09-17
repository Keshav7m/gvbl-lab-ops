"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { useToast } from "@/components/ui/Toast";
import { apiRequest, errorMessage } from "@/lib/client-api";
import type { ReportStatusKey } from "@/lib/constants";

interface Props {
  id: string;
  reportNo: string;
  status: ReportStatusKey;
  deleted: boolean;
}

/** Verify, Delete and Restore. Each action asks for the person's name, which goes into the audit trail. */
export function ReportActions({ id, reportNo, status, deleted }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<null | "verify" | "delete" | "restore">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");

  const open = (d: NonNullable<typeof dialog>) => {
    setError(null);
    setConfirmed(false);
    setReason("");
    setSignature(null);
    setDialog(d);
  };

  const close = () => {
    if (!busy) setDialog(null);
  };

  const run = async (fn: () => Promise<unknown>, success: string, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast.success(success, reportNo);
      setDialog(null);
      if (after) after();
      else router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const nameField = (label: string) => (
    <Field label={label} htmlFor="actor-name" required>
      <Input id="actor-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
    </Field>
  );

  const errorBox = error && (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </p>
  );

  const cancel = (
    <Button variant="outline" onClick={close} disabled={busy}>
      Cancel
    </Button>
  );

  if (deleted) {
    return (
      <>
        <Button variant="secondary" onClick={() => open("restore")} icon={<RotateCcw className="h-4 w-4" />}>
          Restore Report
        </Button>
        <Modal
          open={dialog === "restore"}
          onClose={close}
          busy={busy}
          size="sm"
          title={`Restore ${reportNo}?`}
          description="The report will reappear in Report History, the dashboard and Excel exports."
          footer={
            <>
              {cancel}
              <Button
                loading={busy}
                disabled={name.trim().length < 2}
                onClick={() => run(() => apiRequest(`/api/reports/${id}/restore`, { method: "POST", json: { restoredByName: name } }), "Report restored")}
              >
                Restore
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {nameField("Your name")}
            {errorBox}
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      {status === "COMPLETED" && (
        <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => open("verify")} icon={<BadgeCheck className="h-4 w-4" />}>
          Verify Report
        </Button>
      )}
      <Button
        variant="ghost"
        className="text-red-700 hover:bg-red-50 hover:text-red-800"
        onClick={() => open("delete")}
        icon={<Trash2 className="h-4 w-4" />}
      >
        Delete
      </Button>

      <Modal
        open={dialog === "verify"}
        onClose={close}
        busy={busy}
        title={`Verify ${reportNo}`}
        description="Records who checked this report. If the report is edited later, the verification is cleared and must be repeated."
        footer={
          <>
            {cancel}
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              loading={busy}
              disabled={!confirmed || name.trim().length < 1}
              onClick={() =>
                run(
                  () => apiRequest(`/api/reports/${id}/verify`, { method: "POST", json: { verifiedByName: name, signature, confirm: confirmed } }),
                  "Report verified",
                )
              }
            >
              Verify
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {nameField("Verified By — Name")}
          <div>
            <p className="label">Signature (optional)</p>
            <SignaturePad value={signature} onChange={setSignature} />
          </div>
          <p className="text-xs text-ink-muted">Date &amp; time are recorded automatically when you click Verify.</p>
          <Checkbox checked={confirmed} onChange={setConfirmed} label="I have reviewed this report and confirm it is accurate." className="border-rule" />
          {errorBox}
        </div>
      </Modal>

      <Modal
        open={dialog === "delete"}
        onClose={close}
        busy={busy}
        title={`Delete ${reportNo}?`}
        description="The report is hidden from history, the dashboard and exports, but it is kept in the database and can be restored at any time."
        footer={
          <>
            {cancel}
            <Button
              variant="danger"
              loading={busy}
              disabled={reason.trim().length < 3 || name.trim().length < 2}
              onClick={() =>
                run(
                  () => apiRequest(`/api/reports/${id}`, { method: "DELETE", json: { reason, deletedByName: name } }),
                  "Report deleted",
                  () => {
                    router.push("/reports");
                    router.refresh();
                  },
                )
              }
            >
              Delete report
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {nameField("Your name")}
          <Field label="Reason for deletion" htmlFor="deleteReason" required hint="Recorded in the audit trail">
            <Textarea id="deleteReason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {errorBox}
        </div>
      </Modal>
    </>
  );
}
