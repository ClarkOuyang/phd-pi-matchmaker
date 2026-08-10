"use client";

import { useState } from "react";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UniversityGroupCard } from "@/components/UniversityGroupCard";
import type { Region, SearchResponse } from "@/lib/types";

const REGIONS: Region[] = ["US", "UK", "EU", "Asia", "Other"];
const EXAMPLES = ["Photoelectrochemical Water Splitting", "Diffusion Models in Biology", "Solid-State Batteries", "Single-Cell Transcriptomics"];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [regions, setRegions] = useState<Region[]>([]);
  const [minCitations, setMinCitations] = useState(0);
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  const [rankingSource, setRankingSource] = useState<"QS" | "THE">("QS");
  const [limit, setLimit] = useState(6);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(term = topic) {
    if (term.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: term, regions, minCitations, recruitingOnly, rankingSource, limit }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      setData(json);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function toggleRegion(r: Region) {
    setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PhD Cold-Email & PI Matchmaker</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            名校博士套磁导师一站式服务平台 — rank-ordered PI discovery, live OpenAlex metrics, funding &amp; admission-capacity analysis.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Enter a research topic, e.g. Photoelectrochemical Water Splitting"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <button
            onClick={() => search()}
            disabled={loading || topic.trim().length < 2}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => {
                setTopic(e);
                search(e);
              }}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {e}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <SlidersHorizontal size={13} /> Filters
          </span>

          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => toggleRegion(r)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  regions.includes(r)
                    ? "bg-brand-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs">
            Min citations
            <input
              type="number"
              min={0}
              step={1000}
              value={minCitations}
              onChange={(e) => setMinCitations(Number(e.target.value))}
              className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={recruitingOnly} onChange={(e) => setRecruitingOnly(e.target.checked)} />
            Actively recruiting only
          </label>

          <label className="flex items-center gap-2 text-xs">
            Ranking
            <select
              value={rankingSource}
              onChange={(e) => setRankingSource(e.target.value as "QS" | "THE")}
              className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="QS">QS</option>
              <option value="THE">THE</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs">
            Universities
            <input
              type="number"
              min={1}
              max={15}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-16 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading && (
        <p className="mt-8 text-center text-sm text-slate-500">
          Querying OpenAlex across ranked universities — this can take 10–30 seconds…
        </p>
      )}

      {data && !loading && (
        <div className="mt-8">
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            {data.totalFaculty} PIs across {data.totalUniversities} universities, ordered by {data.query.rankingSource} rank.
          </p>
          {data.warnings.length > 0 && (
            <details className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <summary className="cursor-pointer font-medium">{data.warnings.length} data warnings</summary>
              <ul className="mt-2 list-disc pl-5">
                {data.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
          {data.groups.length === 0 ? (
            <p className="rounded-lg border border-slate-200 p-8 text-center text-slate-500 dark:border-slate-800">
              No matching PIs. Try a broader topic or relax the filters.
            </p>
          ) : (
            <div className="space-y-5">
              {data.groups.map((g, i) => (
                <UniversityGroupCard key={g.university.id} group={g} index={i} rankingSource={data.query.rankingSource ?? "QS"} />
              ))}
            </div>
          )}
        </div>
      )}

      <footer className="mt-16 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800">
        Data: OpenAlex (CC0) · QS &amp; THE World University Rankings 2025 · Admission status is a heuristic estimate, not an official statement from the PI.
      </footer>
    </main>
  );
}
