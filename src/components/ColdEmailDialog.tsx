"use client";

import { useState } from "react";
import { Copy, Loader2, X } from "lucide-react";
import type { PIProfile } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

export function ColdEmailDialog({ pi, onClose }: { pi: PIProfile; onClose: () => void }) {
  const { t, lang } = useI18n();
  const [form, setForm] = useState({
    fullName: "",
    currentAffiliation: "",
    degreeProgram: lang === "zh" ? "硕士生" : "MSc student",
    researchInterests: "",
    cvUrl: "",
  });
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pi, applicant: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setEmail(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t("draftEmail")}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">to {pi.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input className={input} placeholder={lang === "zh" ? "你的姓名 *" : "Your full name *"} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className={input} placeholder={lang === "zh" ? "当前单位" : "Current affiliation"} value={form.currentAffiliation} onChange={(e) => setForm({ ...form, currentAffiliation: e.target.value })} />
          <input className={input} placeholder={lang === "zh" ? "当前学位（如 硕士生）" : "Current program (e.g. MSc student)"} value={form.degreeProgram} onChange={(e) => setForm({ ...form, degreeProgram: e.target.value })} />
          <input className={input} placeholder={lang === "zh" ? "CV 链接（可选）" : "CV URL (optional)"} value={form.cvUrl} onChange={(e) => setForm({ ...form, cvUrl: e.target.value })} />
          <textarea
            className={`${input} sm:col-span-2`}
            rows={3}
            placeholder={lang === "zh" ? "你的研究兴趣 / 简历摘要 *" : "Your research interests / CV summary *"}
            value={form.researchInterests}
            onChange={(e) => setForm({ ...form, researchInterests: e.target.value })}
          />
        </div>

        <button
          onClick={generate}
          disabled={loading || !form.fullName || !form.researchInterests}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {lang === "zh" ? "生成" : "Generate"}
        </button>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        {email && (
          <div className="mt-5 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Subject: {email.subject}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
              >
                <Copy size={12} /> {copied ? (lang === "zh" ? "已复制" : "Copied") : lang === "zh" ? "复制" : "Copy"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{email.body}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
