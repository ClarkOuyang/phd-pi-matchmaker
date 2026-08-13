import { describe, expect, it } from "vitest";
import { generateColdEmail } from "@/lib/email/coldEmail";
import type { PIProfile } from "@/lib/types";

const pi: PIProfile = {
  id: "mit-jane-doe",
  name: "Jane Doe",
  title: "Professor of Chemistry",
  department: "Chemistry",
  universityId: "mit",
  researchAreas: ["Photoelectrochemical Water Splitting"],
  metrics: { citations: 20000, hIndex: 70, publications: 300, metricSource: "OpenAlex", partial: false },
  topPapers: [
    { title: "Efficient Solar Water Splitting", year: 2024, venue: "Nature", doi: "10.1038/xyz", citations: 900 },
    { title: "Tandem Photoanodes", year: 2025, citations: 120 },
  ],
  grants: [{ agency: "DOE", title: "Award 123", startYear: 2025, source: "test" }],
  admission: { status: "EXPANDING", score: 6, confidence: "high", reasons: ["ok"] },
};

describe("generateColdEmail", () => {
  it("personalises using the PI's top paper, funder and department", () => {
    const e = generateColdEmail(pi, {
      fullName: "Wei Li",
      currentAffiliation: "Tsinghua University",
      researchInterests: "photocatalytic hydrogen evolution",
      keyAchievements: ["First-author JACS paper", "2 years of PEC cell fabrication"],
      targetTerm: "Fall 2027",
    });
    expect(e.subject).toContain("Fall 2027");
    expect(e.body).toContain("Dear Professor Doe");
    expect(e.body).toContain("Efficient Solar Water Splitting");
    expect(e.body).toContain("DOE");
    expect(e.body).toContain("Chemistry");
    expect(e.body).toContain("First-author JACS paper");
    expect(e.wordCount).toBeGreaterThan(80);
  });

  it("cites an external agency rather than the PI's own university", () => {
    const withInternal = {
      ...pi,
      grants: [
        { agency: "Harvard University", title: "internal", startYear: 2025, source: "t", external: false },
        { agency: "NSF", title: "Award 9", startYear: 2025, source: "t", external: true },
      ],
    };
    const e = generateColdEmail(withInternal, { fullName: "Wei Li", researchInterests: "solar fuels" });
    expect(e.body).toContain("NSF-supported");
    expect(e.body).not.toContain("Harvard University-supported");
  });

  it("works when the PI has no papers or grants", () => {
    const bare = { ...pi, topPapers: [], grants: [] };
    const e = generateColdEmail(bare, { fullName: "Wei Li", researchInterests: "solar fuels" });
    expect(e.body).toContain("Wei Li");
    expect(e.body).not.toContain("undefined");
  });
});
