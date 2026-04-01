import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const TYPE_ICONS: Record<string, string> = {
  pronunciation: "🔤",
  sentence: "💬",
  vocabulary: "📖",
  scenario: "🎭",
};

const DOMAIN_COLORS: Record<string, string> = {
  meetings: "bg-blue-900/50 text-blue-300",
  presentations: "bg-purple-900/50 text-purple-300",
  interviews: "bg-amber-900/50 text-amber-300",
  technical: "bg-emerald-900/50 text-emerald-300",
};

export default async function ExercisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("difficulty_level")
    .eq("id", user!.id)
    .single();

  const difficulty = profile?.difficulty_level ?? 3.0;

  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .order("type", { ascending: true })
    .order("difficulty", { ascending: true });

  type ExerciseRow = {
    id: string;
    type: string;
    domain: string | null;
    difficulty: number;
    title: string;
    instructions: string | null;
    target_words: string[] | null;
    reference_text: string;
    model_audio_url: string | null;
  };

  const exerciseList = (exercises ?? []) as ExerciseRow[];

  const grouped = exerciseList.reduce(
    (acc, ex) => {
      const key = ex.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(ex);
      return acc;
    },
    {} as Record<string, ExerciseRow[]>
  );

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Exercises</h1>
        <p className="text-slate-400 text-sm mt-1">
          Your level: {difficulty.toFixed(1)} · exercises matching your range
          are highlighted
        </p>
      </div>

      {Object.entries(grouped).map(([type, exs]) => (
          <div key={type}>
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>{TYPE_ICONS[type] ?? "🎯"}</span>
              {type}
            </h2>
            <div className="space-y-2">
              {exs!.map((ex) => {
                const inRange =
                  ex.difficulty >= difficulty - 2 &&
                  ex.difficulty <= difficulty + 2;
                return (
                  <Link
                    key={ex.id}
                    href={`/exercise/${ex.id}`}
                    className={`flex items-center gap-3 rounded-xl p-3 border transition-colors active:scale-98 ${
                      inRange
                        ? "bg-slate-900 border-indigo-800/40 hover:border-indigo-600"
                        : "bg-slate-900/50 border-slate-800 hover:border-slate-600 opacity-70"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {ex.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {ex.domain && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${DOMAIN_COLORS[ex.domain] ?? "bg-slate-800 text-slate-400"}`}
                          >
                            {ex.domain}
                          </span>
                        )}
                        <span className="text-slate-500 text-xs">
                          Level {ex.difficulty}
                        </span>
                        {inRange && (
                          <span className="text-indigo-400 text-xs">
                            ✓ Your level
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-600 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

      {exerciseList.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 text-sm">
            No exercises yet. Run the seed script to populate exercises.
          </p>
          <code className="text-xs text-slate-600 mt-2 block">
            node scripts/seed-exercises.js
          </code>
        </div>
      )}
    </div>
  );
}
