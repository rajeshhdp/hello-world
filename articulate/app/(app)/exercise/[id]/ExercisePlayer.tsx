"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AudioRecorder from "@/components/exercise/AudioRecorder";
import SpeechListener from "@/components/exercise/SpeechListener";
import WordDiffOverlay from "@/components/exercise/WordDiffOverlay";
import FeedbackPanel from "@/components/exercise/FeedbackPanel";
import { computeScore, getMissedWords, getWrongWords } from "@/lib/scoring/transcript-diff";
import type { Database, FeedbackReport, ScoreResult } from "@/lib/supabase/types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

interface ExercisePlayerProps {
  exercise: Exercise;
  nativeLanguage: string;
  itRole: string;
}

type Phase = "intro" | "recording" | "feedback" | "done";

export default function ExercisePlayer({
  exercise,
  nativeLanguage,
  itRole,
}: ExercisePlayerProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [scores, setScores] = useState<ScoreResult | null>(null);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(1);

  const speechRef = useRef<import("@/components/exercise/SpeechListener").SpeechListenerHandle | null>(null);
  const durationRef = useRef(0);
  const audioBlobRef = useRef<Blob | null>(null);

  function handleRecordingStart() {
    setIsListening(true);
    setTranscript("");
    setScores(null);
    setFeedback(null);
    setStreamingText("");
    setPhase("recording");
  }

  const handleRecordingComplete = useCallback(
    async (blob: Blob, duration: number) => {
      setIsListening(false);
      durationRef.current = duration;
      audioBlobRef.current = blob;

      // Use transcript captured by Web Speech API
      // (transcript state is already updated via SpeechListener)
      const finalTranscript = transcript;

      if (!finalTranscript.trim()) {
        // No speech detected
        setPhase("feedback");
        setFeedback({
          summary: "No speech was detected. Please make sure your microphone is enabled and try again.",
          corrections: [],
          fluency_note: "",
          next_tip: "Speak clearly into your microphone and tap Stop when done.",
        });
        return;
      }

      // Compute scores
      const result = computeScore(
        exercise.reference_text,
        finalTranscript,
        duration
      );
      setScores(result);
      setPhase("feedback");

      // Fetch Claude feedback (streaming)
      setFeedbackLoading(true);
      const missedWords = getMissedWords(result.wordDiff);
      const wrongWords = getWrongWords(exercise.reference_text, finalTranscript);

      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referenceText: exercise.reference_text,
            transcript: finalTranscript,
            missedWords,
            wrongWords,
            nativeLanguage,
            exerciseType: exercise.type,
            exerciseDomain: exercise.domain ?? "general",
          }),
        });

        if (!res.ok || !res.body) throw new Error("Feedback request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setStreamingText(fullText);
        }

        // Parse complete JSON
        try {
          const parsed = JSON.parse(fullText) as FeedbackReport;
          setFeedback(parsed);
          setStreamingText("");

          // Auto-save session
          await saveSession(finalTranscript, result, parsed, duration);
        } catch {
          // Claude returned non-JSON — wrap it
          setFeedback({
            summary: fullText,
            corrections: [],
            fluency_note: "",
            next_tip: "",
          });
          setStreamingText("");
        }
      } catch (err) {
        console.error("Feedback error:", err);
        setFeedback({
          summary: "Could not generate AI feedback. Your scores have been saved.",
          corrections: [],
          fluency_note: "",
          next_tip: "",
        });
        setStreamingText("");
      } finally {
        setFeedbackLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transcript, exercise, nativeLanguage]
  );

  async function saveSession(
    finalTranscript: string,
    result: ScoreResult,
    feedbackData: FeedbackReport,
    duration: number
  ) {
    setSaving(true);
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: exercise.id,
          transcript: finalTranscript,
          scoreAccuracy: result.accuracy,
          scoreFluency: result.fluency,
          scoreCompleteness: result.completeness,
          feedback: feedbackData,
          durationSeconds: Math.round(duration),
        }),
      });
    } catch (err) {
      console.error("Save session error:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleRetry() {
    setPhase("intro");
    setTranscript("");
    setScores(null);
    setFeedback(null);
    setStreamingText("");
    setAttempt((a) => a + 1);
  }

  const scoreColor = (s: number) =>
    s >= 80 ? "text-emerald-400" : s >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <div className="px-4 py-6 max-w-lg mx-auto min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            {exercise.type} · {exercise.domain ?? "general"}
          </p>
          <h1 className="text-white font-bold text-lg truncate">{exercise.title}</h1>
        </div>
        {attempt > 1 && (
          <span className="text-xs text-slate-500">Attempt {attempt}</span>
        )}
      </div>

      {/* Reference text */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 mb-6">
        {exercise.instructions && (
          <p className="text-slate-400 text-xs mb-2">{exercise.instructions}</p>
        )}
        <p className="text-white text-base leading-relaxed font-medium">
          {exercise.reference_text}
        </p>
        {exercise.target_words && exercise.target_words.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-xs text-slate-500">Focus words:</span>
            {exercise.target_words.map((w) => (
              <span
                key={w}
                className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full"
              >
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recording phase */}
      {(phase === "intro" || phase === "recording") && (
        <div className="space-y-6">
          {/* Live transcript */}
          {phase === "recording" && transcript && (
            <div className="rounded-xl bg-slate-900 border border-indigo-800/50 p-4">
              <p className="text-xs text-indigo-400 mb-2">You&apos;re saying…</p>
              <p className="text-slate-300 text-sm leading-relaxed">{transcript}</p>
            </div>
          )}

          {/* Audio recorder */}
          <div className="flex justify-center py-4">
            <AudioRecorder
              onRecordingStart={handleRecordingStart}
              onRecordingComplete={handleRecordingComplete}
            />
          </div>

          {/* Speech listener (headless) */}
          <SpeechListener
            ref={speechRef}
            active={isListening}
            onTranscriptUpdate={setTranscript}
            onFinalTranscript={setTranscript}
          />

          {phase === "intro" && (
            <p className="text-center text-slate-500 text-xs">
              Read the text above aloud, then tap stop when finished.
            </p>
          )}
        </div>
      )}

      {/* Feedback phase */}
      {phase === "feedback" && (
        <div className="space-y-6">
          {/* Score rings */}
          {scores && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Accuracy", value: scores.accuracy },
                { label: "Fluency", value: scores.fluency },
                { label: "Complete", value: scores.completeness },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center"
                >
                  <p className={`text-2xl font-bold ${scoreColor(value)}`}>
                    {value}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Word diff */}
          {scores && scores.wordDiff.length > 0 && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <p className="text-xs text-slate-400 font-medium mb-3">
                Word-by-word breakdown
              </p>
              <WordDiffOverlay wordDiff={scores.wordDiff} />
            </div>
          )}

          {/* AI Feedback */}
          <FeedbackPanel
            feedback={feedback}
            streaming={streamingText}
            loading={feedbackLoading}
          />

          {saving && (
            <p className="text-center text-slate-500 text-xs">Saving session…</p>
          )}

          {/* Actions */}
          {!feedbackLoading && (
            <div className="flex gap-3 pb-4">
              <button
                onClick={handleRetry}
                className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-3 text-sm transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => router.push("/exercises")}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 text-sm transition-colors"
              >
                Next exercise
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
