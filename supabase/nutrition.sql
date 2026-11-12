-- Nutrition plan + weigh-ins for the Eat tab's Progress view (maintenance calories, weight trend, targets).
-- Safe to re-run: schema changes are idempotent and the demo history (seed = true) is replaced.

alter table profiles
  add column if not exists height numeric check (height between 120 and 230),
  add column if not exists age int check (age between 13 and 90),
  add column if not exists goal text not null default 'lean-bulk' check (goal in ('lean-bulk', 'cut', 'fat-loss', 'recomp', 'maintain')),
  add column if not exists activity numeric not null default 1.55 check (activity between 1.2 and 1.9),
  add column if not exists goal_bw numeric check (goal_bw between 30 and 250);

create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  kg numeric not null check (kg between 30 and 250),
  seed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists weight_logs_user on weight_logs (user_id, created_at desc);
alter table weight_logs enable row level security;
drop policy if exists "own" on weight_logs;
create policy "own" on weight_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table food_logs add column if not exists seed boolean not null default false;

-- Demo history: 5 weeks of cafeteria meals and morning weigh-ins for every profile, ending yesterday (today stays
-- empty for live logging). Weight drifts up ~0.8 kg towards the profile's bodyweight, like a lean bulk.
delete from food_logs where seed;
delete from weight_logs where seed;

with dish(name, kcal, p, c, f, main) as (values
  ('Nasi lemak + fried chicken', 780, 32, 85, 34, true), ('Economy rice (1 meat, 2 veg)', 650, 28, 90, 18, true),
  ('Mee goreng mamak', 660, 18, 88, 26, true), ('Ayam penyet', 820, 42, 80, 36, true),
  ('Chicken rice (roasted)', 600, 35, 75, 16, true), ('Wantan mee', 520, 22, 70, 16, true),
  ('Steamed fish + rice', 480, 35, 60, 8, true), ('Chicken briyani', 850, 38, 100, 30, true),
  ('Tandoori chicken + naan', 720, 48, 65, 26, true), ('Grilled chicken + mash', 620, 48, 50, 22, true),
  ('Spaghetti bolognese', 650, 28, 85, 20, true), ('Chicken shawarma wrap', 550, 35, 50, 22, true),
  ('Teriyaki chicken rice', 650, 40, 85, 14, true), ('Chicken ramen', 600, 32, 70, 20, true),
  ('Chicken katsu don', 850, 38, 110, 26, true), ('Chicken burger', 500, 28, 42, 24, true),
  ('Roti canai + dhal', 420, 11, 54, 18, false), ('Kaya toast + 2 half-boiled eggs', 420, 16, 40, 22, false),
  ('Teh tarik', 160, 4, 26, 4, false), ('Milo ais', 220, 6, 38, 5, false), ('Banana', 105, 1.3, 27, 0.4, false),
  ('Boiled eggs ×2', 140, 12, 1, 10, false)
), today as (select date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur') as t),
days as (select p.id as uid, d from profiles p, generate_series(1, 35) d where random() < 0.9),
meals as (
  select days.uid, days.d, m.name, m.kcal, m.p, m.c, m.f, (array[8, 13, 19])[m.rn] as hour
  from days cross join lateral (
    select dish.*, row_number() over (order by random() + days.d * 0) as rn from dish where main
  ) m where m.rn <= 3
  union all
  select days.uid, days.d, s.name, s.kcal, s.p, s.c, s.f, 16
  from days cross join lateral (
    select dish.*, row_number() over (order by random() + days.d * 0) as rn from dish where not main
  ) s where s.rn = 1
  union all
  select days.uid, days.d, 'Whey shake (1 scoop + water)', 120, 24, 3, 1.5, 18 from days where random() < 0.6
)
insert into food_logs (user_id, name, kcal, p, c, f, seed, created_at)
select uid, name, kcal, p, c, f, true, (today.t - d * interval '1 day' + hour * interval '1 hour' + floor(random() * 40) * interval '1 minute') at time zone 'Asia/Kuala_Lumpur'
from meals, today;

insert into weight_logs (user_id, kg, seed, created_at)
select p.id, round((p.bw - 0.8 * d / 35.0 + (random() - 0.5) * 0.8)::numeric, 1), true,
  (today.t - d * interval '1 day' + interval '7 hours') at time zone 'Asia/Kuala_Lumpur'
from profiles p, generate_series(1, 35) d, (select date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur') as t) today
where random() < 0.8;
