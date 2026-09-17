import { AlertTriangle, BadgeCheck, Check } from "lucide-react";
import { LAB_ACTIVITIES, ORG, PICKUP_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/dates";
import { cn, displayValue, yesNoLabel } from "@/lib/utils";
import type { SerializedReport } from "@/types/report";

function Section({ n, title, children, className }: { n?: number; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("panel print-plain print-avoid-break overflow-hidden", className)}>
      <h2 className="section-pill mt-3">
        {n !== undefined && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-violet-800">{n}</span>
        )}
        {title}
      </h2>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Item({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{value}</dd>
    </div>
  );
}

function Tick({ on, label }: { on: boolean; label: React.ReactNode }) {
  return (
    <span className={cn("flex items-center gap-2 text-sm", on ? "font-medium text-ink" : "text-ink-faint")}>
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border-[1.5px]",
          on ? "border-violet-700 bg-violet-700 text-white" : "border-ink-faint/60",
        )}
      >
        {on && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {label}
    </span>
  );
}

const text = (v: string | null) => (v ? v : <span className="text-ink-faint">—</span>);

/** Read-only rendering of a saved report, laid out like the paper form. */
export function ReportView({ report: r }: { report: SerializedReport }) {
  return (
    <div className="space-y-5">
      {r.deletedAt && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              This report was deleted on {formatDateTime(r.deletedAt)}
              {r.deletedByName ? ` by ${r.deletedByName}` : ""}.
            </p>
            {r.deleteReason && <p>Reason: {r.deleteReason}</p>}
          </div>
        </div>
      )}

      {/* Header block */}
      <section className="panel print-plain overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule px-5 py-4">
          <div>
            <p className="text-sm font-bold tracking-wide text-violet-800">{ORG.name}</p>
            <p className="text-xs italic text-ink-muted">{ORG.tagline}</p>
          </div>
          <p className="rounded bg-violet-700 px-3 py-1 text-xs font-bold tracking-[0.08em] text-white">{ORG.reportTitle}</p>
        </div>
        <dl className="grid gap-px bg-rule sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Report No.", r.reportNo],
            ["Date", formatDate(r.reportDate)],
            ["Day", r.day],
            ["Department", r.department],
            ["Prepared By", r.preparedByName],
            ["Status", r.status === "VERIFIED" ? "Verified" : r.status === "COMPLETED" ? "Completed" : "Draft"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-4 py-3">
              <Item label={label} value={value} />
            </div>
          ))}
        </dl>
        {r.notes && (
          <div className="border-t border-rule bg-violet-50/50 px-4 py-3">
            <Item label="Notes" value={r.notes} />
          </div>
        )}
      </section>

      <Section n={1} title="Sample Summary">
        <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Item label="Pending Samples" value={<span className="tabular text-lg font-semibold">{displayValue(r.pendingSamples)}</span>} />
          <Item label="New Samples Received" value={<span className="tabular text-lg font-semibold">{displayValue(r.newSamplesReceived)}</span>} />
          <Item label="Samples Processed Today" value={<span className="tabular text-lg font-semibold">{displayValue(r.samplesProcessedToday)}</span>} />
          <Item label="Completed / Dispatched" value={<span className="tabular text-lg font-semibold">{displayValue(r.completedDispatched)}</span>} />
          <Item label="Total Under Processing" value={<span className="tabular text-lg font-semibold">{displayValue(r.totalUnderProcessing)}</span>} />
          <Item label="Sample Quality" value={<span className="text-lg font-semibold">{displayValue(r.sampleQuality)}</span>} />
        </dl>
      </Section>

      <Section n={2} title={`Sample Details (${r.samples.length})`}>
        {r.samples.length === 0 ? (
          <p className="text-sm text-ink-muted">No samples recorded.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Sample ID</th>
                  <th>Project / Institute</th>
                  <th>Sample Type</th>
                  <th>Current Status</th>
                  <th>Received From</th>
                  <th>Sent To</th>
                  <th>Coordinated By</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {r.samples.map((s, i) => (
                  <tr key={i}>
                    <td className="tabular text-ink-muted">{i + 1}</td>
                    <td className="font-semibold">{s.sampleId}</td>
                    <td>{text(s.projectInstitute)}</td>
                    <td>{s.sampleType === "Other" && s.sampleTypeOther ? `Other: ${s.sampleTypeOther}` : text(s.sampleType)}</td>
                    <td>{text(s.currentStatus)}</td>
                    <td>{text(s.receivedFrom)}</td>
                    <td>{text(s.sentTo)}</td>
                    <td>{text(s.coordinatedBy)}</td>
                    <td className="whitespace-pre-wrap">{text(s.remarks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section n={3} title="Sample Quality">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item label="Samples met SOP criteria" value={yesNoLabel(r.sopCriteriaMet)} />
            <Item label="Samples in good condition" value={yesNoLabel(r.samplesGoodCondition)} />
            {(r.samplesGoodCondition === false || r.conditionDetails) && (
              <Item label="If No, reason / details" value={text(r.conditionDetails)} className="sm:col-span-2" />
            )}
            <Item label={PICKUP_LABEL} value={yesNoLabel(r.pickupByGvblStaff)} />
            <Item label="Pickup by" value={text(r.pickupBy)} />
          </dl>
        </Section>
        <Section n={4} title="Laboratory Activities">
          <div className="grid gap-2 sm:grid-cols-2">
            {LAB_ACTIVITIES.map((a) => (
              <Tick
                key={a.key}
                on={r.activities.includes(a.key)}
                label={a.key === "OTHER" && r.otherActivity ? `Other: ${r.otherActivity}` : a.label}
              />
            ))}
          </div>
        </Section>
      </div>

      <Section n={5} title="Kits / Reagents Used">
        {r.kits.length === 0 ? (
          <p className="text-sm text-ink-muted">None recorded.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Kit / Reagent Name</th>
                  <th>Lot No.</th>
                  <th>Quantity Used</th>
                </tr>
              </thead>
              <tbody>
                {r.kits.map((k, i) => (
                  <tr key={i}>
                    <td className="tabular text-ink-muted">{i + 1}</td>
                    <td className="font-medium">{k.name}</td>
                    <td>{text(k.lotNo)}</td>
                    <td>{text(k.quantityUsed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section n={6} title="Consumables / Reagents Received">
        {r.consumables.length === 0 ? (
          <p className="text-sm text-ink-muted">None recorded.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Item / Reagent Name</th>
                  <th>Batch / Lot / Catalogue No.</th>
                  <th>Invoice Details</th>
                  <th>Supplier</th>
                </tr>
              </thead>
              <tbody>
                {r.consumables.map((c, i) => (
                  <tr key={i}>
                    <td className="tabular text-ink-muted">{i + 1}</td>
                    <td className="font-medium">{c.itemName}</td>
                    <td>{text(c.batchLotCatalogueNo)}</td>
                    <td>{text(c.invoiceDetails)}</td>
                    <td>{text(c.supplier)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section n={7} title="Invoice Update">
          <div className="flex gap-6">
            <Tick on={r.invoiceStatus === "UPDATED"} label="Invoice Updated" />
            <Tick on={r.invoiceStatus === "NONE"} label="None" />
          </div>
          <dl className="mt-4">
            <Item label="Remarks" value={text(r.invoiceRemarks)} />
          </dl>
        </Section>
        <Section n={8} title="Inventory / Stock Update">
          <div className="flex flex-wrap gap-6">
            <Tick on={r.stockUpdated} label="Stock Updated" />
            <Tick on={r.reagentsReceived} label="Reagents Received" />
            <Tick
              on={r.lowStockAlert}
              label={<span className={r.lowStockAlert ? "text-amber-700" : undefined}>Low Stock Alert</span>}
            />
          </div>
          <dl className="mt-4">
            <Item label="Remarks / Items" value={text(r.inventoryRemarks)} />
          </dl>
        </Section>
      </div>

      <Section n={9} title="Sequencing Details">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Platform" value={text(r.sequencingPlatform)} />
          <Item label="Run ID / Batch No." value={text(r.runId)} />
          <Item label="Flow Cell / Cartridge ID" value={text(r.flowCellId)} />
          <Item label="Samples Sent for Sequencing" value={text(r.samplesSentForSequencing)} />
        </dl>
      </Section>

      <Section n={10} title="Today's Work Status">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{text(r.workSummary)}</p>
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section n={11} title="Issues / Deviations">
          <div className="flex gap-6">
            <Tick on={r.issuesStatus === "NONE"} label="None" />
            <Tick on={r.issuesStatus === "YES"} label="Yes" />
          </div>
          {r.issuesStatus === "YES" && (
            <p className="mt-3 whitespace-pre-wrap rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {r.issueDetails || "—"}
            </p>
          )}
        </Section>
        <Section n={12} title="Pending Work / Handover">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{text(r.pendingWork)}</p>
        </Section>
      </div>

      <Section n={13} title="Additional Comments & Sign-off">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{text(r.additionalComments)}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-rule p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-violet-800">Prepared By</p>
            <dl className="grid grid-cols-2 gap-3">
              <Item label="Name" value={r.preparedByName} />
              <Item label="Date & Time" value={formatDateTime(r.preparedAt)} />
            </dl>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Signature</p>
            {r.preparedSignature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.preparedSignature} alt="Prepared by signature" className="mt-1 h-20 object-contain" />
            ) : (
              <p className="mt-1 text-sm text-ink-faint">Not signed</p>
            )}
          </div>
          <div className="rounded-md border border-rule p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-800">
              Verified By {r.status === "VERIFIED" && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
            </p>
            <dl className="grid grid-cols-2 gap-3">
              <Item label="Name" value={text(r.verifiedByName)} />
              <Item label="Date & Time" value={formatDateTime(r.verifiedAt)} />
            </dl>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Signature</p>
            {r.verifiedSignature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.verifiedSignature} alt="Verifier signature" className="mt-1 h-20 object-contain" />
            ) : (
              <p className="mt-1 text-sm text-ink-faint">{r.status === "VERIFIED" ? "Verified without drawn signature" : "Awaiting verification"}</p>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Created {formatDateTime(r.createdAt)} by {r.createdByName} · Last updated {formatDateTime(r.updatedAt)} by {r.updatedByName}
        </p>
      </Section>
    </div>
  );
}
