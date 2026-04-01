import { createClient } from "@/lib/supabase/server";
import ProgressCharts from "@/components/progress/ProgressCharts";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: metrics },
    { data: recentSessions },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("streak_days, difficulty_level")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("progress_metrics")
      .select("*")
      .eq("user_id", user!.id)
      .order("date", { ascending: true })
      .limit(30),
    supabase
      .from("sessions")
      .select("*, exercises(title, type)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const totalSessions = recentSessions?.length ?? 0;
  const avgAccuracy = recentSessions?.length
    ? Math.round(
        recentSessions.reduce((a, s) => a + (s.score_accuracy ?? 0), 0) /
          recentSessions.length
      )
    : 0;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">Your Progress</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Streak"
          value={`${profile?.streak_days ?? 0}d`}
          icon="🔥"
        />
        <StatCard
          label="Sessions"
          value={String(totalSessions)}
          icon="🎙️"
        />
        <StatCard
          label="Avg Score"
          value={`${avgAccuracy}%`}
          icon="📊"
        />
      </div>

      {/* Charts */}
      <ProgressCharts metrics={metrics ?? []} />

      {/* Session history */}
      <div>
        <h2 className="text-white font-semibold mb-3">Session History</h2>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">
                    {(session as { exercises?: { title?: string } }).exercises?.title ?? "Free practice"}
                  </p>
                  <div className="flex gap-3 mt-0.5">
                    {session.score_accuracy !== null && (
                      <span className="text-slate-500 text-xs">
                        Accuracy:{" "}
                        <span
                          className={
                            session.score_accuracy >= 80
                              ? "text-emerald-400"
                              : session.score_accuracy >= 60
                              ? "text-amber-400"
                              : "text-red-400"
                          }
                        >
                          {Math.round(session.score_accuracy)}%
                        </span>
                      </span>
                    )}
                    <span className="text-slate-600 text-xs">
                      {new Date(session.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                {session.score_fluency !== null && (
                  <div className="text-right ml-2">
                    <p className="text-slate-500 text-xs">Fluency</p>
                    <p className="text-slate-300 text-sm font-medium">
                      {Math.round(session.score_fluency)}%
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
            <p className="text-slate-500 text-sm">
              No sessions yet. Complete your first exercise to see your progress
              here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
      <span className="text-xl">{icon}</span>
      <p className="text-white font-bold text-lg mt-1">{value}</p>
      <p className="text-slate-500 text-xs">{label}</p>
    </div>
  );
}
