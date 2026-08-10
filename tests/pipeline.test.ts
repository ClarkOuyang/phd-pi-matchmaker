import { describe, expect, it } from "vitest";
import { sortByRanking, UNIVERSITIES } from "@/lib/data/universities";
import { grantsFromWorks, isExternalFunder, normalizeFunder } from "@/lib/academic_api/grants";
import { extractSnippets, stripHtml } from "@/lib/scrapers/labPage";
import { pickTopPapers, toPaper, type OpenAlexWork } from "@/lib/academic_api/openalex";

const work = (year: number, cites: number, funder?: string): OpenAlexWork => ({
  id: `W${year}${cites}`,
  title: `Work ${year}-${cites}`,
  publication_year: year,
  cited_by_count: cites,
  doi: "https://doi.org/10.1000/abc",
  funders: funder ? [{ display_name: funder, award_id: "A1" }] : [],
});

describe("ranking", () => {
  it("orders strictly by QS then by THE when asked", () => {
    const qs = sortByRanking(UNIVERSITIES, "QS").map((u) => u.qsRank);
    expect(qs).toEqual([...qs].sort((a, b) => a - b));
    const the = sortByRanking(UNIVERSITIES, "THE").map((u) => u.theRank);
    expect(the).toEqual([...the].sort((a, b) => a - b));
  });
});

describe("openalex mappers", () => {
  it("strips the doi prefix and picks top-3 by citations", () => {
    const p = toPaper(work(2024, 5));
    expect(p.doi).toBe("10.1000/abc");
    const top = pickTopPapers([work(2020, 1), work(2021, 99), work(2022, 50), work(2023, 70)], 3);
    expect(top.map((x) => x.citations)).toEqual([99, 70, 50]);
  });
});

describe("grants", () => {
  it("normalises funder names and only keeps recent acknowledgements", () => {
    expect(normalizeFunder("National Science Foundation")).toBe("NSF");
    expect(normalizeFunder("Basic Energy Sciences")).toBe("DOE-BES");
    const g = grantsFromWorks([work(2025, 3, "National Institutes of Health"), work(2010, 3, "NSF")], 2023);
    expect(g).toHaveLength(1);
    expect(g[0].agency).toBe("NIH");
  });

  it("still reads the legacy `grants` payload shape", () => {
    const legacy = {
      id: "W1",
      title: "legacy",
      publication_year: 2025,
      cited_by_count: 1,
      grants: [{ funder_display_name: "European Research Council", award_id: "ERC-1" }],
    } as unknown as OpenAlexWork;
    const g = grantsFromWorks([legacy], 2023);
    expect(g[0].agency).toBe("ERC");
    expect(g[0].title).toContain("ERC-1");
  });
  it("marks institutional money as internal so it can't inflate the score", () => {
    expect(isExternalFunder("Massachusetts Institute of Technology")).toBe(false);
    expect(isExternalFunder("NSF")).toBe(true);
    expect(isExternalFunder("Toyota Research Institute")).toBe(true);
    const g = grantsFromWorks([work(2025, 1, "Harvard University"), work(2025, 1, "NSF")], 2023);
    expect(g.find((x) => x.agency === "Harvard University")?.external).toBe(false);
    expect(g.find((x) => x.agency === "NSF")?.external).toBe(true);
  });
});

describe("scraper text utils", () => {
  it("strips html and finds prospective-student sentences", () => {
    const html = "<html><script>bad()</script><p>We are recruiting PhD students for the coming year in our lab.</p><p>Short.</p></html>";
    const text = stripHtml(html);
    expect(text).not.toContain("bad()");
    const s = extractSnippets(text, /recruiting/i);
    expect(s.length).toBe(1);
  });
});
