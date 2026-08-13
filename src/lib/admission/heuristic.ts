import type { AdmissionAssessment, AdmissionStatus, Grant, Paper } from "@/lib/types";

export interface AdmissionSignals {
  /** Papers, newest first is not required — years are read directly. */
  papers: Paper[];
  grants: Grant[];
  /**
   * Authoritative publications-per-year map from OpenAlex group_by. Preferred
   * over counting `papers`, which is only a truncated page of recent works.
   */
  publicationsByYear?: Record<number, number>;
  /** Text scraped from the lab site's "Prospective Students" / news section. */
  labPageText?: string;
  /** Career events e.g. "moved to X in 2024", "on sabbatical 2025". */
  careerNotes?: string[];
  currentYear?: number;
}

const RECRUIT_POSITIVE = [
  "looking for phd",
  "seeking phd",
  "recruiting phd",
  "openings for phd",
  "we are hiring",
  "prospective students are encouraged",
  "actively recruiting",
  "positions available",
  "funded phd position",
  "accepting students",
  "招收博士",
  "招生",
];

const RECRUIT_NEGATIVE = [
  "not accepting",
  "not recruiting",
  "no openings",
  "on sabbatical",
  "will not be taking",
  "unable to take new students",
  "lab is closing",
  "retiring",
  "暂不招生",
];

export interface HeuristicWeights {
  recentPublicationGrowth: number;
  activeGrants: number;
  freshGrantMoney: number;
  labPageSignal: number;
  largeTeamPapers: number;
}

export const DEFAULT_WEIGHTS: HeuristicWeights = {
  recentPublicationGrowth: 2,
  activeGrants: 2,
  freshGrantMoney: 1.5,
  labPageSignal: 3,
  largeTeamPapers: 1,
};

function countPapersInWindow(papers: Paper[], from: number, to: number): number {
  return papers.filter((p) => p.year >= from && p.year <= to).length;
}

function countYears(byYear: Record<number, number>, from: number, to: number): number {
  let n = 0;
  for (let y = from; y <= to; y++) n += byYear[y] ?? 0;
  return n;
}

/**
 * Deterministic scoring: same input always yields the same status + reasons.
 * Score > 3 => EXPANDING, score < -1.5 => DOWNSIZING, else STABLE.
 */
export function assessAdmission(
  signals: AdmissionSignals,
  weights: HeuristicWeights = DEFAULT_WEIGHTS,
): AdmissionAssessment {
  const year = signals.currentYear ?? new Date().getFullYear();
  const reasons: string[] = [];
  let score = 0;
  let evidence = 0;

  // 1. Publication momentum: last 3y vs the 3y before that.
  const byYear = signals.publicationsByYear;
  const recent = byYear ? countYears(byYear, year - 2, year) : countPapersInWindow(signals.papers, year - 2, year);
  const prior = byYear ? countYears(byYear, year - 5, year - 3) : countPapersInWindow(signals.papers, year - 5, year - 3);
  const hasPubSignal = byYear ? Object.keys(byYear).length > 0 : signals.papers.length > 0;
  if (hasPubSignal) {
    evidence++;
    if (recent >= 3 && recent > prior * 1.25) {
      score += weights.recentPublicationGrowth;
      reasons.push(
        `Publication output is accelerating: ${recent} papers in ${year - 2}–${year} vs ${prior} in ${year - 5}–${year - 3}, which usually means the group is growing.`,
      );
    } else if (recent === 0) {
      score -= weights.recentPublicationGrowth;
      reasons.push(`No publications indexed since ${year - 2}; the group may be inactive, on sabbatical, or winding down.`);
    } else if (recent < prior / 2) {
      score -= weights.recentPublicationGrowth / 2;
      reasons.push(`Output has dropped sharply (${recent} recent vs ${prior} earlier papers), a common sign of a shrinking lab.`);
    } else {
      reasons.push(`Publication rate is steady (${recent} papers in the last three years).`);
    }
  }

  // 2. Active EXTERNAL grants within the last 3 years (institutional/internal
  //    money is excluded: nearly every PI has some, so it carries no signal).
  const externalGrants = signals.grants.filter((g) => g.external !== false);
  const activeGrants = externalGrants.filter((g) => (g.endYear ?? g.startYear) >= year - 2);
  if (externalGrants.length > 0) {
    evidence++;
    if (activeGrants.length >= 3) {
      score += weights.activeGrants;
      const agencies = [...new Set(activeGrants.map((g) => g.agency))].slice(0, 4).join(", ");
      reasons.push(`${activeGrants.length} external grants active since ${year - 2} (${agencies}) — funded slots for new PhD students are likely.`);
    } else if (activeGrants.length >= 1) {
      score += weights.activeGrants / 2;
      reasons.push(`${activeGrants.length} external grant(s) still running (${activeGrants[0].agency}), so limited funded capacity exists.`);
    } else {
      score -= weights.activeGrants;
      reasons.push(`No external grant acknowledged since ${year - 2}; funding for a new student is uncertain.`);
    }
  } else {
    score -= weights.activeGrants / 2;
    reasons.push("No external grant records were found — funding capacity could not be verified.");
  }

  // 3. Brand-new external money this year or last.
  const freshGrants = externalGrants.filter((g) => g.startYear >= year - 1);
  if (freshGrants.length >= 2) {
    evidence++;
    score += weights.freshGrantMoney;
    reasons.push(
      `${freshGrants.length} new external awards first appear in ${Math.max(...freshGrants.map((g) => g.startYear))} (${freshGrants[0].agency}) — new awards are frequently followed by new PhD hires.`,
    );
  } else if (externalGrants.length > 0 && freshGrants.length === 0) {
    score -= weights.freshGrantMoney / 2;
    reasons.push(`No new external award since ${year - 2}; the group is running on existing money.`);
  }

  // 4. Lab website language.
  if (signals.labPageText) {
    const text = signals.labPageText.toLowerCase();
    const pos = RECRUIT_POSITIVE.find((k) => text.includes(k));
    const neg = RECRUIT_NEGATIVE.find((k) => text.includes(k));
    if (neg) {
      evidence++;
      score -= weights.labPageSignal;
      reasons.push(`The lab website explicitly signals it is not taking students ("${neg}").`);
    } else if (pos) {
      evidence++;
      score += weights.labPageSignal;
      reasons.push(`The lab website advertises openings ("${pos}"), the strongest direct evidence of recruiting.`);
    }
  }

  // 5. Collaboration breadth on recent papers -> an active, staffed group.
  //    Uses a share of recent output, not a raw count, so prolific senior PIs
  //    don't automatically trip the signal. Falls back to author counts when
  //    the institution figure isn't available.
  const recentPapers = signals.papers.filter((p) => p.year >= year - 1);
  const bigTeam = recentPapers.filter(
    (p) => (p.collaboratingInstitutions ?? 0) >= 3 || (p.authorCount ?? 0) >= 5,
  ).length;
  if (recentPapers.length >= 4 && bigTeam / recentPapers.length >= 0.6) {
    evidence++;
    score += weights.largeTeamPapers;
    reasons.push(
      `${bigTeam} of ${recentPapers.length} recent papers are broad multi-group collaborations, suggesting a sizeable and still-staffed lab.`,
    );
  }

  // 6. Career notes.
  for (const note of signals.careerNotes ?? []) {
    const n = note.toLowerCase();
    if (RECRUIT_NEGATIVE.some((k) => n.includes(k))) {
      evidence++;
      score -= weights.labPageSignal / 2;
      reasons.push(`Career note reduces capacity: ${note}`);
    }
    if (n.includes("started") || n.includes("joined") || n.includes("new lab")) {
      evidence++;
      score += weights.labPageSignal / 2;
      reasons.push(`Career note increases capacity: ${note} — new labs hire aggressively.`);
    }
  }

  let status: AdmissionStatus = "STABLE";
  if (score >= 4.5) status = "EXPANDING";
  else if (score <= -2) status = "DOWNSIZING";

  const confidence: AdmissionAssessment["confidence"] = evidence >= 4 ? "high" : evidence >= 2 ? "medium" : "low";

  if (reasons.length === 0) reasons.push("Not enough public signal to judge; treat the status as unknown and email to ask directly.");

  return { status, score: Math.round(score * 100) / 100, confidence, reasons };
}

export const STATUS_LABEL: Record<AdmissionStatus, string> = {
  EXPANDING: "Expanding (Actively Recruiting)",
  STABLE: "Stable",
  DOWNSIZING: "Downsizing / Sabbatical (Hard to Accept)",
};

export const STATUS_LABEL_ZH: Record<AdmissionStatus, string> = {
  EXPANDING: "扩组（积极招生）",
  STABLE: "稳定",
  DOWNSIZING: "缩组 / 休假（难录取）",
};

/**
 * Translate the English admission-reason fragments into Chinese. The reasons
 * are composed from a bounded set of templates, so phrase substitution covers
 * them all without re-running the heuristic.
 */
const REASON_ZH: [RegExp, string][] = [
  [/Publication output is accelerating: (.*?) vs (.*?), which usually means the group is growing\./, "论文产出加速：$1 篇 vs $2 篇，通常意味着课题组在扩张。"],
  [/No publications indexed since (\d+); the group may be inactive, on sabbatical, or winding down\./, "自 $1 年起无索引论文，课题组可能不活跃、休假中或正在收缩。"],
  [/Output has dropped sharply \((\d+) recent vs (\d+) earlier papers\), a common sign of a shrinking lab\./, "产出锐减（近期 $1 篇 vs 早前 $2 篇），通常是课题组缩小的信号。"],
  [/Publication rate is steady \((\d+) papers in the last three years\)\./, "发文量平稳（近三年 $1 篇）。"],
  [/(\d+) external grants active since (\d+) \((.*?)\) — funded slots for new PhD students are likely\./, "$2 年以来有 $1 项外部经费在运行（$3）——很可能还有招收新博士的经费名额。"],
  [/(\d+) external grant\(s\) still running \((.*?)\), so limited funded capacity exists\./, "仍有 $1 项外部经费在运行（$2），招生经费有限。"],
  [/No external grant acknowledged since (\d+); funding for a new student is uncertain\./, "自 $1 年起无外部经费致谢，新生的经费不确定。"],
  [/No external grant records were found — funding capacity could not be verified\./, "未找到外部经费记录——经费能力无法核实。"],
  [/(\d+) new external awards first appear in (\d+) \((.*?)\) — new awards are frequently followed by new PhD hires\./, "$2 年出现 $1 项新外部资助（$3）——新经费常带来新博士招募。"],
  [/No new external award since (\d+); the group is running on existing money\./, "自 $1 年起无新外部资助，课题组依靠既有经费运转。"],
  [/The lab website explicitly signals it is not taking students \("(.*?)"\)\./, "实验室主页明确示意不招生（“$1”）。"],
  [/The lab website advertises openings \("(.*?)"\), the strongest direct evidence of recruiting\./, "实验室主页发布招生信息（“$1”），是招生最直接的证据。"],
  [/(\d+) of (\d+) recent papers are broad multi-group collaborations, suggesting a sizeable and still-staffed lab\./, "近 $2 篇论文中有 $1 篇为跨组广泛合作，说明课题组规模可观且人员充足。"],
  [/Career note reduces capacity: (.*)/, "生涯变动降低招生能力：$1"],
  [/Career note increases capacity: (.*?) — new labs hire aggressively\./, "生涯变动提升招生能力：$1——新课题组通常积极招人。"],
  [/Not enough public signal to judge; treat the status as unknown and email to ask directly\./, "公开信号不足以判断，请直接发邮件向导师确认。"],
];

export function localizeReasons(reasons: string[], lang: "zh" | "en"): string[] {
  if (lang === "en") return reasons;
  return reasons.map((r) => {
    for (const [re, zh] of REASON_ZH) {
      if (re.test(r)) return r.replace(re, zh);
    }
    return r;
  });
}
