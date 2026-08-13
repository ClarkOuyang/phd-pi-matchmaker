import { cached } from "@/lib/cache";
import { grantsFromWorks } from "@/lib/academic_api/grants";
import {
  fetchAuthorWorks,
  fetchPublicationYears,
  pickTopPapers,
  searchAuthorsByTopic,
  toPaper,
  type OpenAlexAuthor,
} from "@/lib/academic_api/openalex";
import { assessAdmission } from "@/lib/admission/heuristic";
import { sortByRanking, UNIVERSITIES, rankOf, type RankingSource } from "@/lib/data/universities";
import type { PIProfile, SearchQuery, SearchResponse, UniversityGroup, University } from "@/lib/types";

const TTL = 1000 * 60 * 60 * 12;

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Strip the OpenAlex URL prefix so we compare bare ids. */
function bareId(id: string | undefined): string {
  return (id ?? "").replace(/^https?:\/\/openalex\.org\//, "");
}

/**
 * Does this author actually belong to the university we searched under?
 *
 * OpenAlex's `authorships.institutions.lineage` only guarantees the author has
 * *ever co-signed* a paper with that institution in the lineage — it does NOT
 * mean they are (or were) employed there. Many results are external
 * collaborators. We confirm real affiliation via `last_known_institutions`,
 * which lists institutions the author has been associated with. When that
 * field is empty we can't verify, so we keep the author (fail-open) rather
 * than silently dropping everyone.
 */
function authorAtInstitution(author: OpenAlexAuthor, uni: University): boolean {
  const target = bareId(uni.openAlexId);
  if (!target) return true;
  const lk = author.last_known_institutions ?? [];
  if (lk.length === 0) return true;
  return lk.some((i) => bareId(i.id) === target);
}

async function buildProfile(author: OpenAlexAuthor, uni: University, warnings: string[]): Promise<PIProfile> {
  const year = new Date().getFullYear();
  let works: Awaited<ReturnType<typeof fetchAuthorWorks>> = [];
  try {
    works = await cached(`works:${author.id}`, TTL, () => fetchAuthorWorks(author.id, 40));
  } catch (err) {
    warnings.push(`Works unavailable for ${author.display_name}: ${(err as Error).message}`);
  }

  let publicationsByYear: Record<number, number> | undefined;
  try {
    publicationsByYear = await cached(`years:${author.id}`, TTL, () => fetchPublicationYears(author.id));
  } catch (err) {
    warnings.push(`Yearly output unavailable for ${author.display_name}: ${(err as Error).message}`);
  }

  const papers = works.map(toPaper);
  const grants = grantsFromWorks(works, year - 3);

  const admission = assessAdmission({ papers, grants, publicationsByYear, labPageText: undefined, currentYear: year });

  const hIndex = author.summary_stats?.h_index ?? null;
  const citations = author.cited_by_count ?? null;
  const publications = author.works_count ?? null;
  const orcid = author.ids?.orcid?.replace(/^https?:\/\/orcid\.org\//, "");

  const q = encodeURIComponent(author.display_name);
  const schoolFacultySearch = `https://www.google.com/search?q=${encodeURIComponent(`site:${uni.siteDomain} "${author.display_name}" faculty`)}`;
  const personalHomeSearch = `https://www.google.com/search?q=${encodeURIComponent(`"${author.display_name}" (site:.edu OR site:.ac OR site:.org) professor homepage`)}`;

  return {
    id: slug(`${uni.id}-${author.display_name}`),
    name: author.display_name,
    title: "Faculty / Principal Investigator",
    department: author.topics?.[0]?.display_name ?? "Interdisciplinary",
    orcid,
    schoolFacultySearch,
    personalHomeSearch,
    universityId: uni.id,
    researchAreas: (author.topics ?? []).slice(0, 4).map((t) => t.display_name),
    metrics: {
      citations,
      hIndex,
      publications,
      metricSource: "OpenAlex",
      lastUpdated: new Date().toISOString(),
      partial: citations === null || hIndex === null || publications === null,
    },
    topPapers: pickTopPapers(works, 3),
    grants,
    admission,
  };
}

export async function runSearch(query: SearchQuery): Promise<SearchResponse> {
  const warnings: string[] = [];
  const rankingSource = query.rankingSource ?? "QS";
  const limit = Math.min(query.limit ?? 8, 15);
  const perUniversity = Math.min(Math.max(query.perUniversity ?? 8, 3), 20);

  let universities = UNIVERSITIES;
  if (query.regions?.length) {
    universities = universities.filter((u) => query.regions!.includes(u.region));
  }
  universities = sortByRanking(universities, rankingSource).slice(0, limit);

  const groups: UniversityGroup[] = [];

  for (const uni of universities) {
    let authors: OpenAlexAuthor[] = [];
    try {
      authors = await cached(`authors:${uni.id}:${query.topic}`, TTL, () =>
        searchAuthorsByTopic(query.topic, { institutionId: uni.openAlexId, perPage: perUniversity }),
      );
    } catch (err) {
      warnings.push(`Author search failed for ${uni.name}: ${(err as Error).message}`);
      continue;
    }

    // Drop authors whose only tie to this university is a co-authored paper
    // elsewhere — keep only those actually affiliated (last_known_institutions).
    const before = authors.length;
    const affiliated = authors.filter((a) => authorAtInstitution(a, uni));
    const dropped = before - affiliated.length;
    if (dropped > 0) {
      const names = authors
        .filter((a) => !authorAtInstitution(a, uni))
        .map((a) => a.display_name)
        .slice(0, 5);
      warnings.push(
        `${dropped} author(s) excluded from ${uni.name} (no affiliation record, likely external collaborators): ${names.join(", ")}${dropped > names.length ? "…" : ""}`,
      );
    }
    authors = affiliated;

    let faculty = await Promise.all(authors.map((a) => buildProfile(a, uni, warnings)));

    if (query.minCitations) {
      faculty = faculty.filter((f) => (f.metrics.citations ?? 0) >= query.minCitations!);
    }
    if (query.recruitingOnly) {
      faculty = faculty.filter((f) => f.admission.status === "EXPANDING");
    }

    if (faculty.length > 0) groups.push({ university: uni, faculty });
  }

  // Ranking hierarchy is the hard requirement: universities strictly by rank.
  groups.sort((a, b) => rankOf(a.university, rankingSource) - rankOf(b.university, rankingSource));

  return {
    query,
    generatedAt: new Date().toISOString(),
    totalUniversities: groups.length,
    totalFaculty: groups.reduce((n, g) => n + g.faculty.length, 0),
    groups,
    warnings,
  };
}
