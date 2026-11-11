-- Spotter schema. Run once in the Supabase SQL editor.
-- Every device signs in anonymously (Auth > Sign In / Providers > Allow anonymous sign-ins),
-- so auth.uid() identifies the student. Swap to APU SSO / email later without schema changes.

create table profiles (
  id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 40),
  faculty text not null default 'Computing',
  sex text not null default 'M' check (sex in ('M', 'F')),
  bw numeric not null default 70 check (bw between 30 and 250),
  squat numeric not null default 0,
  bench numeric not null default 0,
  deadlift numeric not null default 0,
  intake text check (intake ~ '^[A-Z0-9()]{4,30}$'), -- APU intake code, pulls the real class timetable
  avatar_url text check (avatar_url like 'https://%'), -- photo in the public 'avatars' bucket
  created_at timestamptz not null default now()
);

create table visits (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  in_at timestamptz not null default now(),
  out_at timestamptz
);
create index on visits (user_id, in_at desc);

-- seed posts have no user_id; they carry their author in by/faculty
create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references profiles on delete cascade,
  by text, faculty text,
  title text not null check (length(title) <= 80),
  note text check (length(note) <= 500),
  exercises jsonb not null default '[]',
  volume numeric not null default 0,
  prs text[] not null default '{}',
  base_likes int not null default 0,
  created_at timestamptz not null default now()
);

create table comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references posts on delete cascade,
  user_id uuid default auth.uid() references profiles on delete cascade,
  by text,
  text text not null check (length(text) between 1 and 300),
  created_at timestamptz not null default now()
);

create table likes (
  post_id uuid not null references posts on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  primary key (post_id, user_id)
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  title text not null,
  exercises jsonb not null,
  created_at timestamptz not null default now()
);

create table food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  name text not null,
  kcal numeric not null, p numeric not null, c numeric not null, f numeric not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table visits enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;
alter table workouts enable row level security;
alter table food_logs enable row level security;

-- public: profiles (leaderboard), posts, comments, likes. private: visits, workouts, food.
create policy "read" on profiles for select using (true);
create policy "own" on profiles for insert with check (id = auth.uid());
create policy "own upd" on profiles for update using (id = auth.uid());

create policy "own" on visits for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read" on posts for select using (true);
create policy "own" on posts for insert with check (user_id = auth.uid());
create policy "own del" on posts for delete using (user_id = auth.uid());

create policy "read" on comments for select using (true);
create policy "own" on comments for insert with check (user_id = auth.uid());
create policy "own del" on comments for delete using (user_id = auth.uid());

create policy "read" on likes for select using (true);
create policy "own" on likes for insert with check (user_id = auth.uid());
create policy "own del" on likes for delete using (user_id = auth.uid());

create policy "own" on workouts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own" on food_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Live head count without exposing who is in the gym. Forgotten clock-outs expire after 4 hours.
create function gym_count() returns int language sql security definer set search_path = public stable as $$
  select count(*)::int from visits where out_at is null and in_at > now() - interval '4 hours'
$$;
grant execute on function gym_count() to anon, authenticated;

-- Following. You only see follow rows that involve you; mutual follows are "friends".
create table follows (
  follower uuid not null default auth.uid() references profiles on delete cascade,
  followee uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
alter table follows enable row level security;
create policy "mine" on follows for select using (follower = auth.uid() or followee = auth.uid());
create policy "own" on follows for insert with check (follower = auth.uid());
create policy "own del" on follows for delete using (follower = auth.uid());

-- Friends (mutual follows) who are clocked in right now. Visits stay private to everyone else.
create function friends_in_gym() returns table (id uuid, name text, avatar_url text, in_at timestamptz)
language sql security definer set search_path = public stable as $$
  select p.id, p.name, p.avatar_url, v.in_at
  from follows a
  join follows b on b.follower = a.followee and b.followee = a.follower
  join profiles p on p.id = a.followee
  join lateral (select in_at from visits where user_id = p.id and out_at is null and in_at > now() - interval '4 hours'
                order by in_at desc limit 1) v on true
  where a.follower = auth.uid()
  order by v.in_at
$$;
revoke execute on function friends_in_gym() from public, anon;
grant execute on function friends_in_gym() to authenticated;

-- Best result per student per leaderboard event (jumps, runs, pull-ups…). Squat/bench/deadlift live on profiles.
create table results (
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  event text not null check (event ~ '^[a-z0-9]{2,20}$'),
  value numeric not null check (value > 0 and value < 100000),
  updated_at timestamptz not null default now(),
  primary key (user_id, event)
);
alter table results enable row level security;
create policy "read" on results for select using (true);
create policy "own" on results for insert with check (user_id = auth.uid());
create policy "own upd" on results for update using (user_id = auth.uid());

-- Saved workout plans ("routines"). exercises = [{ name, superset?, sets: [{ kg, reps, type? }] }]
create table routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  name text not null check (length(name) between 1 and 60),
  exercises jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table routines enable row level security;
create policy "own" on routines for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Profile photos: public bucket, each student can only write inside their own <uid>/ folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png']);
create policy "avatar read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- feed updates live
alter publication supabase_realtime add table posts, comments, likes;

insert into posts (user_id, by, faculty, title, note, exercises, volume, prs, base_likes, created_at) values
  (null, 'Hafiz R.', 'Engineering', 'Heavy legs 🦵', '200 finally moved like a warm-up. Comp prep going well.',
   '[{"name":"Back Squat","best":"200 kg × 1"},{"name":"Leg Press","best":"300 kg × 8"}]', 9800, '{"Back Squat"}', 24, now() - interval '90 minutes'),
  (null, 'Priya S.', 'Business', 'Push day', null,
   '[{"name":"Bench Press","best":"62.5 kg × 2"},{"name":"Cable Fly","best":"12.5 kg × 12"}]', 4100, '{"Bench Press"}', 17, now() - interval '4 hours'),
  (null, 'Kenji T.', 'Design', 'Between classes pull session', 'Gym was empty at 2pm, highly recommend.',
   '[{"name":"Deadlift","best":"180 kg × 3"},{"name":"Lat Pulldown","best":"70 kg × 10"}]', 7200, '{}', 9, now() - interval '20 hours');

insert into comments (post_id, user_id, by, text)
  select id, null, c.by, c.text from posts p
  join (values ('Hafiz R.', 'Jun Wei', 'Monster 🔥'), ('Hafiz R.', 'Ravi M.', 'Spot me next time bro'), ('Priya S.', 'Nurul A.', 'Congrats on the PR!'))
    as c(author, by, text) on p.by = c.author;

-- Post visibility: everyone, mutual friends, or only the author. Comments and likes follow their post.
alter table posts add column if not exists visibility text not null default 'everyone' check (visibility in ('everyone', 'friends', 'private'));
create or replace function can_see_post(p posts) returns boolean language sql stable security definer set search_path = public as $$
  select p.visibility = 'everyone' or p.user_id = auth.uid() or (p.visibility = 'friends' and exists (
    select 1 from follows a join follows b on b.follower = a.followee and b.followee = a.follower
    where a.follower = auth.uid() and a.followee = p.user_id))
$$;
drop policy if exists "read" on posts;
create policy "read" on posts for select using (can_see_post(posts));
drop policy if exists "read" on comments;
create policy "read" on comments for select using (exists (select 1 from posts p where p.id = post_id));
drop policy if exists "read" on likes;
create policy "read" on likes for select using (exists (select 1 from posts p where p.id = post_id));

-- Profile header numbers and follower lists (names and photos only).
create or replace function profile_stats(uid uuid) returns table (workouts int, followers int, following int)
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from posts p where p.user_id = uid and can_see_post(p)),
         (select count(*)::int from follows where followee = uid),
         (select count(*)::int from follows where follower = uid)
$$;
create or replace function follow_list(uid uuid, kind text) returns table (id uuid, name text, faculty text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.faculty, p.avatar_url
  from follows f join profiles p on p.id = case when kind = 'followers' then f.follower else f.followee end
  where (kind = 'followers' and f.followee = uid) or (kind = 'following' and f.follower = uid)
  order by f.created_at desc
$$;
revoke execute on function profile_stats(uuid) from anon, public;
revoke execute on function follow_list(uuid, text) from anon, public;
grant execute on function profile_stats(uuid) to authenticated;
grant execute on function follow_list(uuid, text) to authenticated;

-- Student identity. TP number = APU student ID; later it links the account to APU records (timetable, course).
alter table profiles add column if not exists tp text unique check (tp ~ '^TP[0-9]{6}$');
alter table profiles add column if not exists course text check (length(course) <= 80);
alter table profiles add column if not exists bio text check (length(bio) <= 150);
alter table profiles add column if not exists unit text not null default 'kg' check (unit in ('kg', 'lb')); -- display only, weights stay kg
