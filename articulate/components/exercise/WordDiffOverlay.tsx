"use client";

import type { WordDiff } from "@/lib/supabase/types";

interface WordDiffOverlayProps {
  wordDiff: WordDiff[];
  showLegend?: boolean;
}

const STATUS_STYLES = {
  correct: "bg-emerald-900/50 text-emerald-300 border-b-2 border-emerald-500",
  missed: "bg-red-900/50 text-red-300 border-b-2 border-red-500 line-through",
  extra: "bg-amber-900/50 text-amber-300 border-b-2 border-amber-500",
};

const STATUS_LABELS = {
  correct: "Correct",
  missed: "Missed",
  extra: "Extra",
};

export default function WordDiffOverlay({
  wordDiff,
  showLegend = true,
}: WordDiffOverlayProps) {
  if (wordDiff.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 leading-loose">
        {wordDiff.map((w, i) => (
          <span
            key={`${w.word}-${i}`}
            className={`px-1.5 py-0.5 rounded text-sm font-mono ${STATUS_STYLES[w.status]}`}
            title={STATUS_LABELS[w.status]}
          >
            {w.word}
          </span>
        ))}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Correct
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Missed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Extra
          </span>
        </div>
      )}
    </div>
  );
}
