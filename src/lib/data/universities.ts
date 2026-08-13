import type { University } from "@/lib/types";

/**
 * Static ranking slice (QS / THE / US News). Kept in-repo so the app works
 * with zero API keys; refresh yearly from the published tables.
 *
 * Sources:
 *  - QS World University Rankings 2025
 *  - THE World University Rankings 2025
 *  - U.S. News & World Report Best Global Universities 2025-2026
 */
export const UNIVERSITIES: University[] = [
  { id: "harvard", name: "Harvard University", country: "United States", region: "US", qsRank: 4, theRank: 3, usNewsRank: 1, openAlexId: "I136199984" },
  { id: "mit", name: "Massachusetts Institute of Technology", country: "United States", region: "US", qsRank: 1, theRank: 2, usNewsRank: 2, openAlexId: "I63966007" },
  { id: "stanford", name: "Stanford University", country: "United States", region: "US", qsRank: 6, theRank: 4, usNewsRank: 3, openAlexId: "I97018004" },
  { id: "berkeley", name: "University of California, Berkeley", country: "United States", region: "US", qsRank: 12, theRank: 8, usNewsRank: 4, openAlexId: "I95457486" },
  { id: "oxford", name: "University of Oxford", country: "United Kingdom", region: "UK", qsRank: 3, theRank: 1, usNewsRank: 5, openAlexId: "I40120149" },
  { id: "cambridge", name: "University of Cambridge", country: "United Kingdom", region: "UK", qsRank: 5, theRank: 5, usNewsRank: 6, openAlexId: "I241749" },
  { id: "caltech", name: "California Institute of Technology", country: "United States", region: "US", qsRank: 10, theRank: 7, usNewsRank: 7, openAlexId: "I78577930" },
  { id: "pku", name: "Peking University", country: "China", region: "Asia", qsRank: 14, theRank: 13, usNewsRank: 8, openAlexId: "I20231570" },
  { id: "tsinghua", name: "Tsinghua University", country: "China", region: "Asia", qsRank: 20, theRank: 12, usNewsRank: 9, openAlexId: "I19820366" },
  { id: "imperial", name: "Imperial College London", country: "United Kingdom", region: "UK", qsRank: 2, theRank: 9, usNewsRank: 10, openAlexId: "I47508984" },
  { id: "upenn", name: "University of Pennsylvania", country: "United States", region: "US", qsRank: 11, theRank: 14, usNewsRank: 14, openAlexId: "I79576946" },
  { id: "melbourne", name: "University of Melbourne", country: "Australia", region: "Other", qsRank: 13, theRank: 39, usNewsRank: 15, openAlexId: "I174212643" },
  { id: "eth", name: "ETH Zurich", country: "Switzerland", region: "EU", qsRank: 7, theRank: 11, usNewsRank: 21, openAlexId: "I35440088" },
  { id: "nus", name: "National University of Singapore", country: "Singapore", region: "Asia", qsRank: 8, theRank: 17, usNewsRank: 22, openAlexId: "I165143802" },
  { id: "ucl", name: "University College London", country: "United Kingdom", region: "UK", qsRank: 9, theRank: 22, usNewsRank: 24, openAlexId: "I45129253" },
  { id: "michigan", name: "University of Michigan", country: "United States", region: "US", qsRank: 44, theRank: 25, usNewsRank: 26, openAlexId: "I27837315" },
  { id: "epfl", name: "EPFL", country: "Switzerland", region: "EU", qsRank: 26, theRank: 33, usNewsRank: 32, openAlexId: "I5124864" },
  { id: "delft", name: "Delft University of Technology", country: "Netherlands", region: "EU", qsRank: 49, theRank: 48, usNewsRank: 56, openAlexId: "I74801974" },
  { id: "tum", name: "Technical University of Munich", country: "Germany", region: "EU", qsRank: 28, theRank: 26, usNewsRank: 78, openAlexId: "I31746571" },
  { id: "utokyo", name: "University of Tokyo", country: "Japan", region: "Asia", qsRank: 32, theRank: 28, usNewsRank: 84, openAlexId: "I74801974" },
  { id: "kaist", name: "KAIST", country: "South Korea", region: "Asia", qsRank: 53, theRank: 82, usNewsRank: 117, openAlexId: "I102322142" },
  { id: "gatech", name: "Georgia Institute of Technology", country: "United States", region: "US", qsRank: 82, theRank: 41, usNewsRank: 133, openAlexId: "I130701444" },
];

export const UNIVERSITY_BY_ID = new Map(UNIVERSITIES.map((u) => [u.id, u]));

export type RankingSource = "QS" | "THE" | "US_NEWS";

export function rankOf(u: University, source: RankingSource = "QS"): number {
  return source === "THE" ? u.theRank : source === "US_NEWS" ? u.usNewsRank : u.qsRank;
}

export function rankLabel(source: RankingSource): string {
  return source === "THE" ? "THE" : source === "US_NEWS" ? "US News" : "QS";
}

export function sortByRanking(list: University[], source: RankingSource = "QS"): University[] {
  return [...list].sort((a, b) => rankOf(a, source) - rankOf(b, source));
}
