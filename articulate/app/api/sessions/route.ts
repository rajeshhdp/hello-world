import { createClient } from "@/lib/supabase/server";
import type { FeedbackReport } from "@/lib/supabase/types";

interface SessionPayload {
  exerciseId: string;
  transcript: string;
  scoreAccuracy: number;
  scoreFluency: number;
  scoreCompleteness: number;
  feedback: FeedbackReport;
  durationSeconds: number;
  audioPath?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body: SessionPayload = await request.json();

  // Save session
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      exercise_id: body.exerciseId,
      transcript: body.transcript,
      score_accuracy: body.scoreAccuracy,
      score_fluency: body.scoreFluency,
      score_completeness: body.scoreCompleteness,
      feedback: body.feedback,
      duration_seconds: body.durationSeconds,
      audio_path: body.audioPath ?? null,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Upsert daily progress metrics
  const today = new Date().toISOString().split("T")[0];
  await supabase.rpc("upsert_progress_metrics", {
    p_user_id: user.id,
    p_date: today,
    p_accuracy: body.scoreAccuracy,
    p_fluency: body.scoreFluency,
  });

  // Update streak and adaptive difficulty
  await updateStreak(supabase, user.id, today);
  await updateDifficulty(supabase, user.id, body.scoreAccuracy);

  return Response.json({ session });
}

async function updateStreak(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  today: string
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("streak_days, last_active_date")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const lastDate = profile.last_active_date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = profile.streak_days;
  if (lastDate === today) {
    // Already practiced today — no change
    return;
  } else if (lastDate === yesterdayStr) {
    newStreak += 1;
  } else {
    newStreak = 1; // streak broken
  }

  await supabase
    .from("profiles")
    .update({ streak_days: newStreak, last_active_date: today })
    .eq("id", userId);
}

async function updateDifficulty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  latestAccuracy: number
) {
  // Get last 5 session accuracy scores
  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("score_accuracy")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!recentSessions || recentSessions.length < 3) return; // not enough data yet

  const scores = recentSessions
    .map((s) => s.score_accuracy ?? 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  const { data: profile } = await supabase
    .from("profiles")
    .select("difficulty_level")
    .eq("id", userId)
    .single();

  if (!profile) return;

  let delta = 0;
  if (avg >= 85) delta = 0.3;
  else if (avg >= 70) delta = 0.1;
  else if (avg >= 55) delta = 0.0;
  else delta = -0.3;

  const newLevel = Math.min(10, Math.max(1, profile.difficulty_level + delta));
  await supabase
    .from("profiles")
    .update({ difficulty_level: newLevel })
    .eq("id", userId);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "10");

  const { data, error } = await supabase
    .from("sessions")
    .select("*, exercises(title, type, domain)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ sessions: data });
}
