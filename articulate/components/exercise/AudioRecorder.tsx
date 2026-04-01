"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { getSupportedAudioMimeType } from "@/lib/speech/web-speech";

export type RecordingState = "idle" | "recording" | "processing" | "done";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, durationSeconds: number) => void;
  onRecordingStart?: () => void;
  disabled?: boolean;
}

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingStart,
  disabled = false,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }

  function startVolumeMonitor(stream: MediaStream) {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setVolume(Math.min(100, avg * 2));
      animFrameRef.current = requestAnimationFrame(tick);
    }
    tick();
  }

  const startRecording = useCallback(async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedAudioMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const dur = (Date.now() - startTimeRef.current) / 1000;
        cleanup();
        setVolume(0);
        setState("processing");
        onRecordingComplete(blob, dur);
      };

      mediaRecorder.start(100); // collect 100ms chunks
      startTimeRef.current = Date.now();
      setState("recording");
      onRecordingStart?.();

      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      startVolumeMonitor(stream);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setPermissionError(
          "Microphone access denied. Please allow microphone access in your browser settings."
        );
      } else {
        setPermissionError("Could not access microphone. Please try again.");
      }
    }
  }, [onRecordingComplete, onRecordingStart]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }
  }, []);

  function formatDuration(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const bars = Array.from({ length: 12 });

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Volume visualizer */}
      {state === "recording" && (
        <div className="flex items-end gap-1 h-10">
          {bars.map((_, i) => {
            const threshold = (i / bars.length) * 100;
            const active = volume > threshold;
            return (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  active ? "bg-indigo-400" : "bg-slate-700"
                }`}
                style={{
                  height: active
                    ? `${20 + Math.sin((i / bars.length) * Math.PI) * 20}px`
                    : "8px",
                }}
              />
            );
          })}
        </div>
      )}

      {/* Record / Stop button */}
      <button
        onClick={state === "recording" ? stopRecording : startRecording}
        disabled={disabled || state === "processing"}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-200 shadow-lg
          ${
            state === "recording"
              ? "bg-red-500 hover:bg-red-400 scale-110"
              : state === "processing"
              ? "bg-slate-700 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500 active:scale-95"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        aria-label={state === "recording" ? "Stop recording" : "Start recording"}
      >
        {state === "recording" ? (
          <span className="w-6 h-6 bg-white rounded-sm" />
        ) : state === "processing" ? (
          <svg
            className="w-7 h-7 text-slate-400 animate-spin"
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
        ) : (
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-5 9v-2.07A7.003 7.003 0 0019 11h-2a5 5 0 01-10 0H5a7.003 7.003 0 007 6.93V20H9v2h6v-2h-3z" />
          </svg>
        )}
      </button>

      {/* State label */}
      <div className="text-center">
        {state === "recording" && (
          <p className="text-red-400 text-sm font-medium">
            Recording {formatDuration(duration)}
          </p>
        )}
        {state === "idle" && (
          <p className="text-slate-400 text-sm">Tap to record</p>
        )}
        {state === "processing" && (
          <p className="text-slate-400 text-sm">Processing…</p>
        )}
      </div>

      {permissionError && (
        <p className="text-red-400 text-xs text-center max-w-xs">
          {permissionError}
        </p>
      )}
    </div>
  );
}
