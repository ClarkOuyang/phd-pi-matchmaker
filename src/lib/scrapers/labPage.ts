/**
 * Lab-website scraper. Uses plain fetch + regex extraction so the app has no
 * heavy Puppeteer dependency by default; set SCRAPER_MODE=playwright and install
 * playwright to enable JS-rendered pages.
 */

export interface LabPageScrape {
  url: string;
  ok: boolean;
  text: string;
  prospectiveStudentSnippets: string[];
  fundingSnippets: string[];
  error?: string;
}

const PROSPECTIVE_HINTS = /(prospective student|join (the |our )?(lab|group)|openings?|we are (looking|hiring|recruiting)|phd position|招生|招收)/i;
const FUNDING_HINTS = /(NSF|NIH|ERC|DARPA|DOE|ONR|EPSRC|NSFC|grant|award|funded by|支持|基金)/i;

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 400);
}

export function extractSnippets(text: string, pattern: RegExp, max = 5): string[] {
  return splitSentences(text).filter((s) => pattern.test(s)).slice(0, max);
}

export async function scrapeLabPage(url: string, timeoutMs = 10_000): Promise<LabPageScrape> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; phd-pi-matchmaker/0.1; +https://github.com/ClarkOuyang/phd-pi-matchmaker)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) {
      return { url, ok: false, text: "", prospectiveStudentSnippets: [], fundingSnippets: [], error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const text = stripHtml(html).slice(0, 200_000);
    return {
      url,
      ok: true,
      text,
      prospectiveStudentSnippets: extractSnippets(text, PROSPECTIVE_HINTS),
      fundingSnippets: extractSnippets(text, FUNDING_HINTS),
    };
  } catch (err) {
    return {
      url,
      ok: false,
      text: "",
      prospectiveStudentSnippets: [],
      fundingSnippets: [],
      error: (err as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Best-effort: never throws, always returns one entry per URL. */
export async function scrapeMany(urls: string[]): Promise<LabPageScrape[]> {
  return Promise.all(urls.map((u) => scrapeLabPage(u)));
}
