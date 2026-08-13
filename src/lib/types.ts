export type Region = "US" | "UK" | "EU" | "Asia" | "Other";

export type RankingSource = "QS" | "THE" | "US_NEWS";

export interface University {
  id: string;
  name: string;
  country: string;
  region: Region;
  qsRank: number;
  theRank: number;
  usNewsRank: number;
  ror?: string;
  openAlexId?: string;
}

export interface Paper {
  title: string;
  year: number;
  venue?: string;
  doi?: string;
  citations: number;
  url?: string;
  /** OpenAlex author position count — proxy for new-student co-authorship */
  authorCount?: number;
  /** Distinct contributing institutions on the paper. */
  collaboratingInstitutions?: number;
}

export interface Grant {
  agency: string;
  title: string;
  amountUsd?: number;
  startYear: number;
  endYear?: number;
  source: string;
  /** How many indexed papers acknowledged this funder+award pair. */
  mentions?: number;
  /** False for the PI's own university/institutional internal funding. */
  external?: boolean;
}

export type AdmissionStatus = "EXPANDING" | "STABLE" | "DOWNSIZING";

export interface AdmissionAssessment {
  status: AdmissionStatus;
  score: number;
  confidence: "low" | "medium" | "high";
  /** Human readable bullet reasons, bilingual-friendly plain text */
  reasons: string[];
}

export interface PIProfile {
  id: string;
  name: string;
  title: string;
  department: string;
  email?: string;
  facultyPage?: string;
  labWebsite?: string;
  universityId: string;
  researchAreas: string[];
  metrics: {
    citations: number | null;
    hIndex: number | null;
    publications: number | null;
    /** Data source for the citation/h-index metrics (e.g. "OpenAlex"). */
    metricSource: string;
    lastUpdated?: string;
    partial: boolean;
  };
  topPapers: Paper[];
  grants: Grant[];
  admission: AdmissionAssessment;
}

export interface UniversityGroup {
  university: University;
  faculty: PIProfile[];
}

export interface SearchQuery {
  topic: string;
  regions?: Region[];
  minCitations?: number;
  recruitingOnly?: boolean;
  rankingSource?: RankingSource;
  limit?: number;
  /** How many PIs to show per university before filters are applied. */
  perUniversity?: number;
}

export interface SearchResponse {
  query: SearchQuery;
  generatedAt: string;
  totalUniversities: number;
  totalFaculty: number;
  groups: UniversityGroup[];
  warnings: string[];
}
