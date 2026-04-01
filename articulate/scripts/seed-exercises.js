#!/usr/bin/env node
/**
 * Seed exercises into Supabase.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=... node scripts/seed-exercises.js
 *
 * Or copy .env.local values into your shell first:
 *   source .env.local && node scripts/seed-exercises.js
 */

const { createClient } = require("@supabase/supabase-js");
const exercises = require("../data/seed/exercises.json");

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log(`Seeding ${exercises.length} exercises…`);

  const { data, error } = await supabase
    .from("exercises")
    .upsert(exercises, { onConflict: "title" })
    .select();

  if (error) {
    console.error("Error seeding exercises:", error.message);
    process.exit(1);
  }

  console.log(`✓ Seeded ${data.length} exercises successfully`);
}

seed();
