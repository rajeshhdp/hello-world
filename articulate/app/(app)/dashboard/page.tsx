import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  // Fetch today's plan
  const exercisesRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/exercises?select=*`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: "no-store",
    }
  );

  // Get recent 3 sessions for activity feed
  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("*, exercises(title, type)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const streakDays = profile?.streak_days ?? 0;
  const difficulty = profile?.difficulty_level ?? 3.0;

  function getDifficultyLabel(d: number) {
    if (d <= 2) return "Beginner";
    if (d <= 4) return "Elementary";
    if (d <= 6) return "Intermediate";
    if (d <= 8) return "Advanced";
    return "Expert";
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Good day!</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Ready to practice your articulation?
          </p>
        </div>
        <div className="flex flex-col items-center bg-slate-900 rounded-xl px-3 py-2 border border-slate-800">
          <span className="text-xl">🔥</span>
          <span className="text-white font-bold text-sm">{streakDays}</span>
          <span className="text-slate-500 text-xs">streak</span>
        </div>
      </div>

      {/* Level card */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900/60 to-indigo-950/60 border border-indigo-800/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-indigo-300 text-xs font-medium">Current Level</p>
            <p className="text-white text-lg font-bold">
              {getDifficultyLabel(difficulty)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-indigo-300 text-xs">Difficulty</p>
            <p className="text-white font-mono text-sm">
              {difficulty.toFixed(1)} / 10
            </p>
          </div>
        </div>
        <div className="h-2 bg-indigo-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all"
            style={{ width: `${(difficulty / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Today's Plan */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Today&apos;s Plan</h2>
          <Link
            href="/exercises"
            className="text-indigo-400 text-sm hover:underline"
          >
            See all
          </Link>
        </div>
        <TodaysPlan userId={user!.id} difficulty={difficulty} />
      </div>

      {/* Recent sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-3">Recent Practice</h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {(session as { exercises?: { title?: string } }).exercises?.title ?? "Free practice"}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {new Date(session.created_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {session.score_accuracy !== null && (
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        session.score_accuracy >= 80
                          ? "text-emerald-400"
                          : session.score_accuracy >= 60
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {Math.round(session.score_accuracy)}%
                    </p>
                    <p className="text-slate-500 text-xs">accuracy</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick start */}
      {!recentSessions?.length && (
        <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center">
          <p className="text-3xl mb-2">🎙️</p>
          <p className="text-white font-medium mb-1">Start your first session</p>
          <p className="text-slate-400 text-sm mb-4">
            Pick an exercise and practice your spoken English
          </p>
          <Link
            href="/exercises"
            className="inline-block rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 text-sm transition-colors"
          >
            Browse exercises
          </Link>
        </div>
      )}
    </div>
  );
}

// Server component: fetch today's exercises
async function TodaysPlan({
  userId,
  difficulty,
}: {
  userId: string;
  difficulty: number;
}) {
  const supabase = await createClient();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .gte("difficulty", Math.max(1, difficulty - 2))
    .lte("difficulty", Math.min(10, difficulty + 2))
    .order("difficulty")
    .limit(20);

  if (!exercises || exercises.length === 0) {
    return (
      <p className="text-slate-500 text-sm">
        No exercises found. Add exercises via the seeding script.
      </p>
    );
  }

  // Pick one of each type
  function pickRandom<T>(arr: T[]): T | null {
    if (!arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const plan = [
    pickRandom(exercises.filter((e) => e.type === "pronunciation")),
    pickRandom(exercises.filter((e) => e.type === "sentence")),
    pickRandom(exercises.filter((e) => e.type === "vocabulary")),
    pickRandom(exercises.filter((e) => e.type === "scenario")) ||
      pickRandom(exercises.filter((e) => e.type === "sentence")),
  ]
    .filter(Boolean)
    .slice(0, 4);

  const typeIcons: Record<string, string> = {
    pronunciation: "🔤",
    sentence: "💬",
    vocabulary: "📖",
    scenario: "🎭",
  };

  const domainColors: Record<string, string> = {
    meetings: "text-blue-400",
    presentations: "text-purple-400",
    interviews: "text-amber-400",
    technical: "text-emerald-400",
  };

  return (
    <div className="space-y-2">
      {plan.map((exercise) => {
        if (!exercise) return null;
        return (
          <Link
            key={exercise.id}
            href={`/exercise/${exercise.id}`}
            className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800 p-3 hover:border-slate-600 transition-colors active:scale-98"
          >
            <span className="text-xl w-8 text-center">
              {typeIcons[exercise.type] ?? "🎯"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {exercise.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {exercise.domain && (
                  <span
                    className={`text-xs ${domainColors[exercise.domain] ?? "text-slate-400"}`}
                  >
                    {exercise.domain}
                  </span>
                )}
                <span className="text-slate-600 text-xs">
                  Level {exercise.difficulty}
                </span>
              </div>
            </div>
            <svg
              className="w-4 h-4 text-slate-600"
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
  );
}
