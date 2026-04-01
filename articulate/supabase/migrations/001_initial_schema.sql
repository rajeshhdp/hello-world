-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase Auth users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  native_language text,
  it_role text check (it_role in ('engineer', 'manager', 'architect', 'designer', 'qa', 'devops', 'other')),
  difficulty_level float not null default 3.0 check (difficulty_level >= 1.0 and difficulty_level <= 10.0),
  streak_days int not null default 0,
  last_active_date date,
  created_at timestamptz not null default now()
);

-- Exercises
create table if not exists exercises (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('pronunciation', 'sentence', 'vocabulary', 'scenario')),
  domain text check (domain in ('meetings', 'presentations', 'interviews', 'technical')),
  difficulty float not null check (difficulty >= 1.0 and difficulty <= 10.0),
  reference_text text not null,
  title text not null,
  instructions text,
  target_words text[],
  model_audio_url text
);

-- Sessions (practice attempts)
create table if not exists sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  exercise_id uuid references exercises on delete set null,
  transcript text,
  score_accuracy float check (score_accuracy >= 0 and score_accuracy <= 100),
  score_fluency float check (score_fluency >= 0 and score_fluency <= 100),
  score_completeness float check (score_completeness >= 0 and score_completeness <= 100),
  audio_path text,
  feedback jsonb,
  duration_seconds int,
  created_at timestamptz not null default now()
);

-- Daily progress metrics (upserted per user per day)
create table if not exists progress_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  avg_accuracy float,
  avg_fluency float,
  exercises_count int not null default 0,
  unique (user_id, date)
);

-- Row Level Security
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table progress_metrics enable row level security;
alter table exercises enable row level security;

-- Profiles: users can only read/write their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Sessions: users can only access their own sessions
create policy "Users can view own sessions" on sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own sessions" on sessions
  for insert with check (auth.uid() = user_id);

-- Progress: users can only access their own metrics
create policy "Users can view own progress" on progress_metrics
  for select using (auth.uid() = user_id);

create policy "Users can upsert own progress" on progress_metrics
  for insert with check (auth.uid() = user_id);

create policy "Users can update own progress" on progress_metrics
  for update using (auth.uid() = user_id);

-- Exercises: readable by all authenticated users
create policy "Authenticated users can read exercises" on exercises
  for select using (auth.role() = 'authenticated');

-- Trigger to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Index for fast session queries by user
create index if not exists sessions_user_id_created_at on sessions (user_id, created_at desc);
create index if not exists progress_metrics_user_id_date on progress_metrics (user_id, date desc);
