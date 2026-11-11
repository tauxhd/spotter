-- Demo training history: ~60 Push/Pull/Leg sessions over the last ~10 months for every profile, rising from ~70% to
-- ~92% of the profile's own squat / bench / deadlift (kept under them, so leaderboards don't move).
-- Every exercise carries "seed": true; re-running replaces the old seed rows.
delete from workouts where exercises->0->>'seed' = 'true';

with t(day, ord, name, a, share, reps, step) as (values
  (0, 1, 'Bench Press (Barbell)', 'B', 1.0, 5, 2.5), (0, 2, 'Incline Bench Press (Barbell)', 'B', 0.8, 8, 2.5),
  (0, 3, 'Shoulder Press (Dumbbell)', 'B', 0.26, 10, 1), (0, 4, 'Triceps Pushdown (Rope)', 'B', 0.4, 12, 2.5),
  (1, 1, 'Deadlift (Barbell)', 'D', 1.0, 3, 2.5), (1, 2, 'Pull Up', 'B', 0, 10, 1),
  (1, 3, 'Lat Pulldown (Cable)', 'B', 0.75, 10, 2.5), (1, 4, 'Seated Cable Row', 'B', 0.75, 10, 2.5), (1, 5, 'Bicep Curl (Dumbbell)', 'B', 0.2, 10, 1),
  (2, 1, 'Squat (Barbell)', 'S', 1.0, 5, 2.5), (2, 2, 'Romanian Deadlift (Barbell)', 'D', 0.65, 8, 2.5),
  (2, 3, 'Leg Press (Machine)', 'S', 1.8, 10, 5), (2, 4, 'Standing Calf Raise (Machine)', 'S', 0.8, 12, 5)
), s as (
  select p.id as uid, p.squat as sq, p.bench as be, p.deadlift as dl, i,
    (array['Push day', 'Pull day', 'Leg day'])[i % 3 + 1] as title,
    0.70 + 0.22 * i / 60.0 + (random() - 0.5) * 0.06 as f,
    timestamptz '2026-11-09 00:00+08' - ((60 - i) * 5 - floor(random() * 3)) * interval '1 day' + (8 + floor(random() * 12)) * interval '1 hour' as at
  from profiles p, generate_series(0, 59) i
)
insert into workouts (user_id, title, exercises, created_at)
select s.uid, s.title,
  (select jsonb_agg(jsonb_build_object('name', t.name, 'seed', true, 'sets',
      (case when t.share >= 1 then jsonb_build_array(jsonb_build_object('kg', greatest(t.step, round(w.kg * 0.5 / t.step) * t.step), 'reps', 8, 'done', true, 'type', 'warmup')) else '[]'::jsonb end)
      || jsonb_build_array(
           jsonb_build_object('kg', w.kg, 'reps', t.reps + (random() < 0.25)::int, 'done', true),
           jsonb_build_object('kg', w.kg, 'reps', t.reps, 'done', true),
           jsonb_build_object('kg', w.kg, 'reps', t.reps - (random() < 0.3)::int, 'done', true))
    ) order by t.ord)
   from t cross join lateral (select case when t.share = 0 then 0
     else greatest(t.step, round((case t.a when 'S' then s.sq when 'B' then s.be else s.dl end) * t.share * s.f / (1 + t.reps / 30.0) / t.step) * t.step) end as kg) w
   where t.day = s.i % 3),
  s.at
from s;

select count(*) from workouts;
