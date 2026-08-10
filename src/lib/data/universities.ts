import type { University } from "@/lib/types";

/**
 * Static QS / THE ranking slice. Kept in-repo so the app works with zero API
 * keys; refresh yearly from the published QS & THE tables.
 * Sources: QS World University Rankings 2025, THE World University Rankings 2025.
 */
export const UNIVERSITIES: University[] = [
  { id: "mit", name: "Massachusetts Institute of Technology", country: "United States", region: "US", qsRank: 1, theRank: 2, openAlexId: "I63966007" },
  { id: "imperial", name: "Imperial College London", country: "United Kingdom", region: "UK", qsRank: 2, theRank: 9, openAlexId: "I47508984" },
  { id: "oxford", name: "University of Oxford", country: "United Kingdom", region: "UK", qsRank: 3, theRank: 1, openAlexId: "I40120149" },
  { id: "harvard", name: "Harvard University", country: "United States", region: "US", qsRank: 4, theRank: 3, openAlexId: "I136199984" },
  { id: "cambridge", name: "University of Cambridge", country: "United Kingdom", region: "UK", qsRank: 5, theRank: 5, openAlexId: "I241749" },
  { id: "stanford", name: "Stanford University", country: "United States", region: "US", qsRank: 6, theRank: 4, openAlexId: "I97018004" },
  { id: "eth", name: "ETH Zurich", country: "Switzerland", region: "EU", qsRank: 7, theRank: 11, openAlexId: "I35440088" },
  { id: "nus", name: "National University of Singapore", country: "Singapore", region: "Asia", qsRank: 8, theRank: 17, openAlexId: "I165143802" },
  { id: "ucl", name: "University College London", country: "United Kingdom", region: "UK", qsRank: 9, theRank: 22, openAlexId: "I45129253" },
  { id: "caltech", name: "California Institute of Technology", country: "United States", region: "US", qsRank: 10, theRank: 7, openAlexId: "I78577930" },
  { id: "upenn", name: "University of Pennsylvania", country: "United States", region: "US", qsRank: 11, theRank: 14, openAlexId: "I79576946" },
  { id: "berkeley", name: "University of California, Berkeley", country: "United States", region: "US", qsRank: 12, theRank: 8, openAlexId: "I95457486" },
  { id: "melbourne", name: "University of Melbourne", country: "Australia", region: "Other", qsRank: 13, theRank: 39, openAlexId: "I174212643" },
  { id: "pku", name: "Peking University", country: "China", region: "Asia", qsRank: 14, theRank: 13, openAlexId: "I20231570" },
  { id: "tsinghua", name: "Tsinghua University", country: "China", region: "Asia", qsRank: 20, theRank: 12, openAlexId: "I19820366" },
  { id: "epfl", name: "EPFL", country: "Switzerland", region: "EU", qsRank: 26, theRank: 33, openAlexId: "I5124864" },
  { id: "tum", name: "Technical University of Munich", country: "Germany", region: "EU", qsRank: 28, theRank: 26, openAlexId: "I31746571" },
  { id: "utokyo", name: "University of Tokyo", country: "Japan", region: "Asia", qsRank: 32, theRank: 28, openAlexId: "I74801974" },
  { id: "michigan", name: "University of Michigan", country: "United States", region: "US", qsRank: 44, theRank: 25, openAlexId: "I27837315" },
  { id: "kaist", name: "KAIST", country: "South Korea", region: "Asia", qsRank: 53, theRank: 82, openAlexId: "I102322142" },
  { id: "delft", name: "Delft University of Technology", country: "Netherlands", region: "EU", qsRank: 49, theRank: 48, openAlexId: "I74801974" },
  { id: "gatech", name: "Georgia Institute of Technology", country: "United States", region: "US", qsRank: 82, theRank: 41, openAlexId: "I130701444" },
];

export const UNIVERSITY_BY_ID = new Map(UNIVERSITIES.map((u) => [u.id, u]));

export function rankOf(u: University, source: "QS" | "THE" = "QS"): number {
  return source === "THE" ? u.theRank : u.qsRank;
}

export function sortByRanking(list: University[], source: "QS" | "THE" = "QS"): University[] {
  return [...list].sort((a, b) => rankOf(a, source) - rankOf(b, source));
}
