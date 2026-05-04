-- Invitaciones (admin genera códigos)
create table if not exists invitations (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  email text,
  used boolean default false,
  expires_at timestamp default (now() + interval '30 days'),
  created_at timestamp default now()
);

-- RLS: Solo admin puede insertar/actualizar
alter table invitations enable row level security;

create policy "Invitations are viewable by everyone" on invitations
  for select using (true);

-- Tiendas (1 por usuario)
create table if not exists stores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  direccion text,
  tipo text not null,
  metros2 numeric,
  fecha_apertura date,
  entrada_orientacion text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table stores enable row level security;

create policy "Users can view their own store" on stores
  for select using (auth.uid() = user_id);

create policy "Users can create their own store" on stores
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own store" on stores
  for update using (auth.uid() = user_id);

-- Productos (catálogo)
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  store_id uuid not null references stores(id) on delete cascade,
  ean text not null,
  codigo text,
  nombre text not null,
  coleccion text,
  drop text,
  sexo text not null,
  division text,
  tipo text,
  subtipo text,
  color_principal text,
  color_principal_detalle text,
  subcolor text,
  medida_alto numeric,
  medida_largo numeric,
  medida_profundo numeric,
  precio_compra numeric not null,
  pvp numeric not null,
  unidades integer not null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table products enable row level security;

create policy "Users can view products of their store" on products
  for select using (
    store_id in (select id from stores where user_id = auth.uid())
  );

create policy "Users can insert products in their store" on products
  for insert with check (
    store_id in (select id from stores where user_id = auth.uid())
  );

-- Ventas
create table if not exists sales (
  id uuid default gen_random_uuid() primary key,
  store_id uuid not null references stores(id) on delete cascade,
  fecha date not null,
  hora time not null,
  numero_ticket text not null,
  ean text not null,
  unidades_vendidas integer not null,
  pvp numeric not null,
  created_at timestamp default now()
);

alter table sales enable row level security;

create policy "Users can view sales of their store" on sales
  for select using (
    store_id in (select id from stores where user_id = auth.uid())
  );

create policy "Users can insert sales in their store" on sales
  for insert with check (
    store_id in (select id from stores where user_id = auth.uid())
  );

-- Planogramas (histórico)
create table if not exists planograms (
  id uuid default gen_random_uuid() primary key,
  store_id uuid not null references stores(id) on delete cascade,
  objetivo text not null,
  generado_at timestamp default now(),
  datos_json jsonb,
  pdf_url text,
  created_at timestamp default now()
);

alter table planograms enable row level security;

create policy "Users can view planograms of their store" on planograms
  for select using (
    store_id in (select id from stores where user_id = auth.uid())
  );

create policy "Users can create planograms in their store" on planograms
  for insert with check (
    store_id in (select id from stores where user_id = auth.uid())
  );
