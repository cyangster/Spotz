-- Spotz database schema
-- Run this in the Supabase SQL Editor

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  created_at timestamptz default now()
);

-- Groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

-- Group members
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);

-- Pins
create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  label text not null,
  status text not null check (status in ('Went', 'Want to go', 'Favorite', 'Avoid')),
  color text not null,
  icon text not null,
  notes text,
  photo_url text,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz default now()
);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.pins(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- Helper: check group membership
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

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.pins enable row level security;
alter table public.comments enable row level security;

-- Profiles policies
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

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Groups policies
create policy "Members can view their groups"
  on public.groups for select
  using (public.is_group_member(id));

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

-- Group members policies
create policy "Members can view group membership"
  on public.group_members for select
  using (public.is_group_member(group_id));

create policy "Users can join groups"
  on public.group_members for insert
  with check (user_id = auth.uid());

-- Pins policies
create policy "Members can view pins"
  on public.pins for select
  using (public.is_group_member(group_id));

create policy "Members can create pins"
  on public.pins for insert
  with check (
    public.is_group_member(group_id)
    and created_by = auth.uid()
  );

create policy "Creators can update their pins"
  on public.pins for update
  using (created_by = auth.uid() and public.is_group_member(group_id));

create policy "Creators can delete their pins"
  on public.pins for delete
  using (created_by = auth.uid() and public.is_group_member(group_id));

-- Comments policies
create policy "Members can view comments"
  on public.comments for select
  using (
    exists (
      select 1 from public.pins p
      where p.id = comments.pin_id
        and public.is_group_member(p.group_id)
    )
  );

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

-- Storage bucket for pin photos
insert into storage.buckets (id, name, public)
values ('pin-photos', 'pin-photos', true)
on conflict (id) do nothing;

create policy "Members can upload pin photos"
  on storage.objects for insert
  with check (
    bucket_id = 'pin-photos'
    and auth.role() = 'authenticated'
  );

create policy "Anyone can view pin photos"
  on storage.objects for select
  using (bucket_id = 'pin-photos');

-- Enable realtime
alter publication supabase_realtime add table public.pins;
alter publication supabase_realtime add table public.comments;
