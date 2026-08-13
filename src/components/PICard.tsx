"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, BookOpen, ChevronDown, ExternalLink, Mail, Quote, Wallet, GraduationCap, Database } from "lucide-react";
import { AdmissionBadge } from "@/components/AdmissionBadge";
import { ColdEmailDialog } from "@/components/ColdEmailDialog";
import type { PIProfile } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { localizeReasons } from "@/lib/admission/heuristic";

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/60">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Icon size={12} /> {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function scholarUrl(name: string, orcid?: string): string {
  // Google Scholar has no public author-id API and blocks scraping, so we
  // deep-link to a search. When we have an ORCID we scope the query to it,
  // which lands far closer to the real profile than a bare name search.
  const q = orcid ? `${name} (ORCID ${orcid})` : name;
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`;
}

export function PICard({ pi }: { pi: PIProfile }) {
  const [open, setOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const { t, lang } = useI18n();

  const externalGrants = pi.grants.filter((g) => g.external !== false);
  const hasExternal = externalGrants.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold">{pi.name}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pi.title} · {pi.department}
          </p>
          {pi.researchAreas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pi.researchAreas.slice(0, 3).map((a) => (
                <span key={a} className="rounded bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
        <AdmissionBadge admission={pi.admission} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label={t("citations")} value={formatNumber(pi.metrics.citations)} icon={Quote} />
        <Metric label={t("hIndex")} value={formatNumber(pi.metrics.hIndex)} icon={Award} />
        <Metric label={t("papers")} value={formatNumber(pi.metrics.publications)} icon={BookOpen} />
      </div>

      {/* Funding badge — surfaced on the card, not just in the deep panel. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
            hasExternal
              ? "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30"
              : "bg-slate-100 text-slate-600 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
          }`}
        >
          <Wallet size={12} />
          {t("fundingStatus")}: {hasExternal ? t("funded") : t("noExternalFunding")}
          {hasExternal && ` (${externalGrants.length})`}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
          <Database size={11} /> {t("source")}: {pi.metrics.metricSource}
        </span>
      </div>

      {pi.metrics.partial && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{t("partialMetrics")}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {t("deepMetrics")}
          <ChevronDown size={13} className={open ? "rotate-180 transition" : "transition"} />
        </button>
        <button
          onClick={() => setEmailOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
        >
          <Mail size={13} /> {t("draftEmail")}
        </button>
        <a
          href={scholarUrl(pi.name, pi.orcid)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
        >
          <GraduationCap size={12} /> Google Scholar
        </a>
        {pi.orcid && (
          <a
            href={`https://orcid.org/${pi.orcid}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
          >
            ORCID <ExternalLink size={11} />
          </a>
        )}
        {pi.schoolFacultySearch && (
          <a
            href={pi.schoolFacultySearch}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
          >
            {t("schoolFaculty")} <ExternalLink size={11} />
          </a>
        )}
        {pi.personalHomeSearch && (
          <a
            href={pi.personalHomeSearch}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
          >
            {t("personalHome")} <ExternalLink size={11} />
          </a>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                {t("verifyScholar")}
              </p>

              <section>
                <h5 className="mb-2 font-semibold">{t("whyStatus")}</h5>
                <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
                  {localizeReasons(pi.admission.reasons, lang).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h5 className="mb-2 font-semibold">{t("repPapers")}</h5>
                {pi.topPapers.length === 0 ? (
                  <p className="text-slate-500">{t("noPapers")}</p>
                ) : (
                  <ol className="space-y-1.5">
                    {pi.topPapers.map((p, i) => (
                      <li key={i} className="text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{p.title}</span>{" "}
                        <span className="text-xs">
                          ({p.venue ?? "n/a"}, {p.year}) · {formatNumber(p.citations)} citations
                        </span>
                        {p.doi && (
                          <>
                            {" "}
                            <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline dark:text-brand-400">
                              doi:{p.doi}
                            </a>
                          </>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section>
                <h5 className="mb-2 flex items-center gap-1.5 font-semibold">
                  <Wallet size={14} /> {t("recentFunding")}
                </h5>
                {pi.grants.length === 0 ? (
                  <p className="text-slate-500">{t("noFunding")}</p>
                ) : (
                  <ul className="space-y-1">
                    {pi.grants.slice(0, 8).map((g, i) => (
                      <li key={i} className="text-slate-600 dark:text-slate-300">
                        <span className="font-medium">{g.agency}</span> — {g.title} ({g.startYear}
                        {g.endYear && g.endYear !== g.startYear ? `–${g.endYear}` : ""})
                        {g.external === false && <span className="ml-1 text-xs text-slate-400">{t("internal")}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {emailOpen && <ColdEmailDialog pi={pi} onClose={() => setEmailOpen(false)} />}
    </div>
  );
}
