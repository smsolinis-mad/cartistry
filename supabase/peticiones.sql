-- ============================================================
-- Peticiones de vacaciones / días libres (Equipo · Peticiones)
-- Ejecutar en el SQL Editor de Supabase (New query → Run without RLS).
-- ============================================================
create table if not exists peticiones (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid,
  empleado_id  uuid not null,
  tipo         text not null default 'vacaciones',  -- 'vacaciones' | 'dia_libre'
  fecha_inicio date not null,
  fecha_fin    date not null,
  motivo       text,
  estado       text not null default 'pendiente',   -- 'pendiente' | 'aprobada' | 'rechazada'
  created_at   timestamptz default now(),
  resuelta_at  timestamptz
);
create index if not exists idx_peticiones_user on peticiones (user_id);
alter table peticiones disable row level security;
