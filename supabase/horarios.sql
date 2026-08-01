-- ============================================================
-- Horarios de equipo (planificación mensual por tienda)
-- Ejecutar en el SQL Editor de Supabase (New query → Run without RLS).
-- ============================================================

-- Horario de apertura de cada tienda (qué días abre y en qué franja).
-- dias: { "1": {"abierto":true,"inicio":"10:00","fin":"20:00"}, ... }  (0=domingo … 6=sábado)
create table if not exists store_horarios (
  store_id uuid primary key,
  dias     jsonb not null default '{}',
  updated_at timestamptz default now()
);
alter table store_horarios disable row level security;

-- Turnos asignados a empleados
create table if not exists shifts (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null,
  empleado_id uuid not null,
  fecha       date not null,
  hora_inicio text,
  hora_fin    text,
  created_at  timestamptz default now()
);
create index if not exists idx_shifts_store_fecha on shifts (store_id, fecha);
alter table shifts disable row level security;

-- Vendedor (empleado) que registra la venta en caja
alter table sales
  add column if not exists empleado_id uuid;

-- Tareas asignadas por día (opcionalmente a un empleado)
create table if not exists tareas (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null,
  empleado_id uuid,
  fecha       date not null,
  descripcion text not null,
  hecha       boolean not null default false,
  created_at  timestamptz default now()
);
create index if not exists idx_tareas_store_fecha on tareas (store_id, fecha);
alter table tareas disable row level security;
