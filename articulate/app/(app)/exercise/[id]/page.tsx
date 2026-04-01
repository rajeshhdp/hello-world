import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ExercisePlayer from "./ExercisePlayer";

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: exercise }, { data: { user } }] = await Promise.all([
    supabase.from("exercises").select("*").eq("id", id).single(),
    supabase.auth.getUser(),
  ]);

  if (!exercise) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("native_language, it_role")
    .eq("id", user!.id)
    .single();

  return (
    <ExercisePlayer
      exercise={exercise}
      nativeLanguage={profile?.native_language ?? "unknown"}
      itRole={profile?.it_role ?? "engineer"}
    />
  );
}
