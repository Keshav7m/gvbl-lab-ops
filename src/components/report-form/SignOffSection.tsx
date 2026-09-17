"use client";

import { BadgeCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { formatDateTime, toDateTimeLocalValue } from "@/lib/dates";
import { useReportForm } from "./context";
import { SectionCard } from "./SectionCard";

export interface VerificationInfo {
  verifiedByName: string | null;
  verifiedAt: string | null;
  verifiedSignature: string | null;
}

export function SignOffSection({ verification }: { verification?: VerificationInfo | null }) {
  const { form, set, errors, disabled } = useReportForm();

  return (
    <SectionCard id="section-13" number={13} title="Additional Comments & Sign-off">
      <Field label="Additional Comments" htmlFor="additionalComments" error={errors.additionalComments}>
        <Textarea
          id="additionalComments"
          rows={3}
          value={form.additionalComments}
          onChange={(e) => set("additionalComments", e.target.value)}
          disabled={disabled}
        />
      </Field>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-rule p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-violet-800">Prepared By</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.preparedByName} readOnly disabled title="Edit in the report header" />
            </Field>
            <Field label="Date & Time" htmlFor="preparedAt" error={errors.preparedAt}>
              <div className="flex gap-2">
                <Input
                  id="preparedAt"
                  type="datetime-local"
                  value={form.preparedAt}
                  onChange={(e) => set("preparedAt", e.target.value)}
                  invalid={Boolean(errors.preparedAt)}
                  disabled={disabled}
                />
                {!disabled && (
                  <Button
                    variant="outline"
                    size="md"
                    className="px-2.5"
                    onClick={() => set("preparedAt", toDateTimeLocalValue(new Date()))}
                    title="Set to current date and time"
                    aria-label="Set to now"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Field>
          </div>
          <div className="mt-3">
            <p className="label">Signature</p>
            <SignaturePad value={form.preparedSignature} onChange={(v) => set("preparedSignature", v)} disabled={disabled} />
            {errors.preparedSignature && <p className="mt-1 text-xs text-red-600">{errors.preparedSignature}</p>}
          </div>
        </div>

        <div className="rounded-md border border-rule bg-mist/60 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-violet-800">Verified By</p>
          {verification?.verifiedAt ? (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <BadgeCheck className="h-5 w-5" /> {verification.verifiedByName}
              </p>
              <p className="text-ink-muted">{formatDateTime(verification.verifiedAt)}</p>
              {verification.verifiedSignature && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={verification.verifiedSignature} alt="Verifier signature" className="h-20 rounded border border-rule bg-white object-contain" />
              )}
              <p className="rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                Saving changes will remove this verification. The report must be verified again.
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              After saving, open the report and use Verify Report. The verifier’s name, signature and date &amp; time
              are recorded at that moment.
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
