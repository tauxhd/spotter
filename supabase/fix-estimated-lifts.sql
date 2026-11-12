-- One-off sync for Ranks: profile squat / bench / deadlift used to be saved as an estimated 1RM after each workout, so
-- someone repping light weight could out-rank a heavy single. Set every lift that has logged sets to the heaviest weight
-- actually lifted (ticked, at least 1 rep, no warm-up / assisted sets), rounded down to a 2.5 kg plate: the same rule the
-- app now uses when you finish a workout. Lifts with nothing logged keep the value typed in at sign-up.
with sets as (
  select w.user_id, e->>'name' as lift, (s->>'kg')::numeric as kg
  from workouts w, jsonb_array_elements(w.exercises) e, jsonb_array_elements(e->'sets') s
  where e->>'name' in ('Squat (Barbell)', 'Bench Press (Barbell)', 'Deadlift (Barbell)')
    and coalesce((s->>'done')::boolean, false) and coalesce(s->>'type', '') not in ('warmup', 'assisted') and (s->>'reps')::int > 0
), top as (
  select user_id,
    floor(max(kg) filter (where lift = 'Squat (Barbell)') / 2.5) * 2.5 as squat,
    floor(max(kg) filter (where lift = 'Bench Press (Barbell)') / 2.5) * 2.5 as bench,
    floor(max(kg) filter (where lift = 'Deadlift (Barbell)') / 2.5) * 2.5 as deadlift
  from sets group by user_id
)
update profiles p set squat = coalesce(t.squat, p.squat), bench = coalesce(t.bench, p.bench), deadlift = coalesce(t.deadlift, p.deadlift)
from top t
where t.user_id = p.id
  and (p.squat is distinct from coalesce(t.squat, p.squat) or p.bench is distinct from coalesce(t.bench, p.bench) or p.deadlift is distinct from coalesce(t.deadlift, p.deadlift))
returning p.name, p.tp, p.squat, p.bench, p.deadlift;
