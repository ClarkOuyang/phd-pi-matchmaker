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
import { sortByRanking, UNIVERSITIES } from "@/lib/data/universities";
import { scrapeLabPage } from "@/lib/scrapers/labPage";
import type { PIProfile, SearchQuery, SearchResponse, UniversityGroup, University } from "@/lib/types";

const TTL = 1000 * 60 * 60 * 12;

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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

  let labPageText: string | undefined;
  const labWebsite = undefined; // populated when a faculty directory scraper supplies it
  if (labWebsite) {
    const scrape = await scrapeLabPage(labWebsite);
    if (scrape.ok) labPageText = [...scrape.prospectiveStudentSnippets, ...scrape.fundingSnippets].join(" ");
  }

  const admission = assessAdmission({ papers, grants, publicationsByYear, labPageText, currentYear: year });

  const hIndex = author.summary_stats?.h_index ?? null;
  const citations = author.cited_by_count ?? null;
  const publications = author.works_count ?? null;

  return {
    id: slug(`${uni.id}-${author.display_name}`),
    name: author.display_name,
    title: "Faculty / Principal Investigator",
    department: author.topics?.[0]?.display_name ?? "Interdisciplinary",
    facultyPage: author.id,
    labWebsite,
    universityId: uni.id,
    researchAreas: (author.topics ?? []).slice(0, 4).map((t) => t.display_name),
    metrics: {
      citations,
      hIndex,
      publications,
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
        searchAuthorsByTopic(query.topic, { institutionId: uni.openAlexId, perPage: 5 }),
      );
    } catch (err) {
      warnings.push(`Author search failed for ${uni.name}: ${(err as Error).message}`);
      continue;
    }

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
  groups.sort((a, b) =>
    rankingSource === "THE"
      ? a.university.theRank - b.university.theRank
      : a.university.qsRank - b.university.qsRank,
  );

  return {
    query,
    generatedAt: new Date().toISOString(),
    totalUniversities: groups.length,
    totalFaculty: groups.reduce((n, g) => n + g.faculty.length, 0),
    groups,
    warnings,
  };
}
