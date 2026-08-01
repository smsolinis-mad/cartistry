-- ============================================================
-- Foto y documentos de empleados (Equipo · Datos)
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1) Foto del empleado
alter table empleados
  add column if not exists foto_url text;

-- 2) Documentos del empleado (CV, contrato, certificados, nóminas)
create table if not exists empleado_documentos (
  id          uuid primary key default gen_random_uuid(),
  empleado_id uuid not null,
  user_id     uuid,
  tipo        text not null,       -- 'cv' | 'contrato' | 'certificado' | 'nomina'
  nombre      text,                -- nombre original del archivo
  path        text not null,       -- ruta en el bucket
  url         text,                -- URL pública
  created_at  timestamptz default now()
);
create index if not exists idx_empleado_docs on empleado_documentos (empleado_id);
alter table empleado_documentos disable row level security;

-- 3) Bucket de almacenamiento (lectura pública)
insert into storage.buckets (id, name, public)
values ('empleados', 'empleados', true)
on conflict (id) do nothing;

-- 4) Políticas permisivas para el bucket (coherente con el MVP sin RLS)
drop policy if exists "empleados_read" on storage.objects;
drop policy if exists "empleados_insert" on storage.objects;
drop policy if exists "empleados_update" on storage.objects;
drop policy if exists "empleados_delete" on storage.objects;

create policy "empleados_read"   on storage.objects for select using (bucket_id = 'empleados');
create policy "empleados_insert" on storage.objects for insert with check (bucket_id = 'empleados');
create policy "empleados_update" on storage.objects for update using (bucket_id = 'empleados');
create policy "empleados_delete" on storage.objects for delete using (bucket_id = 'empleados');
