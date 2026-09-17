import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ApiError } from "./api-error";

/** Converts any thrown error into a consistent JSON response. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Some fields need attention.",
        issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A record with the same unique value already exists." }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    console.error("[prisma]", error.code, error.message);
    return NextResponse.json({ error: "The database rejected the request." }, { status: 500 });
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("[prisma:init]", error.message);
    return NextResponse.json(
      { error: "The database is unreachable. Your data has not been saved — try again in a moment." },
      { status: 503 },
    );
  }
  console.error("[api]", error);
  return NextResponse.json({ error: "Unexpected server error. Nothing was changed." }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
}

export function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export function contentDisposition(type: "inline" | "attachment", filename: string): string {
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  return `${type}; filename="${safe}"`;
}
