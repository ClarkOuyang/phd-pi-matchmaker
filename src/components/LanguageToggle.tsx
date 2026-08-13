"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  // Show the OTHER language as the button label (click to switch).
  const next = lang === "zh" ? "en" : "zh";
  return (
    <button
      onClick={() => setLang(next)}
      aria-label="Toggle language"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <Languages size={15} />
      {next === "zh" ? "中文" : "EN"}
    </button>
  );
}
