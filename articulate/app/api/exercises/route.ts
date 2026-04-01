import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const domain = searchParams.get("domain");
  const forPlan = searchParams.get("plan") === "true";

  // Get user's difficulty level
  const { data: profile } = await supabase
    .from("profiles")
    .select("difficulty_level")
    .eq("id", user.id)
    .single();

  const difficulty = profile?.difficulty_level ?? 3.0;

  let query = supabase.from("exercises").select("*");

  if (type) query = query.eq("type", type);
  if (domain) query = query.eq("domain", domain);

  if (forPlan) {
    // Return today's plan: exercises within ±2 difficulty of user level
    query = query
      .gte("difficulty", Math.max(1, difficulty - 2))
      .lte("difficulty", Math.min(10, difficulty + 2))
      .order("difficulty", { ascending: true });

    const { data: exercises, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Pick 4: 1 pronunciation + 1 sentence + 1 vocabulary + 1 scenario/technical
    const byType = {
      pronunciation: exercises?.filter((e) => e.type === "pronunciation") ?? [],
      sentence: exercises?.filter((e) => e.type === "sentence") ?? [],
      vocabulary: exercises?.filter((e) => e.type === "vocabulary") ?? [],
      scenario: exercises?.filter((e) => e.type === "scenario") ?? [],
    };

    const plan = [
      pickRandom(byType.pronunciation),
      pickRandom(byType.sentence),
      pickRandom(byType.vocabulary),
      pickRandom(byType.scenario) || pickRandom(byType.sentence),
    ].filter(Boolean);

    return Response.json({ exercises: plan });
  }

  const { data, error } = await query.order("difficulty").limit(20);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ exercises: data });
}

function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
