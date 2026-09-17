import "server-only";
import { notFound } from "next/navigation";
import { ApiError } from "./api-error";
import { getReport } from "./report-service";

/** Loads a report for a page, turning "not found" into the 404 page. */
export async function loadReportOr404(id: string, opts: { allowDeleted?: boolean } = {}) {
  try {
    return await getReport(id, opts);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
