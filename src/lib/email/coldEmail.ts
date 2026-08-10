import type { PIProfile } from "@/lib/types";

export interface ApplicantProfile {
  fullName: string;
  currentAffiliation?: string;
  degreeProgram?: string;
  researchInterests: string;
  keyAchievements?: string[];
  cvUrl?: string;
  targetTerm?: string;
}

export interface ColdEmail {
  subject: string;
  body: string;
  wordCount: number;
}

function salutation(pi: PIProfile): string {
  const last = pi.name.trim().split(/\s+/).slice(-1)[0];
  const honorific = /^prof/i.test(pi.title) ? "Professor" : "Dr.";
  return `Dear ${honorific} ${last},`;
}

export function generateColdEmail(pi: PIProfile, applicant: ApplicantProfile): ColdEmail {
  const paper = pi.topPapers[0];
  const second = pi.topPapers[1];
  const term = applicant.targetTerm ?? `Fall ${new Date().getFullYear() + 1}`;
  const area = pi.researchAreas[0] ?? "your research area";

  const paperLine = paper
    ? `I read your paper "${paper.title}"${paper.venue ? ` (${paper.venue}, ${paper.year})` : ` (${paper.year})`} closely${
        paper.doi ? ` [doi:${paper.doi}]` : ""
      }, and the way it approaches ${area} maps directly onto the problem I want to work on.`
    : `I have been following your group's work on ${area} and it maps directly onto the problem I want to work on.`;

  const secondLine = second
    ? ` Your more recent "${second.title}" (${second.year}) suggests the group is pushing toward exactly the open question I am interested in.`
    : "";

  const namedFunder = pi.grants.find((g) => g.external !== false) ?? pi.grants[0];
  const fundingLine = namedFunder
    ? ` I also noticed your group's ${namedFunder.agency}-supported work, which is why I believe there may be room for a new student on this line of research.`
    : "";

  const achievements = (applicant.keyAchievements ?? []).slice(0, 3);
  const achievementBlock = achievements.length
    ? `\n\nBriefly, what I bring:\n${achievements.map((a) => `  • ${a}`).join("\n")}`
    : "";

  const subject = `Prospective PhD applicant (${term}) — ${applicant.researchInterests.slice(0, 60)}`;

  const body = `${salutation(pi)}

My name is ${applicant.fullName}${
    applicant.currentAffiliation ? `, currently ${applicant.degreeProgram ?? "a student"} at ${applicant.currentAffiliation}` : ""
  }. I am applying to PhD programs for ${term} and am writing because I would like to work with you in ${pi.department}.

${paperLine}${secondLine}${fundingLine}

My own work centres on ${applicant.researchInterests}.${achievementBlock}

I would be grateful for a short conversation about whether you expect to take a new PhD student for ${term}, and whether my background is a fit for your current directions.${
    applicant.cvUrl ? ` My CV is here: ${applicant.cvUrl}.` : " I have attached my CV."
  }

Thank you for your time and consideration.

Best regards,
${applicant.fullName}`;

  return { subject, body, wordCount: body.split(/\s+/).filter(Boolean).length };
}
