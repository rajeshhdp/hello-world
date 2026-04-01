-- RPC function for upserting daily progress metrics
create or replace function upsert_progress_metrics(
  p_user_id uuid,
  p_date date,
  p_accuracy float,
  p_fluency float
)
returns void as $$
declare
  existing record;
begin
  select * into existing from progress_metrics
  where user_id = p_user_id and date = p_date;

  if existing is null then
    insert into progress_metrics (user_id, date, avg_accuracy, avg_fluency, exercises_count)
    values (p_user_id, p_date, p_accuracy, p_fluency, 1);
  else
    update progress_metrics set
      avg_accuracy = (existing.avg_accuracy * existing.exercises_count + p_accuracy) / (existing.exercises_count + 1),
      avg_fluency  = (existing.avg_fluency  * existing.exercises_count + p_fluency)  / (existing.exercises_count + 1),
      exercises_count = existing.exercises_count + 1
    where user_id = p_user_id and date = p_date;
  end if;
end;
$$ language plpgsql security definer;
