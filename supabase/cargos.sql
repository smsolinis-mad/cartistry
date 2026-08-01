-- ============================================================
-- Cargos del equipo (con accesos a secciones de la web)
-- Ejecutar en el SQL Editor de Supabase (New query → Run without RLS).
-- ============================================================
create table if not exists cargos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  nombre     text not null,
  accesos    text[] default '{}',   -- claves de sección: resumen, ventas, caja, ...
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cargos_user on cargos (user_id);
alter table cargos disable row level security;
