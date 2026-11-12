-- One-off fix: profile squat / bench / deadlift used to be saved as an estimated 1RM after each workout. Where a stored lift
-- is exactly the (plate-rounded) estimate from one of that person's logged sets and higher than anything they actually
-- lifted, put it back to the heaviest weight they really lifted. Values typed in at sign-up (no matching estimate) stay.
with sets as (
  select w.user_id, e->>'name' as lift, (s->>'kg')::numeric as kg, (s->>'reps')::int as reps
  from workouts w, jsonb_array_elements(w.exercises) e, jsonb_array_elements(e->'sets') s
  where e->>'name' in ('Squat (Barbell)', 'Bench Press (Barbell)', 'Deadlift (Barbell)')
    and coalesce((s->>'done')::boolean, false) and coalesce(s->>'type', '') not in ('warmup', 'assisted') and (s->>'reps')::int > 0
), est as ( -- each set's estimated 1RM, rounded down to a 2.5 kg plate, the way it used to be saved
  select user_id, lift, kg, floor(case when reps <= 1 then kg
    else (kg * (1 + least(reps, 12) / 30.0) + kg * 36 / (37 - least(reps, 12))) / 2 end / 2.5) * 2.5 as e
  from sets
), top as (
  select user_id, lift, floor(max(kg) / 2.5) * 2.5 as heaviest, array_agg(distinct e) as estimates from est group by user_id, lift
), fix as (
  select p.id, t.lift, case t.lift when 'Squat (Barbell)' then p.squat when 'Bench Press (Barbell)' then p.bench else p.deadlift end as stored, t.heaviest, t.estimates
  from profiles p join top t on t.user_id = p.id
)
update profiles p set
  squat = coalesce((select f.heaviest from fix f where f.id = p.id and f.lift = 'Squat (Barbell)' and f.stored > f.heaviest and f.stored = any(f.estimates)), p.squat),
  bench = coalesce((select f.heaviest from fix f where f.id = p.id and f.lift = 'Bench Press (Barbell)' and f.stored > f.heaviest and f.stored = any(f.estimates)), p.bench),
  deadlift = coalesce((select f.heaviest from fix f where f.id = p.id and f.lift = 'Deadlift (Barbell)' and f.stored > f.heaviest and f.stored = any(f.estimates)), p.deadlift)
where p.id in (select id from fix where stored > heaviest and stored = any(estimates))
returning p.name, p.tp, p.squat, p.bench, p.deadlift;
