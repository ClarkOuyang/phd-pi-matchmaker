"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, BookOpen, ChevronDown, ExternalLink, Mail, Quote, Wallet } from "lucide-react";
import { AdmissionBadge } from "@/components/AdmissionBadge";
import { ColdEmailDialog } from "@/components/ColdEmailDialog";
import type { PIProfile } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

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

export function PICard({ pi }: { pi: PIProfile }) {
  const [open, setOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

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
        <Metric label="Citations" value={formatNumber(pi.metrics.citations)} icon={Quote} />
        <Metric label="h-index" value={formatNumber(pi.metrics.hIndex)} icon={Award} />
        <Metric label="Papers" value={formatNumber(pi.metrics.publications)} icon={BookOpen} />
      </div>

      {pi.metrics.partial && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Some metrics are unavailable from OpenAlex; shown as “—”.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Deep metrics
          <ChevronDown size={13} className={open ? "rotate-180 transition" : "transition"} />
        </button>
        <button
          onClick={() => setEmailOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
        >
          <Mail size={13} /> Draft Cold Email
        </button>
        {pi.facultyPage && (
          <a
            href={pi.facultyPage}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
          >
            Faculty page <ExternalLink size={11} />
          </a>
        )}
        {pi.labWebsite && (
          <a href={pi.labWebsite} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400">
            Lab site <ExternalLink size={11} />
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
              <section>
                <h5 className="mb-2 font-semibold">Why this admission status</h5>
                <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
                  {pi.admission.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h5 className="mb-2 font-semibold">Representative papers</h5>
                {pi.topPapers.length === 0 ? (
                  <p className="text-slate-500">No indexed publications found.</p>
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
                  <Wallet size={14} /> Recent funding (last 3 years)
                </h5>
                {pi.grants.length === 0 ? (
                  <p className="text-slate-500">No grant acknowledgements found in indexed papers.</p>
                ) : (
                  <ul className="space-y-1">
                    {pi.grants.slice(0, 8).map((g, i) => (
                      <li key={i} className="text-slate-600 dark:text-slate-300">
                        <span className="font-medium">{g.agency}</span> — {g.title} ({g.startYear}
                        {g.endYear && g.endYear !== g.startYear ? `–${g.endYear}` : ""})
                        {g.external === false && <span className="ml-1 text-xs text-slate-400">(internal)</span>}
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
