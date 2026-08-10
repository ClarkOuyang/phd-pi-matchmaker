import type { Grant, OpenAlexGrantLike } from "@/lib/academic_api/grants.types";
import type { OpenAlexWork } from "@/lib/academic_api/openalex";

const FUNDER_ALIASES: Record<string, string> = {
  "national science foundation": "NSF",
  "national institutes of health": "NIH",
  "european research council": "ERC",
  "basic energy sciences": "DOE-BES",
  "department of energy": "DOE",
  "office of naval research": "ONR",
  "air force office of scientific research": "AFOSR",
  "defense advanced research projects agency": "DARPA",
  "national natural science foundation of china": "NSFC",
  "engineering and physical sciences research council": "EPSRC",
  "japan society for the promotion of science": "JSPS",
  "deutsche forschungsgemeinschaft": "DFG",
  "european commission": "EC",
};

const INSTITUTIONAL_FUNDER = /(universit|college|institute of technology|school of|hospital|academy|laborator)/i;

/**
 * Institutions frequently appear in OpenAlex `funders` as internal/seed money.
 * They inflate grant counts and say little about PhD-slot capacity, so external
 * agencies and industry sponsors are tracked separately.
 */
export function isExternalFunder(agency: string): boolean {
  return !INSTITUTIONAL_FUNDER.test(agency);
}

export function normalizeFunder(name: string): string {
  const key = name.trim().toLowerCase();
  for (const [long, short] of Object.entries(FUNDER_ALIASES)) {
    if (key.includes(long)) return short;
  }
  return name.trim();
}

/**
 * Derive grant records from OpenAlex work funding acknowledgements.
 * Accepts both the `funders` array (current OpenAlex schema) and the legacy
 * `grants` shape, so either payload works.
 */
export function grantsFromWorks(works: OpenAlexWork[], sinceYear: number): Grant[] {
  const seen = new Map<string, Grant>();
  for (const w of works) {
    if (!w.publication_year || w.publication_year < sinceYear) continue;

    const legacy = ((w as unknown as { grants?: OpenAlexGrantLike[] }).grants ?? []).map((g) => ({
      name: g.funder_display_name,
      award: g.award_id ?? null,
    }));
    const modern = (w.funders ?? []).map((f) => ({ name: f.display_name, award: f.award_id ?? null }));

    for (const f of [...modern, ...legacy]) {
      if (!f.name) continue;
      const agency = normalizeFunder(f.name);
      const key = `${agency}::${f.award ?? "n/a"}`;
      const existing = seen.get(key);
      if (existing) {
        existing.startYear = Math.min(existing.startYear, w.publication_year);
        existing.endYear = Math.max(existing.endYear ?? 0, w.publication_year);
        existing.mentions = (existing.mentions ?? 1) + 1;
        continue;
      }
      seen.set(key, {
        agency,
        title: f.award ? `Award ${f.award}` : `${agency} funded project`,
        startYear: w.publication_year,
        endYear: w.publication_year,
        source: "OpenAlex funding acknowledgement",
        mentions: 1,
        external: isExternalFunder(agency),
      });
    }
  }
  return [...seen.values()].sort((a, b) => (b.endYear ?? b.startYear) - (a.endYear ?? a.startYear));
}
