-- =============================================================================
-- Spotz — complete Supabase setup
-- =============================================================================
-- Run this entire file in Supabase → SQL Editor → New query → Run.
-- Safe to re-run on an existing project (policies/triggers are replaced).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text unique not null,
  email text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);

create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  label text not null,
  status text not null check (status in ('Went', 'Want to go', 'Favorite', 'Avoid')),
  category text not null default 'Other' check (
    category in ('Park', 'Restaurant', 'Cafe', 'Bar', 'Shop', 'Beach', 'Hike', 'Home', 'Other')
  ),
  color text not null,
  icon text not null,
  notes text,
  photo_url text,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.pins(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.mention_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (user_id, comment_id)
);


-- -----------------------------------------------------------------------------
-- Functions
-- -----------------------------------------------------------------------------

-- Auto-create profile when a user signs up (works with email confirmation)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(
      nullif(
        lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '[^a-z0-9_]', '', 'g')),
        ''
      ),
      'user' || substr(replace(new.id::text, '-', ''), 1, 8)
    ),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Check whether the current user belongs to a group
create or replace function public.is_group_member(check_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = check_group_id
      and user_id = auth.uid()
  );
$$;

-- Look up a group by invite code (for joining; bypasses member-only SELECT policy)
create or replace function public.get_group_id_by_invite_code(code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.groups where invite_code = upper(trim(code)) limit 1;
$$;

grant execute on function public.get_group_id_by_invite_code(text) to authenticated;

-- Quick status update from pin card (pin owner only)
create or replace function public.update_pin_status(p_pin_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_created_by uuid;
begin
  if p_status not in ('Went', 'Want to go', 'Favorite', 'Avoid') then
    raise exception 'invalid status';
  end if;

  select group_id, created_by
  into v_group_id, v_created_by
  from public.pins
  where id = p_pin_id;

  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'not allowed';
  end if;

  if v_created_by is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;

  update public.pins set status = p_status where id = p_pin_id;
end;
$$;

grant execute on function public.update_pin_status(uuid, text) to authenticated;


-- -----------------------------------------------------------------------------
-- Auth trigger
-- -----------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.pins enable row level security;
alter table public.comments enable row level security;
alter table public.mention_reads enable row level security;

-- Profiles
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can view profiles of group co-members" on public.profiles;
create policy "Users can view profiles of group co-members"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = profiles.id
    )
  );

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Groups
drop policy if exists "Members can view their groups" on public.groups;
create policy "Members can view their groups"
  on public.groups for select
  using (
    public.is_group_member(id)
    or created_by = auth.uid()
  );

drop policy if exists "Authenticated users can create groups" on public.groups;
create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

-- Group members
drop policy if exists "Members can view group membership" on public.group_members;
create policy "Members can view group membership"
  on public.group_members for select
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id)
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.created_by = auth.uid()
    )
  );

drop policy if exists "Users can join groups" on public.group_members;
create policy "Users can join groups"
  on public.group_members for insert
  with check (user_id = auth.uid());

-- Pins
drop policy if exists "Members can view pins" on public.pins;
create policy "Members can view pins"
  on public.pins for select
  using (public.is_group_member(group_id));

drop policy if exists "Members can create pins" on public.pins;
create policy "Members can create pins"
  on public.pins for insert
  with check (
    public.is_group_member(group_id)
    and created_by = auth.uid()
  );

drop policy if exists "Creators can update their pins" on public.pins;
create policy "Creators can update their pins"
  on public.pins for update
  using (created_by = auth.uid() and public.is_group_member(group_id));

drop policy if exists "Creators can delete their pins" on public.pins;
create policy "Creators can delete their pins"
  on public.pins for delete
  using (created_by = auth.uid() and public.is_group_member(group_id));

-- Comments
drop policy if exists "Members can view comments" on public.comments;
create policy "Members can view comments"
  on public.comments for select
  using (
    exists (
      select 1 from public.pins p
      where p.id = comments.pin_id
        and public.is_group_member(p.group_id)
    )
  );

drop policy if exists "Members can post comments" on public.comments;
create policy "Members can post comments"
  on public.comments for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.pins p
      where p.id = comments.pin_id
        and public.is_group_member(p.group_id)
    )
  );

-- Mention read tracking (@ notification badges)
drop policy if exists "Users manage own mention reads" on public.mention_reads;
create policy "Users manage own mention reads"
  on public.mention_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- -----------------------------------------------------------------------------
-- Storage (pin photos)
-- Path format: {groupId}/{userId}/{filename}
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('pin-photos', 'pin-photos', true)
on conflict (id) do nothing;

drop policy if exists "Members can upload pin photos" on storage.objects;
create policy "Members can upload pin photos"
  on storage.objects for insert
  with check (
    bucket_id = 'pin-photos'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[2]
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Anyone can view pin photos" on storage.objects;
create policy "Anyone can view pin photos"
  on storage.objects for select
  using (bucket_id = 'pin-photos');


-- -----------------------------------------------------------------------------
-- Storage (profile avatars)
-- Path format: {userId}/avatar.{ext}
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');


-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pins'
  ) then
    alter publication supabase_realtime add table public.pins;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- Backfill / migrate existing projects
-- -----------------------------------------------------------------------------

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.pins add column if not exists category text;
alter table public.pins add column if not exists address text;

update public.pins set category = 'Other' where category is null;

update public.profiles
set username = 'user' || substr(replace(id::text, '-', ''), 1, 8)
where username is null;

insert into public.profiles (id, display_name, username, email)
select
  id,
  coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1)),
  coalesce(
    nullif(
      lower(regexp_replace(coalesce(raw_user_meta_data->>'username', ''), '[^a-z0-9_]', '', 'g')),
      ''
    ),
    'user' || substr(replace(id::text, '-', ''), 1, 8)
  ),
  coalesce(email, '')
from auth.users
where id not in (select id from public.profiles);
