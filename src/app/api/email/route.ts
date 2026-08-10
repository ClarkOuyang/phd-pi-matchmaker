import { NextResponse } from "next/server";
import { generateColdEmail, type ApplicantProfile } from "@/lib/email/coldEmail";
import type { PIProfile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { pi?: PIProfile; applicant?: ApplicantProfile };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.pi?.name) return NextResponse.json({ error: "pi.name is required" }, { status: 400 });
  if (!body.applicant?.fullName || !body.applicant?.researchInterests) {
    return NextResponse.json({ error: "applicant.fullName and applicant.researchInterests are required" }, { status: 400 });
  }

  const email = generateColdEmail(body.pi, body.applicant);
  return NextResponse.json(email);
}
