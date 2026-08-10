"use client";

import { motion } from "framer-motion";
import { GraduationCap, MapPin } from "lucide-react";
import { PICard } from "@/components/PICard";
import type { UniversityGroup } from "@/lib/types";

export function UniversityGroupCard({ group, index, rankingSource }: { group: UniversityGroup; index: number; rankingSource: "QS" | "THE" }) {
  const { university: u, faculty } = group;
  const rank = rankingSource === "THE" ? u.theRank : u.qsRank;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      className="rounded-2xl border border-slate-200 bg-white/60 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/40"
    >
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">
          #{rank}
        </div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <GraduationCap size={18} className="text-brand-500" />
            {u.name}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <MapPin size={12} /> {u.country} · {u.region} · QS #{u.qsRank} · THE #{u.theRank}
          </p>
        </div>
        <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
          {faculty.length} matching PI{faculty.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        {faculty.map((pi) => (
          <PICard key={pi.id} pi={pi} />
        ))}
      </div>
    </motion.section>
  );
}
