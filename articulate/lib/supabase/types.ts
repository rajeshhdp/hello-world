export type ExerciseType =
  | "pronunciation"
  | "sentence"
  | "vocabulary"
  | "scenario";
export type ExerciseDomain =
  | "meetings"
  | "presentations"
  | "interviews"
  | "technical";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          native_language: string | null;
          it_role: string | null;
          difficulty_level: number;
          streak_days: number;
          last_active_date: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["profiles"]["Row"],
          "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      exercises: {
        Row: {
          id: string;
          type: ExerciseType;
          domain: ExerciseDomain | null;
          difficulty: number;
          reference_text: string;
          target_words: string[] | null;
          model_audio_url: string | null;
          title: string;
          instructions: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["exercises"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string | null;
          transcript: string | null;
          score_accuracy: number | null;
          score_fluency: number | null;
          score_completeness: number | null;
          audio_path: string | null;
          feedback: FeedbackReport | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["sessions"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
      };
      progress_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          avg_accuracy: number | null;
          avg_fluency: number | null;
          exercises_count: number;
        };
        Insert: Omit<
          Database["public"]["Tables"]["progress_metrics"]["Row"],
          "id"
        >;
        Update: Partial<
          Database["public"]["Tables"]["progress_metrics"]["Insert"]
        >;
      };
    };
  };
}

export interface FeedbackReport {
  summary: string;
  corrections: Array<{
    word: string;
    ipa: string;
    tip: string;
  }>;
  fluency_note: string;
  next_tip: string;
}

export interface WordDiff {
  word: string;
  status: "correct" | "missed" | "extra";
  index: number;
}

export interface ScoreResult {
  accuracy: number;
  fluency: number;
  completeness: number;
  wpm: number;
  wordDiff: WordDiff[];
}
