/**
 * OpenAlex REST client — free, key-less, open-access academic API.
 * Docs: https://docs.openalex.org
 * Polite pool: set OPENALEX_MAILTO to get better rate limits.
 */
import type { Paper } from "@/lib/types";

const BASE = "https://api.openalex.org";
const UA = "phd-pi-matchmaker/0.1 (https://github.com/ClarkOuyang/phd-pi-matchmaker)";

export interface OpenAlexAuthor {
  id: string;
  display_name: string;
  works_count: number;
  cited_by_count: number;
  summary_stats?: { h_index?: number; i10_index?: number; "2yr_mean_citedness"?: number };
  last_known_institutions?: { id: string; display_name: string; country_code?: string }[];
  affiliations?: { institution: { id: string; display_name: string } }[];
  topics?: { display_name: string; count: number }[];
  ids?: { orcid?: string };
}

export interface OpenAlexWork {
  id: string;
  title: string | null;
  display_name?: string | null;
  publication_year: number;
  cited_by_count: number;
  doi?: string | null;
  primary_location?: { source?: { display_name?: string } | null; landing_page_url?: string | null } | null;
  authorships?: { author: { display_name: string }; author_position: string }[];
  /** OpenAlex exposes funding acknowledgements under `funders`, not `grants`. */
  funders?: { display_name?: string; award_id?: string | null }[];
}

interface Page<T> {
  results: T[];
  meta?: { count: number };
}

function withMailto(url: URL): URL {
  const mailto = process.env.OPENALEX_MAILTO;
  if (mailto) url.searchParams.set("mailto", mailto);
  return url;
}

export class OpenAlexError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "OpenAlexError";
  }
}

async function getJson<T>(path: string, params: Record<string, string>, timeoutMs = 12_000): Promise<T> {
  const url = withMailto(new URL(path, BASE));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 12 },
    });
    if (!res.ok) throw new OpenAlexError(`OpenAlex ${res.status} for ${path}`, res.status);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof OpenAlexError) throw err;
    throw new OpenAlexError(`OpenAlex request failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

interface GroupBucket {
  key: string;
  key_display_name: string;
  count: number;
}

/** Fetch full author records by OpenAlex id (batched via the `openalex_id` filter). */
export async function fetchAuthorsByIds(ids: string[]): Promise<OpenAlexAuthor[]> {
  if (ids.length === 0) return [];
  const short = ids.map((i) => i.replace(/^https?:\/\/openalex\.org\//, ""));
  const page = await getJson<Page<OpenAlexAuthor>>("/authors", {
    filter: `openalex_id:${short.join("|")}`,
    per_page: String(short.length),
  });
  return page.results ?? [];
}

/**
 * Find authors publishing on a topic at an institution.
 *
 * NOTE: `/authors?search=` matches author NAMES only, so a topic query there
 * always returns 0. The correct approach is to search /works on the topic,
 * group by author, then hydrate the top authors.
 */
export async function searchAuthorsByTopic(
  topic: string,
  opts: { institutionId?: string; perPage?: number } = {},
): Promise<OpenAlexAuthor[]> {
  const want = opts.perPage ?? 5;
  const filters = [`fulltext.search:${topic.replace(/[,|:]/g, " ")}`];
  if (opts.institutionId) {
    filters.unshift(`authorships.institutions.lineage:${opts.institutionId.replace(/^https?:\/\/openalex\.org\//, "")}`);
  }

  const grouped = await getJson<{ group_by?: GroupBucket[] }>("/works", {
    filter: filters.join(","),
    group_by: "authorships.author.id",
    per_page: "200",
  });

  const buckets = (grouped.group_by ?? [])
    .filter((b) => b.key && b.key !== "unknown")
    .sort((a, b) => b.count - a.count)
    // require >1 paper on the topic so we surface real specialists, not one-off co-authors
    .filter((b) => b.count >= 2)
    .slice(0, want);

  if (buckets.length === 0) return [];

  const authors = await fetchAuthorsByIds(buckets.map((b) => b.key));
  const order = new Map(buckets.map((b, i) => [b.key.replace(/^https?:\/\/openalex\.org\//, ""), i]));
  return authors.sort(
    (a, b) =>
      (order.get(a.id.replace(/^https?:\/\/openalex\.org\//, "")) ?? 99) -
      (order.get(b.id.replace(/^https?:\/\/openalex\.org\//, "")) ?? 99),
  );
}

/** Recent works for an author, newest first. */
export async function fetchAuthorWorks(authorId: string, perPage = 25): Promise<OpenAlexWork[]> {
  const id = authorId.replace(/^https?:\/\/openalex\.org\//, "");
  const page = await getJson<Page<OpenAlexWork>>("/works", {
    filter: `author.id:${id}`,
    per_page: String(perPage),
    sort: "publication_year:desc",
  });
  return page.results ?? [];
}

/** Publication counts per year for an author (full history, not a page slice). */
export async function fetchPublicationYears(authorId: string): Promise<Record<number, number>> {
  const id = authorId.replace(/^https?:\/\/openalex\.org\//, "");
  const res = await getJson<{ group_by?: { key: string; count: number }[] }>("/works", {
    filter: `author.id:${id}`,
    group_by: "publication_year",
  });
  const out: Record<number, number> = {};
  for (const g of res.group_by ?? []) {
    const y = Number(g.key);
    if (Number.isFinite(y)) out[y] = g.count;
  }
  return out;
}

export function toPaper(work: OpenAlexWork): Paper {
  const doi = work.doi ? work.doi.replace(/^https?:\/\/doi\.org\//, "") : undefined;
  return {
    title: work.title ?? work.display_name ?? "Untitled",
    year: work.publication_year,
    venue: work.primary_location?.source?.display_name,
    doi,
    citations: work.cited_by_count ?? 0,
    url: doi ? `https://doi.org/${doi}` : work.primary_location?.landing_page_url ?? undefined,
    authorCount: work.authorships?.length,
  };
}

/** Top-N landmark papers by citation count. */
export function pickTopPapers(works: OpenAlexWork[], n = 3): Paper[] {
  return [...works]
    .sort((a, b) => (b.cited_by_count ?? 0) - (a.cited_by_count ?? 0))
    .slice(0, n)
    .map(toPaper);
}
