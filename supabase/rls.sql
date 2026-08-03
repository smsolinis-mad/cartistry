-- =====================================================================
-- Cartistry · Row Level Security
--
-- De dónde se parte: RLS está desactivado en todas las tablas. Como el
-- navegador consulta Supabase directamente con la anon key, hoy cualquiera
-- con esa clave lee y escribe los datos de cualquier tienda — incluidos los
-- datos personales de los empleados (número de la seguridad social y cuenta
-- bancaria están en la tabla `empleados`).
--
-- Este fichero cierra eso sin tocar ni una fila de datos.
--
-- Va en DOS FASES a propósito. La fase 1 se puede aplicar hoy. La fase 2
-- rompería el panel de administración y está explicada al final.
--
-- CÓMO SE APLICA
--   1. Ejecuta el BLOQUE 0 y compara los dos uuid que devuelve.
--      Si NO coinciden, para y lee la nota del final del fichero.
--   2. Crea tu cuenta en /registro con ese mismo email.
--   3. Ejecuta los bloques 1 a 5 (fase 1).
--   4. Entra en la app y comprueba que sigues viendo tu tienda y tus ventas.
--
-- POR QUÉ NO SE USA auth.uid()
--   Las tiendas y los empleados están guardados con user_id = uuidv5(email),
--   no con el id que asigna Supabase Auth. Para conservar esos datos sin
--   migrarlos, las políticas recalculan ese mismo uuidv5 desde el email del
--   JWT: es un email que ha verificado Supabase, así que sigue siendo una
--   identidad de confianza y no algo que elija el cliente.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BLOQUE 0 · Comprobación previa. No modifica nada.
--
-- Cambia el email por el tuyo. Los dos uuid tienen que ser iguales.
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp" with schema extensions;

select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    lower('CAMBIA_ESTO@tu-email.com')
  )                                        as id_que_usara_la_app,
  (select user_id from public.stores limit 1) as id_actual_de_tus_datos;


-- ---------------------------------------------------------------------
-- BLOQUE 1 · Identidad de la marca en sesión
-- ---------------------------------------------------------------------

-- Devuelve el user_id de aplicación de quien hace la petición, o NULL si no
-- hay sesión. Con NULL las comparaciones dan NULL, así que se deniega por
-- defecto en lugar de permitir por defecto.
create or replace function public.app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, extensions, auth
as $$
  select case
    when coalesce(auth.jwt() ->> 'email', '') = '' then null
    else extensions.uuid_generate_v5(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
      lower(auth.jwt() ->> 'email')
    )
  end
$$;

comment on function public.app_user_id() is
  'user_id de aplicación derivado del email verificado del JWT. NULL sin sesión.';

grant execute on function public.app_user_id() to anon, authenticated;


-- ---------------------------------------------------------------------
-- BLOQUE 2 · Tablas de la marca (llevan user_id)
--
-- `empleados` y `cargos` son las más sensibles del sistema y el panel de
-- administración no las lee, así que entran en la fase 1.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array['empleados', 'cargos']) loop
    if to_regclass('public.' || t) is null then
      raise notice 'omitida, no existe todavía: %', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "marca_propietaria" on public.%I', t);
    execute format(
      'create policy "marca_propietaria" on public.%I for all to authenticated '
      'using (user_id = public.app_user_id()) '
      'with check (user_id = public.app_user_id())', t);
    raise notice 'protegida: %', t;
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- BLOQUE 3 · Tablas que cuelgan de una tienda
--
-- No llevan user_id: se comprueba que su tienda sea de la marca en sesión.
-- Las que aún no existen en la base (forecasts, tareas…) se omiten solas.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'products', 'sales', 'muebles', 'planograms',
    'store_horarios', 'shifts', 'tareas', 'cash_movements', 'forecasts'
  ]) loop
    if to_regclass('public.' || t) is null then
      raise notice 'omitida, no existe todavía: %', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "tienda_de_la_marca" on public.%I', t);
    execute format(
      'create policy "tienda_de_la_marca" on public.%I for all to authenticated '
      'using (exists (select 1 from public.stores s '
      '               where s.id = public.%I.store_id '
      '                 and s.user_id = public.app_user_id())) '
      'with check (exists (select 1 from public.stores s '
      '               where s.id = public.%I.store_id '
      '                 and s.user_id = public.app_user_id()))', t, t, t);
    raise notice 'protegida: %', t;
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- BLOQUE 4 · Tablas que cuelgan de un empleado
--
-- Su user_id es anulable, así que la propiedad se resuelve por el empleado,
-- que sí lo tiene siempre.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array['peticiones', 'empleado_documentos']) loop
    if to_regclass('public.' || t) is null then
      raise notice 'omitida, no existe todavía: %', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "empleado_de_la_marca" on public.%I', t);
    execute format(
      'create policy "empleado_de_la_marca" on public.%I for all to authenticated '
      'using (exists (select 1 from public.empleados e '
      '               where e.id = public.%I.empleado_id '
      '                 and e.user_id = public.app_user_id())) '
      'with check (exists (select 1 from public.empleados e '
      '               where e.id = public.%I.empleado_id '
      '                 and e.user_id = public.app_user_id()))', t, t, t);
    raise notice 'protegida: %', t;
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- BLOQUE 5 · Invitaciones
--
-- La tabla queda cerrada del todo: si se pudiera leer, cualquiera se saca un
-- código válido y se registra. El registro entra por estas dos funciones, que
-- comprueban un código concreto sin exponer la lista.
-- ---------------------------------------------------------------------
alter table public.invitations enable row level security;
drop policy if exists "Invitations are viewable by everyone" on public.invitations;
-- Sin políticas: nadie llega a la tabla salvo por las funciones de abajo.

create or replace function public.validar_invitacion(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.invitations
     where upper(code) = upper(p_code)
       and used = false
       and (expires_at is null or expires_at > now())
  )
$$;

create or replace function public.consumir_invitacion(p_code text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  filas int;
begin
  update public.invitations
     set used  = true,
         email = coalesce(nullif(p_email, ''), email)
   where upper(code) = upper(p_code)
     and used = false
     and (expires_at is null or expires_at > now());

  get diagnostics filas = row_count;
  return filas > 0;
end $$;

grant execute on function public.validar_invitacion(text)         to anon, authenticated;
grant execute on function public.consumir_invitacion(text, text)  to anon, authenticated;

-- Los dos códigos que hay (TEST123 y DEMO123) caducaron el 03/06/2026, así que
-- el registro los rechaza. Este es uno nuevo, válido 30 días.
insert into public.invitations (code, used, expires_at)
values ('CARTISTRY1', false, now() + interval '30 days');


-- ---------------------------------------------------------------------
-- BLOQUE 6 · Verificación
-- ---------------------------------------------------------------------
select c.relname as tabla, c.relrowsecurity as rls_activo
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by c.relrowsecurity desc, c.relname;

select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
 order by tablename;


-- =====================================================================
-- FASE 2 — NO EJECUTAR TODAVÍA
--
-- Faltan por proteger: stores, company_settings, invoices, admin_settings y
-- admin_forecasts.
--
-- El motivo de que no entren aún: el panel /admin las lee desde el NAVEGADOR
-- con la anon key y sin sesión de Supabase (usa su propia cookie de servidor,
-- ver lib/admin-server.ts). En cuanto se active RLS sobre ellas, el panel se
-- queda a cero: no vería ninguna marca, ninguna factura y ningún ratio.
--
-- El arreglo de fondo es mover las lecturas del panel a rutas de API que
-- corran en el servidor con la service_role key —que salta RLS— detrás de la
-- cookie de admin que ya existe. Es decir, convertir lib/admin-data.ts en
-- endpoints. Cuando eso esté hecho, esto cierra el círculo:
--
--   do $$
--   declare t text;
--   begin
--     for t in select unnest(array['stores', 'company_settings', 'invoices']) loop
--       execute format('alter table public.%I enable row level security', t);
--       execute format(
--         'create policy "marca_propietaria" on public.%I for all to authenticated '
--         'using (user_id = public.app_user_id()) '
--         'with check (user_id = public.app_user_id())', t);
--     end loop;
--     for t in select unnest(array['admin_settings', 'admin_forecasts']) loop
--       if to_regclass('public.' || t) is not null then
--         execute format('alter table public.%I enable row level security', t);
--       end if;
--     end loop;
--   end $$;
--
-- Nota: `stores` sin RLS sigue siendo legible con la anon key, pero las
-- políticas de los bloques 3 y 4 ya impiden llegar a productos, ventas,
-- planogramas y empleados de otra marca. Lo que queda expuesto es el nombre y
-- la dirección de las tiendas, no su operación ni sus datos personales.
--
--
-- SI EL BLOQUE 0 NO COINCIDIÓ
--
-- Entonces el user_id de tus datos se generó con el email escrito de otra
-- forma (por ejemplo con alguna mayúscula). En ese caso, en lugar de nada de
-- lo anterior, repunta los datos al uuid que devolvió el BLOQUE 0:
--
--   update public.stores    set user_id = '<uuid_del_bloque_0>' where user_id = '16e914c0-ade5-5724-a922-fea7f5070e3f';
--   update public.empleados set user_id = '<uuid_del_bloque_0>' where user_id = '16e914c0-ade5-5724-a922-fea7f5070e3f';
--   update public.cargos    set user_id = '<uuid_del_bloque_0>' where user_id = '16e914c0-ade5-5724-a922-fea7f5070e3f';
--
-- Los productos y las ventas cuelgan de store_id, así que se mueven solos.
-- =====================================================================
