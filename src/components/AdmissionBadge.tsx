"use client";

import { cn } from "@/lib/utils";
import type { AdmissionAssessment } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/admission/heuristic";
import { TrendingUp, Minus, TrendingDown } from "lucide-react";

const STYLES = {
  EXPANDING: "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  STABLE: "bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  DOWNSIZING: "bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
} as const;

const ICONS = { EXPANDING: TrendingUp, STABLE: Minus, DOWNSIZING: TrendingDown } as const;

export function AdmissionBadge({ admission }: { admission: AdmissionAssessment }) {
  const Icon = ICONS[admission.status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1",
        STYLES[admission.status],
      )}
      title={`score ${admission.score} · confidence ${admission.confidence}`}
    >
      <Icon size={13} />
      {STATUS_LABEL[admission.status]}
      <span className="opacity-60">· {admission.confidence}</span>
    </span>
  );
}
