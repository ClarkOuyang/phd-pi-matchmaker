"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "zh" | "en";

type Dict = Record<string, { zh: string; en: string }>;

const D: Dict = {
  title: { zh: "博士套磁导师智能匹配平台", en: "PhD Cold-Email & PI Matchmaker" },
  subtitle: {
    zh: "名校博士套磁导师一站式服务平台 — 按排名筛选导师、实时学术指标、经费与招生容量分析。",
    en: "Rank-ordered PI discovery, live OpenAlex metrics, funding & admission-capacity analysis.",
  },
  searchPlaceholder: {
    zh: "输入研究方向，例如：光电化学水分解",
    en: "Enter a research topic, e.g. Photoelectrochemical Water Splitting",
  },
  search: { zh: "搜索", en: "Search" },
  filters: { zh: "筛选", en: "Filters" },
  minCitations: { zh: "最低引用数", en: "Min citations" },
  recruitingOnly: { zh: "仅看招生中", en: "Actively recruiting only" },
  ranking: { zh: "排名", en: "Ranking" },
  universities: { zh: "大学数量", en: "Universities" },
  professorsPerUni: { zh: "每校教授数", en: "PIs per university" },
  loading: {
    zh: "正在跨排名大学查询 OpenAlex — 可能需要 10–30 秒…",
    en: "Querying OpenAlex across ranked universities — this can take 10–30 seconds…",
  },
  dataWarnings: { zh: "条数据警告", en: "data warnings" },
  noMatch: {
    zh: "未找到匹配的导师。请尝试更宽泛的主题或放宽筛选。",
    en: "No matching PIs. Try a broader topic or relax the filters.",
  },
  citations: { zh: "引用数", en: "Citations" },
  hIndex: { zh: "H 指数", en: "h-index" },
  papers: { zh: "论文数", en: "Papers" },
  partialMetrics: {
    zh: "部分指标 OpenAlex 未提供，显示为“—”。",
    en: "Some metrics are unavailable from OpenAlex; shown as “—”.",
  },
  deepMetrics: { zh: "深度指标", en: "Deep metrics" },
  draftEmail: { zh: "生成套磁信", en: "Draft Cold Email" },
  schoolFaculty: { zh: "学院教师主页", en: "Faculty page (search)" },
  personalHome: { zh: "个人主页", en: "Personal site (search)" },
  scholar: { zh: "Google Scholar", en: "Google Scholar" },
  whyStatus: { zh: "招生状态判定依据", en: "Why this admission status" },
  repPapers: { zh: "代表性论文", en: "Representative papers" },
  noPapers: { zh: "未找到索引论文。", en: "No indexed publications found." },
  recentFunding: { zh: "近期经费（近三年）", en: "Recent funding (last 3 years)" },
  noFunding: {
    zh: "索引论文中未找到经费致谢。",
    en: "No grant acknowledgements found in indexed papers.",
  },
  internal: { zh: "（校内）", en: "(internal)" },
  source: { zh: "数据来源", en: "Source" },
  openalex: { zh: "OpenAlex（开放学术库）", en: "OpenAlex (open scholarly graph)" },
  verifyScholar: {
    zh: "指标来自 OpenAlex；ORCID / 学院教师主页 / 个人主页 为检索链接（点击后在官网或全网中定位真实页面），不伪造具体网址。",
    en: "Metrics are from OpenAlex. The ORCID, faculty-page and personal-site links are search shortcuts (they open the official site or web search to locate the real page) — no deep URLs are fabricated.",
  },
  fundingStatus: { zh: "经费情况", en: "Funding" },
  funded: { zh: "有外部经费", en: "External funding" },
  noExternalFunding: { zh: "无外部经费记录", en: "No external funding" },
  matchingPIs: { zh: "位匹配导师，分布于", en: "PIs across" },
  universitiesOrderedBy: { zh: "所大学，按", en: "universities, ordered by" },
  rank: { zh: "排名", en: "rank" },
  footer: {
    zh: "数据来源：OpenAlex (CC0) · QS / THE / US News 世界大学排名 2025 · 招生状态为启发式估算，并非导师官方声明。",
    en: "Data: OpenAlex (CC0) · QS & THE & US News World University Rankings 2025 · Admission status is a heuristic estimate, not an official statement from the PI.",
  },
  examples: { zh: "示例", en: "Examples" },
};

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof D) => string }>({
  lang: "zh",
  setLang: () => {},
  t: (k) => D[k].en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "zh" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {}
  };

  const t = (k: keyof typeof D) => D[k][lang];

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useI18n() {
  return useContext(LangContext);
}
