import { describe, expect, it } from "vitest";
import { assessAdmission } from "@/lib/admission/heuristic";
import type { Grant, Paper } from "@/lib/types";

const YEAR = 2026;

function paper(year: number, authorCount = 4, citations = 10): Paper {
  return { title: `p${year}`, year, citations, authorCount };
}
function grant(startYear: number, agency = "NSF", endYear?: number): Grant {
  return { agency, title: "award", startYear, endYear, source: "test" };
}

describe("assessAdmission", () => {
  it("flags an expanding lab with fresh money and rising output", () => {
    const r = assessAdmission({
      papers: [paper(2026, 7), paper(2026, 6), paper(2025, 8), paper(2024), paper(2021)],
      grants: [grant(2025), grant(2026, "NIH")],
      labPageText: "We are actively recruiting PhD students for Fall 2027.",
      currentYear: YEAR,
    });
    expect(r.status).toBe("EXPANDING");
    expect(r.confidence).toBe("high");
    expect(r.reasons.join(" ")).toMatch(/recruiting|advertises openings/i);
  });

  it("flags a downsizing lab with no recent output and a negative notice", () => {
    const r = assessAdmission({
      papers: [paper(2019), paper(2020), paper(2021)],
      grants: [grant(2017, "NSF", 2019)],
      labPageText: "I am on sabbatical and not accepting new students.",
      currentYear: YEAR,
    });
    expect(r.status).toBe("DOWNSIZING");
    expect(r.reasons.some((x) => /not taking students|sabbatical/i.test(x))).toBe(true);
  });

  it("returns STABLE for steady mid-range signal", () => {
    const r = assessAdmission({
      papers: [paper(2025), paper(2024), paper(2023), paper(2022), paper(2021)],
      grants: [grant(2023, "ERC", 2024)],
      currentYear: YEAR,
    });
    expect(r.status).toBe("STABLE");
  });

  it("is deterministic for identical input", () => {
    const signals = { papers: [paper(2025), paper(2024)], grants: [grant(2024)], currentYear: YEAR };
    expect(assessAdmission(signals)).toEqual(assessAdmission(signals));
  });

  it("prefers publicationsByYear over the truncated paper page", () => {
    // Only 2 recent papers in the page, but the year map shows a real slowdown.
    const r = assessAdmission({
      papers: [paper(2026), paper(2025)],
      grants: [],
      publicationsByYear: { 2021: 30, 2022: 28, 2023: 25, 2024: 3, 2025: 2, 2026: 1 },
      currentYear: YEAR,
    });
    expect(r.reasons.join(" ")).toMatch(/6 papers in 2024–2026 vs 83|dropped sharply/i);
    expect(r.status).not.toBe("EXPANDING");
  });

  it("degrades gracefully with zero data", () => {
    const r = assessAdmission({ papers: [], grants: [], currentYear: YEAR });
    expect(r.confidence).toBe("low");
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(["STABLE", "DOWNSIZING", "EXPANDING"]).toContain(r.status);
  });
});
