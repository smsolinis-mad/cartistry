-- ============================================================
-- Empleados de la marca (Equipo · Datos)
-- Ejecutar en el SQL Editor de Supabase (New query → Run without RLS).
-- ============================================================
create table if not exists empleados (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null,
  nombre                   text,
  apellidos                text,
  documento_identidad      text,
  anio_nacimiento          integer,
  direccion                text,
  cp                       text,
  ciudad                   text,
  pais                     text,
  telefono                 text,
  email_privado            text,
  email_empresa            text,
  num_seguridad_social     text,
  num_cuenta_banco         text,
  inicio_relacion_laboral  date,
  periodo_prueba           text,
  tipo_contrato            text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create index if not exists idx_empleados_user on empleados (user_id);
alter table empleados disable row level security;

-- Añadidos: teléfonos separados y cargo
alter table empleados
  add column if not exists telefono_privado text,
  add column if not exists telefono_empresa text,
  add column if not exists cargo            text;

-- Tienda asignada al empleado
alter table empleados
  add column if not exists store_id uuid;

-- Fecha de nacimiento completa (sustituye a año de nacimiento)
alter table empleados
  add column if not exists fecha_nacimiento date;
