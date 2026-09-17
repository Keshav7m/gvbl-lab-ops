/**
 * Browser-side fetch helpers. They always resolve to data or throw a readable
 * ClientApiError, so components never crash on network or server failures.
 */
export interface ApiIssue {
  path: string;
  message: string;
}

export class ClientApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

type RequestOptions = RequestInit & { json?: unknown };

async function send(url: string, { json, headers, ...rest }: RequestOptions): Promise<Response> {
  try {
    return await fetch(url, {
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: "no-store",
    });
  } catch {
    throw new ClientApiError(0, "Cannot reach the server. Check the network connection — nothing was saved.");
  }
}

async function toError(res: Response): Promise<ClientApiError> {
  let body: { error?: string; issues?: ApiIssue[] } = {};
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  return new ClientApiError(res.status, body.error || `Request failed (${res.status}).`, body.issues ?? []);
}

export async function apiRequest<T>(url: string, init: RequestOptions = {}): Promise<T> {
  const res = await send(url, init);
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Fetches a file (PDF / Excel) and saves it using the server-provided file name. */
export async function downloadFile(url: string, init: RequestOptions = {}, fallbackName = "download"): Promise<string> {
  const res = await send(url, init);
  if (!res.ok) throw await toError(res);
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const name = cd.match(/filename="?([^";]+)"?/)?.[1] || fallbackName;
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
  return name;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong.";
}
