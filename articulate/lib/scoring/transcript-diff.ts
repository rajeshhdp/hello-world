import type { ScoreResult, WordDiff } from "../supabase/types";

function normalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^\w']/g, "")
    .trim();
}

export function computeScore(
  referenceText: string,
  transcript: string,
  durationSeconds: number
): ScoreResult {
  const refWords = referenceText.split(/\s+/).map(normalize).filter(Boolean);
  const spokenWords = transcript.split(/\s+/).map(normalize).filter(Boolean);

  // Build word diff using a greedy longest-common-subsequence approach
  const wordDiff: WordDiff[] = [];
  const lcs = computeLCS(refWords, spokenWords);

  let ri = 0;
  let si = 0;
  let lcsIdx = 0;

  while (ri < refWords.length || si < spokenWords.length) {
    if (
      ri < refWords.length &&
      si < spokenWords.length &&
      lcsIdx < lcs.length &&
      refWords[ri] === lcs[lcsIdx] &&
      spokenWords[si] === lcs[lcsIdx]
    ) {
      wordDiff.push({ word: refWords[ri], status: "correct", index: ri });
      ri++;
      si++;
      lcsIdx++;
    } else if (ri < refWords.length && spokenWords.indexOf(refWords[ri], si) === -1) {
      wordDiff.push({ word: refWords[ri], status: "missed", index: ri });
      ri++;
    } else if (si < spokenWords.length && refWords.indexOf(spokenWords[si], ri) === -1) {
      wordDiff.push({ word: spokenWords[si], status: "extra", index: si });
      si++;
    } else {
      if (ri < refWords.length) {
        wordDiff.push({ word: refWords[ri], status: "missed", index: ri });
        ri++;
      }
      if (si < spokenWords.length) {
        wordDiff.push({ word: spokenWords[si], status: "extra", index: si });
        si++;
      }
    }
  }

  const correctCount = wordDiff.filter((w) => w.status === "correct").length;
  const missedCount = wordDiff.filter((w) => w.status === "missed").length;

  const accuracy =
    refWords.length > 0 ? (correctCount / refWords.length) * 100 : 0;
  const completeness =
    refWords.length > 0
      ? ((refWords.length - missedCount) / refWords.length) * 100
      : 0;

  const wpm =
    durationSeconds > 0
      ? Math.round((spokenWords.length / durationSeconds) * 60)
      : 0;
  // Target WPM for IT presentations: 130-150 wpm
  const fluency = Math.min(100, Math.max(0, (wpm / 140) * 100));

  return {
    accuracy: Math.round(accuracy),
    fluency: Math.round(fluency),
    completeness: Math.round(completeness),
    wpm,
    wordDiff,
  };
}

export function getMissedWords(wordDiff: WordDiff[]): string[] {
  return wordDiff
    .filter((w) => w.status === "missed")
    .map((w) => w.word);
}

export function getWrongWords(
  referenceText: string,
  transcript: string
): Array<{ spoken: string; expected: string }> {
  const refWords = referenceText.split(/\s+/).map(normalize).filter(Boolean);
  const spokenWords = transcript.split(/\s+/).map(normalize).filter(Boolean);
  const result: Array<{ spoken: string; expected: string }> = [];

  for (let i = 0; i < Math.min(refWords.length, spokenWords.length); i++) {
    if (refWords[i] !== spokenWords[i] && refWords[i] && spokenWords[i]) {
      result.push({ expected: refWords[i], spoken: spokenWords[i] });
    }
  }
  return result;
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return lcs;
}
