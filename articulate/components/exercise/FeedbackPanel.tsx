"use client";

import type { FeedbackReport } from "@/lib/supabase/types";

interface FeedbackPanelProps {
  feedback: FeedbackReport | null;
  streaming?: string;
  loading?: boolean;
}

export default function FeedbackPanel({
  feedback,
  streaming,
  loading = false,
}: FeedbackPanelProps) {
  if (loading && !streaming) {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <svg
            className="w-4 h-4 animate-spin text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Generating coaching feedback…
        </div>
      </div>
    );
  }

  // Streaming — show raw text as it comes in
  if (streaming && !feedback) {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
        <p className="text-xs text-indigo-400 font-medium mb-2">
          AI Coach
        </p>
        <p className="text-slate-300 text-sm whitespace-pre-wrap">{streaming}</p>
        <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
      </div>
    );
  }

  if (!feedback) return null;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl bg-indigo-950/50 border border-indigo-800/50 p-4">
        <p className="text-xs text-indigo-400 font-medium mb-1.5">
          Overall Assessment
        </p>
        <p className="text-slate-200 text-sm leading-relaxed">
          {feedback.summary}
        </p>
      </div>

      {/* Word corrections */}
      {feedback.corrections && feedback.corrections.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <p className="text-xs text-slate-400 font-medium mb-3">
            Pronunciation Tips
          </p>
          <div className="space-y-3">
            {feedback.corrections.map((c, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-red-900/60 border border-red-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-300 text-xs">!</span>
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-semibold text-white">{c.word}</span>
                    {c.ipa && (
                      <span className="text-slate-500 ml-2 font-mono text-xs">
                        /{c.ipa}/
                      </span>
                    )}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">{c.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fluency note */}
      {feedback.fluency_note && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <p className="text-xs text-slate-400 font-medium mb-1.5">
            Fluency & Pacing
          </p>
          <p className="text-slate-300 text-sm">{feedback.fluency_note}</p>
        </div>
      )}

      {/* Next tip */}
      {feedback.next_tip && (
        <div className="rounded-xl bg-emerald-950/50 border border-emerald-800/50 p-4">
          <p className="text-xs text-emerald-400 font-medium mb-1.5">
            Next Practice Tip
          </p>
          <p className="text-slate-200 text-sm">{feedback.next_tip}</p>
        </div>
      )}
    </div>
  );
}
