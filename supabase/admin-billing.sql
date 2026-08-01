-- ============================================================
-- Cartistry · Panel de administración (marcas, planes, facturas)
-- Ejecutar en el SQL Editor de Supabase (New query → Run without RLS).
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- ============================================================

-- 1) Datos fiscales por marca (una fila por usuario)
create table if not exists company_settings (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique,
  nombre_empresa         text,
  direccion_facturacion  text,
  codigo_postal          text,
  ciudad                 text,
  provincia              text,
  pais                   text,
  cif                    text,
  plan                   text default 'estandar',  -- 'basico' | 'estandar' | 'avanzado'
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Por si la tabla ya existía sin la columna de plan
alter table company_settings
  add column if not exists plan text default 'estandar';

-- Contacto general y persona de facturación
alter table company_settings
  add column if not exists telefono_general text,
  add column if not exists fact_nombre      text,
  add column if not exists fact_apellido    text,
  add column if not exists fact_cargo       text,
  add column if not exists fact_movil       text,
  add column if not exists fact_email       text;

alter table company_settings disable row level security;

-- 2) Facturas (una por marca y periodo mensual)
create table if not exists invoices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  numero      text,                       -- p.ej. CART-202606-0001
  periodo     text not null,              -- 'YYYY-MM'
  plan        text,                       -- plan facturado en ese periodo
  concepto    text,                       -- descripción de la factura
  num_tiendas integer default 1,
  importe     numeric(10,2) not null default 0,
  estado      text not null default 'pendiente',  -- 'pendiente' | 'cobrada'
  emitida_el  timestamptz default now(),
  cobrada_el  timestamptz,
  unique (user_id, periodo)
);

create index if not exists idx_invoices_periodo on invoices (periodo);
create index if not exists idx_invoices_user on invoices (user_id);

alter table invoices disable row level security;

-- 3) Forecast del panel admin (objetivos por métrica, año y mes)
create table if not exists admin_forecasts (
  id         uuid primary key default gen_random_uuid(),
  metrica    text not null,              -- 'empresas' | 'tiendas' | 'facturacion'
  year       integer not null,
  month      integer not null,           -- 1..12
  valor      numeric(14,2) not null default 0,
  updated_at timestamptz default now(),
  unique (metrica, year, month)
);

alter table admin_forecasts disable row level security;

-- 4) Datos fiscales de la empresa emisora (aparecen en las facturas). Fila única (id = 1).
create table if not exists admin_settings (
  id             integer primary key default 1,
  nombre_empresa text,
  cif            text,
  direccion      text,
  codigo_postal  text,
  ciudad         text,
  provincia      text,
  pais           text,
  email          text,
  telefono       text,
  iban           text,
  updated_at     timestamptz default now(),
  constraint admin_settings_single_row check (id = 1)
);

alter table admin_settings disable row level security;

-- ============================================================
-- Movimientos de caja de tienda (Ingresos / Petty cash) — parte marcas
-- ============================================================
create table if not exists cash_movements (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null,
  tipo       text not null default 'ingreso',     -- 'ingreso' | 'retirada'
  categoria  text not null default 'ventas',      -- 'ventas' | 'petty_cash'
  concepto   text,
  importe    numeric(12,2) not null default 0,    -- siempre positivo
  fecha      date default now(),
  created_at timestamptz default now()
);
create index if not exists idx_cash_movements_store on cash_movements (store_id);
alter table cash_movements disable row level security;
