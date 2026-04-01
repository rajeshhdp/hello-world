"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  type SpeechRecognitionInstance,
} from "@/lib/speech/web-speech";

export interface SpeechListenerHandle {
  start: () => void;
  stop: () => void;
  reset: () => void;
}

interface SpeechListenerProps {
  onTranscriptUpdate: (transcript: string) => void;
  onFinalTranscript: (transcript: string) => void;
  language?: string;
  active: boolean;
}

const SpeechListener = forwardRef<SpeechListenerHandle, SpeechListenerProps>(
  function SpeechListener(
    { onTranscriptUpdate, onFinalTranscript, language = "en-US", active },
    ref
  ) {
    const [supported, setSupported] = useState(true);
    const [finalText, setFinalText] = useState("");
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const finalTextRef = useRef("");
    const activeRef = useRef(active);

    useEffect(() => {
      activeRef.current = active;
    }, [active]);

    useEffect(() => {
      if (!isSpeechRecognitionSupported()) {
        setSupported(false);
        return;
      }
    }, []);

    function startRecognition() {
      if (!isSpeechRecognitionSupported()) return;

      finalTextRef.current = "";
      setFinalText("");

      const recognition = createSpeechRecognition({
        language,
        onResult: (transcript, isFinal) => {
          if (isFinal) {
            finalTextRef.current += transcript + " ";
            setFinalText(finalTextRef.current);
            onTranscriptUpdate(finalTextRef.current.trim());
          } else {
            onTranscriptUpdate((finalTextRef.current + transcript).trim());
          }
        },
        onError: (err) => {
          // Ignore 'no-speech' — it's common on pauses
          if (err !== "no-speech") {
            console.warn("Speech recognition error:", err);
          }
        },
        onEnd: () => {
          // Auto-restart if still active (iOS stops after silence)
          if (activeRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {}
          } else {
            onFinalTranscript(finalTextRef.current.trim());
          }
        },
      });

      recognitionRef.current = recognition;
      if (recognition) {
        recognition.start();
      }
    }

    function stopRecognition() {
      activeRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      onFinalTranscript(finalTextRef.current.trim());
    }

    function reset() {
      finalTextRef.current = "";
      setFinalText("");
    }

    useImperativeHandle(ref, () => ({
      start: startRecognition,
      stop: stopRecognition,
      reset,
    }));

    // Sync with active prop
    useEffect(() => {
      if (active) {
        startRecognition();
      } else {
        stopRecognition();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    if (!supported) {
      return (
        <p className="text-amber-400 text-xs">
          Live transcription unavailable in this browser. Your recording will
          still be analyzed after you stop.
        </p>
      );
    }

    return null; // This is a logic-only component; transcript shown via parent state
  }
);

export default SpeechListener;
