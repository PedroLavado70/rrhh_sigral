-- SIGRAL RRHH & Proyectos - Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin','editor','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  dni text,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  profession text,
  specialty text,
  position text,
  area text,
  salary numeric(12,2),
  status text not null default 'Activo' check (status in ('Activo','Inactivo','Retirado')),
  contract_type text,
  start_date date,
  contract_end_date date,
  notes text,
  created_by uuid references public.app_users(id) on delete set null,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  client text,
  sector text,
  project_type text,
  status text not null default 'Formulación',
  start_date date,
  end_date date,
  amount numeric(14,2),
  required_resources integer default 0,
  location text,
  manager_name text,
  description text,
  created_by uuid references public.app_users(id) on delete set null,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  role_name text,
  participation_pct numeric(5,2) not null default 100 check (participation_pct >= 0 and participation_pct <= 100),
  start_date date not null,
  end_date date,
  notes text,
  created_by uuid references public.app_users(id) on delete set null,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_assignment unique (project_id, employee_id, start_date)
);

create table if not exists public.audit_log (
  id bigserial primary key,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  actor_email text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- recreate triggers safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_app_users_updated_at') THEN
    CREATE TRIGGER trg_app_users_updated_at BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_employees_updated_at') THEN
    CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_updated_at') THEN
    CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assignments_updated_at') THEN
    CREATE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

create or replace function public.log_audit()
returns trigger
language plpgsql
as $$
declare
  v_payload jsonb;
  v_record_id text;
begin
  if TG_OP = 'DELETE' then
    v_payload := to_jsonb(old);
    v_record_id := coalesce(old.id::text, '');
  else
    v_payload := to_jsonb(new);
    v_record_id := coalesce(new.id::text, '');
  end if;

  insert into public.audit_log(table_name, record_id, action, payload)
  values (TG_TABLE_NAME, v_record_id, TG_OP, v_payload);

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_employees_audit') THEN
    CREATE TRIGGER trg_employees_audit AFTER INSERT OR UPDATE OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_audit') THEN
    CREATE TRIGGER trg_projects_audit AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assignments_audit') THEN
    CREATE TRIGGER trg_assignments_audit AFTER INSERT OR UPDATE OR DELETE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;
END $$;

create index if not exists idx_employees_status on public.employees(status);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_sector on public.projects(sector);
create index if not exists idx_assignments_project on public.assignments(project_id);
create index if not exists idx_assignments_employee on public.assignments(employee_id);
create index if not exists idx_assignments_dates on public.assignments(start_date, end_date);

-- RLS: disabled because this setup uses Netlify Functions with service_role.
-- Recommended for first production rollout to avoid anon access issues.
alter table public.app_users enable row level security;
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.assignments enable row level security;
alter table public.audit_log enable row level security;

-- Deny direct client access by default.
create policy "deny direct select app_users" on public.app_users for select using (false);
create policy "deny direct insert app_users" on public.app_users for insert with check (false);
create policy "deny direct update app_users" on public.app_users for update using (false);
create policy "deny direct delete app_users" on public.app_users for delete using (false);

create policy "deny direct select employees" on public.employees for select using (false);
create policy "deny direct insert employees" on public.employees for insert with check (false);
create policy "deny direct update employees" on public.employees for update using (false);
create policy "deny direct delete employees" on public.employees for delete using (false);

create policy "deny direct select projects" on public.projects for select using (false);
create policy "deny direct insert projects" on public.projects for insert with check (false);
create policy "deny direct update projects" on public.projects for update using (false);
create policy "deny direct delete projects" on public.projects for delete using (false);

create policy "deny direct select assignments" on public.assignments for select using (false);
create policy "deny direct insert assignments" on public.assignments for insert with check (false);
create policy "deny direct update assignments" on public.assignments for update using (false);
create policy "deny direct delete assignments" on public.assignments for delete using (false);

create policy "deny direct select audit" on public.audit_log for select using (false);
create policy "deny direct insert audit" on public.audit_log for insert with check (false);
create policy "deny direct update audit" on public.audit_log for update using (false);
create policy "deny direct delete audit" on public.audit_log for delete using (false);

-- Seed initial admin user
insert into public.app_users (email, full_name, role, is_active)
values ('admin@sigral.com', 'Administrador SIGRAL', 'admin', true)
on conflict (email) do nothing;
