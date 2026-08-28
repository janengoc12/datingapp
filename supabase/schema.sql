-- Couple Memories — Supabase schema
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).
--
-- Model: a user signs in with Google, then pairs with their partner via a
-- one-time invite code. Memories belong to a couple, not to one user, and
-- Row Level Security restricts every table to members of that couple.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (user_id)
);

create table public.couple_invites (
  code text primary key,
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references auth.users (id),
  used_at timestamptz
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  title text not null,
  date date not null,
  note text not null default '',
  photo_url text not null default '',
  created_at timestamptz not null default now()
);

create index memories_couple_id_date_idx on public.memories (couple_id, date desc);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever someone signs up (e.g. via Google)
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helper: is the current user a member of a given couple?
-- (security definer so it can be used inside RLS policies without recursion)
-- ---------------------------------------------------------------------------

create function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = target_couple_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Pairing: create-or-reuse an invite code, and redeem one to join a couple.
-- Both run as security definer so they can create the couple/membership rows
-- without needing broad insert policies on those tables.
-- ---------------------------------------------------------------------------

create function public.create_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  my_couple_id uuid;
  new_code text;
begin
  select couple_id into my_couple_id
  from public.couple_members
  where user_id = auth.uid();

  if my_couple_id is null then
    insert into public.couples default values returning id into my_couple_id;
    insert into public.couple_members (couple_id, user_id) values (my_couple_id, auth.uid());
  end if;

  new_code := upper(substr(md5(random()::text), 1, 6));
  insert into public.couple_invites (code, couple_id, created_by)
  values (new_code, my_couple_id, auth.uid());

  return new_code;
end;
$$;

create function public.redeem_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  already_paired uuid;
  target_couple_id uuid;
begin
  select couple_id into already_paired
  from public.couple_members
  where user_id = auth.uid();

  if already_paired is not null then
    raise exception 'You already belong to a couple';
  end if;

  select couple_id into target_couple_id
  from public.couple_invites
  where code = upper(invite_code) and used_at is null and expires_at > now();

  if target_couple_id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  insert into public.couple_members (couple_id, user_id) values (target_couple_id, auth.uid());

  update public.couple_invites
  set used_by = auth.uid(), used_at = now()
  where code = upper(invite_code);

  return target_couple_id;
end;
$$;

grant execute on function public.create_invite() to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invites enable row level security;
alter table public.memories enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid());

create policy "couples: read own couple" on public.couples
  for select using (public.is_couple_member(id));

create policy "couple_members: read own couple's members" on public.couple_members
  for select using (public.is_couple_member(couple_id));

create policy "memories: read own couple's memories" on public.memories
  for select using (public.is_couple_member(couple_id));

create policy "memories: add to own couple" on public.memories
  for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());

create policy "memories: delete from own couple" on public.memories
  for delete using (public.is_couple_member(couple_id));

-- couple_invites has no client-facing policies: invites are only ever
-- created/redeemed through the security-definer functions above.
