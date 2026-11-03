-- Campus OS: optional future database schema. The initial app does NOT require this.
-- Apply in Supabase SQL editor. Authentication and app_metadata roles must be managed server-side.
create extension if not exists pgcrypto;

create or replace function public.is_administrator() returns boolean
language sql stable security invoker set search_path = ''
as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('administrator','admin'), false) $$;
revoke all on function public.is_administrator() from public, anon;
grant execute on function public.is_administrator() to authenticated;

create table if not exists public.students (
 id uuid primary key default gen_random_uuid(), student_id text not null unique,
 first_name text not null, last_name text not null, class_name text not null,
 gender text check (gender in ('female','male','unspecified')),
 date_of_birth date, guardian_contact text, notes text,
 status text not null default 'active' check (status in ('active','inactive')),
 created_at timestamptz not null default now()
);
create table if not exists public.attendance (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 date date not null, status text not null check (status in ('present','absent','late','excused')),
 reason text, notes text, time time, absence_type text check (absence_type in ('medical','family','authorized','unexplained','other')),
 updated_at timestamptz not null default now(), unique(student_id,date)
);
create table if not exists public.items (
 id uuid primary key default gen_random_uuid(), item_name text not null,
 category text not null check (category in ('electronics','clothing','bags','books','accessories','schoolSupplies','other')),
 description text not null, report_type text not null check (report_type in ('lost','found')),
 date_reported date not null, location text not null, reporter_name text not null,
 contact_information text, reporter_student_id uuid references public.students(id) on delete set null,
 image_url text, status text not null check (status in ('lost','found','claimed','archived')),
 claimed_by text, claimed_at date, claim jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.activities (
 id uuid primary key default gen_random_uuid(), action_type text not null, description text not null,
 administrator text not null, timestamp timestamptz not null default now(), params jsonb not null default '{}'::jsonb,
 entity_type text, entity_id uuid
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), title text not null, description text not null,
 read boolean not null default false, created_at timestamptz not null default now(),
 kind text not null check (kind in ('absence','lost','found','claimed','system','activity')),
 params jsonb not null default '{}'::jsonb, link text
);
create index if not exists attendance_date_idx on public.attendance(date);
create index if not exists students_class_idx on public.students(class_name);
create index if not exists items_status_idx on public.items(status);
create index if not exists activities_timestamp_idx on public.activities(timestamp desc);

-- RLS is deny-by-default. Never use a service-role key in the browser or AI handler.
do $$ declare t text; begin foreach t in array array['students','attendance','items','activities','notifications'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy administrator_read on public.%I for select to authenticated using (public.is_administrator())',t);
 if t <> 'activities' then
  execute format('grant insert, update, delete on public.%I to authenticated',t);
  execute format('create policy administrator_insert on public.%I for insert to authenticated with check (public.is_administrator())',t);
  execute format('create policy administrator_update on public.%I for update to authenticated using (public.is_administrator()) with check (public.is_administrator())',t);
  if t <> 'notifications' then
   execute format('create policy administrator_delete on public.%I for delete to authenticated using (public.is_administrator())',t);
  end if;
 else
  execute format('grant insert on public.%I to authenticated',t);
  execute format('create policy administrator_append on public.%I for insert to authenticated with check (public.is_administrator())',t);
 end if;
end loop; end $$;
