"use client";

import { useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { downloadFile, errorMessage } from "@/lib/client-api";

const pdfUrl = (id: string, params = "") => `/api/reports/${id}/pdf${params}`;

export function useReportPdf() {
  const toast = useToast();
  const [busy, setBusy] = useState<null | string>(null);

  /** Generate PDF: renders from the database and opens it in a new tab. */
  const generate = (id: string) => {
    const win = window.open(pdfUrl(id), "_blank", "noopener");
    if (!win) toast.info("Pop-up blocked", "Allow pop-ups for this site, or use Download PDF.");
  };

  const download = async (id: string, reportNo: string) => {
    setBusy(`download:${id}`);
    try {
      const name = await downloadFile(pdfUrl(id, "?download=1"), {}, `${reportNo}.pdf`);
      toast.success("PDF downloaded", name);
    } catch (e) {
      toast.error("PDF could not be generated", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  /** Print Report: prints the same A4 PDF in a hidden frame so the layout matches exactly. */
  const print = async (id: string) => {
    setBusy(`print:${id}`);
    try {
      const res = await fetch(pdfUrl(id, "?purpose=print"), { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const blobUrl = URL.createObjectURL(await res.blob());
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
      frame.src = blobUrl;
      frame.onload = () => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch {
          window.open(blobUrl, "_blank");
        }
        setTimeout(() => {
          frame.remove();
          URL.revokeObjectURL(blobUrl);
        }, 60_000);
      };
      document.body.appendChild(frame);
    } catch (e) {
      toast.error("Could not prepare the report for printing", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return { busy, generate, download, print };
}

export function PdfButtons({ id, reportNo }: { id: string; reportNo: string }) {
  const { busy, generate, download, print } = useReportPdf();
  return (
    <>
      <Button variant="blue" onClick={() => generate(id)} icon={<FileText className="h-4 w-4" />}>
        Generate PDF
      </Button>
      <Button
        variant="outline"
        onClick={() => download(id, reportNo)}
        loading={busy === `download:${id}`}
        icon={<Download className="h-4 w-4" />}
      >
        Download PDF
      </Button>
      <Button variant="outline" onClick={() => print(id)} loading={busy === `print:${id}`} icon={<Printer className="h-4 w-4" />}>
        Print Report
      </Button>
    </>
  );
}
