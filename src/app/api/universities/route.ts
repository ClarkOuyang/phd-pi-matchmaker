import { NextResponse } from "next/server";
import { UNIVERSITIES } from "@/lib/data/universities";

export async function GET() {
  return NextResponse.json({ count: UNIVERSITIES.length, universities: UNIVERSITIES });
}
