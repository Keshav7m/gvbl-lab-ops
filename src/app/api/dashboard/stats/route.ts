import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { getDashboardStats } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getDashboardStats());
  } catch (e) {
    return errorResponse(e);
  }
}
