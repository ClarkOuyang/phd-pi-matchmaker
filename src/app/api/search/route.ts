import { NextResponse } from "next/server";
import { runSearch } from "@/lib/search/service";
import type { Region, SearchQuery } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const REGIONS: Region[] = ["US", "UK", "EU", "Asia", "Other"];

export async function POST(req: Request) {
  let payload: Partial<SearchQuery>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const topic = (payload.topic ?? "").toString().trim();
  if (topic.length < 2) {
    return NextResponse.json({ error: "topic is required (min 2 characters)" }, { status: 400 });
  }

  const regions = Array.isArray(payload.regions)
    ? payload.regions.filter((r): r is Region => REGIONS.includes(r as Region))
    : undefined;

  const query: SearchQuery = {
    topic,
    regions: regions?.length ? regions : undefined,
    minCitations: Number.isFinite(payload.minCitations) ? Number(payload.minCitations) : undefined,
    recruitingOnly: Boolean(payload.recruitingOnly),
    rankingSource: payload.rankingSource === "THE" ? "THE" : "QS",
    limit: Number.isFinite(payload.limit) ? Number(payload.limit) : 6,
  };

  try {
    const result = await runSearch(query);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: `Search failed: ${(err as Error).message}` }, { status: 502 });
  }
}
