import Anthropic from "@anthropic-ai/sdk";
import type { FeedbackReport } from "./supabase/types";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface FeedbackRequest {
  referenceText: string;
  transcript: string;
  missedWords: string[];
  wrongWords: Array<{ spoken: string; expected: string }>;
  nativeLanguage: string;
  exerciseType: string;
  exerciseDomain: string;
}

export async function generateFeedbackStream(
  req: FeedbackRequest
): Promise<AsyncIterable<string>> {
  const missedSummary =
    req.missedWords.length > 0
      ? `Missed words: ${req.missedWords.join(", ")}`
      : "No missed words";

  const wrongSummary =
    req.wrongWords.length > 0
      ? `Substituted words: ${req.wrongWords
          .map((w) => `"${w.expected}" → said "${w.spoken}"`)
          .join("; ")}`
      : "No substitutions";

  const stream = anthropic.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    system: `You are a concise speech coach for IT professionals.
Analyze pronunciation and fluency issues and give specific, actionable feedback.
Respond ONLY with a valid JSON object matching this exact schema:
{
  "summary": "2 sentence overall assessment",
  "corrections": [{"word": "string", "ipa": "string", "tip": "string"}],
  "fluency_note": "one sentence about pacing or fluency",
  "next_tip": "one specific actionable tip for next practice"
}`,
    messages: [
      {
        role: "user",
        content: `Reference text: "${req.referenceText}"
User spoke: "${req.transcript}"
${missedSummary}
${wrongSummary}
Native language: ${req.nativeLanguage || "unknown"}
Exercise: ${req.exerciseType} (${req.exerciseDomain})

Provide coaching feedback as JSON.`,
      },
    ],
  });

  return (async function* () {
    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        yield chunk.delta.text;
      }
    }
  })();
}

export async function generateFeedback(
  req: FeedbackRequest
): Promise<FeedbackReport> {
  const missedSummary =
    req.missedWords.length > 0
      ? `Missed words: ${req.missedWords.join(", ")}`
      : "No missed words";

  const wrongSummary =
    req.wrongWords.length > 0
      ? `Substituted words: ${req.wrongWords
          .map((w) => `"${w.expected}" → said "${w.spoken}"`)
          .join("; ")}`
      : "No substitutions";

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    system: `You are a concise speech coach for IT professionals.
Analyze pronunciation and fluency issues and give specific, actionable feedback.
Respond ONLY with a valid JSON object matching this exact schema:
{
  "summary": "2 sentence overall assessment",
  "corrections": [{"word": "string", "ipa": "string", "tip": "string"}],
  "fluency_note": "one sentence about pacing or fluency",
  "next_tip": "one specific actionable tip for next practice"
}`,
    messages: [
      {
        role: "user",
        content: `Reference text: "${req.referenceText}"
User spoke: "${req.transcript}"
${missedSummary}
${wrongSummary}
Native language: ${req.nativeLanguage || "unknown"}
Exercise: ${req.exerciseType} (${req.exerciseDomain})

Provide coaching feedback as JSON.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text) as FeedbackReport;
}
