-- Run this in Supabase SQL editor

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  home_address text not null,
  age int not null check (age >= 18),

  education_level text not null,
  education_results text,

  has_call_center_experience boolean not null,
  comments text,

  speed_download_mbps numeric not null check (speed_download_mbps >= 100),
  speed_upload_mbps numeric not null check (speed_upload_mbps >= 100),
  speed_ping_ms numeric,

  status text not null default 'Submitted',
  admin_notes text,

  created_at timestamptz not null default now()
);

create unique index if not exists applications_email_unique
on public.applications (lower(email));

create table if not exists public.application_files (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  file_type text not null, -- resume | speedtest_screenshot | pc_specs_screenshot
  storage_path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.application_references (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  ref_name text not null,
  relationship text not null,
  ref_phone text not null,
  ref_email text
);

-- Recommended: basic RLS
alter table public.applications enable row level security;
alter table public.application_files enable row level security;
alter table public.application_references enable row level security;

-- Public can insert applications (via server route); deny direct anon access by default
-- Admin reads happen via authenticated user + allowlist at app layer (MVP).
-- If you want strict DB-level admin controls, add an "admins" table + policies later.


-- =========================
-- Clock-in / Timesheets (Remote 1099)
-- =========================

create table if not exists public.contractor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null default (now()::date),
  campaign text,
  task_code text,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  break_minutes int not null default 0,
  end_of_shift_note text,
  status text not null default 'Submitted',
  supervisor_note text,
  created_at timestamptz not null default now()
);

create index if not exists time_entries_user_date_idx on public.time_entries(user_id, work_date);
create index if not exists time_entries_status_idx on public.time_entries(status);

alter table public.contractor_profiles enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "contractor_profiles_select_own" on public.contractor_profiles;
create policy "contractor_profiles_select_own"
on public.contractor_profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "contractor_profiles_update_own" on public.contractor_profiles;
create policy "contractor_profiles_update_own"
on public.contractor_profiles for update
to authenticated
using (auth.uid() = user_id);

drop policy if exists "time_entries_select_own" on public.time_entries;
create policy "time_entries_select_own"
on public.time_entries for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "time_entries_insert_own" on public.time_entries;
create policy "time_entries_insert_own"
on public.time_entries for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "time_entries_update_own" on public.time_entries;
create policy "time_entries_update_own"
on public.time_entries for update
to authenticated
using (auth.uid() = user_id);



-- =========================
-- Admin hours/pay additions
-- =========================

alter table public.contractor_profiles
  add column if not exists email text;

alter table public.contractor_profiles
  add column if not exists pay_type text not null default 'hourly';

alter table public.contractor_profiles
  add column if not exists pay_rate numeric not null default 0;



-- =========================
-- Occurrences / Attendance log
-- Option A: Agents cannot see occurrences (admin-only via service role)
-- =========================

create table if not exists public.occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_date date not null default (now()::date),
  occurrence_type text not null, -- Late | Call Out | No Call No Show | Early Logout | Coaching | Warning | Other
  points numeric not null default 0, -- optional: attendance points
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists occurrences_user_date_idx on public.occurrences(user_id, occurrence_date);
create index if not exists occurrences_date_idx on public.occurrences(occurrence_date);

alter table public.occurrences enable row level security;

-- No RLS policies on occurrences for authenticated users (agents) => they cannot read/write.
-- Admin access is provided through server-side service role (API routes).

