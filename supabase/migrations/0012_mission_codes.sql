-- ============ ZEMi : codes de départ / livraison + RPC sécurisées ============
-- start_code (courses) et delivery_code (livraisons) : 4 chiffres.
-- Le zem ne doit PAS les lire côté app (colonnes absentes des SELECT zem).

-- 1) Colonnes
alter table public.rides
  add column if not exists start_code text;

alter table public.deliveries
  add column if not exists delivery_code text;

-- 2) Générateur 4 chiffres
create or replace function public.generate_mission_code()
returns text
language plpgsql
as $$
begin
  return lpad((floor(random() * 10000))::int::text, 4, '0');
end;
$$;

-- 3) Triggers à la création
create or replace function public.set_ride_start_code()
returns trigger
language plpgsql
as $$
begin
  if new.start_code is null or length(trim(new.start_code)) <> 4 then
    new.start_code := public.generate_mission_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rides_start_code on public.rides;
create trigger trg_rides_start_code
  before insert on public.rides
  for each row
  execute function public.set_ride_start_code();

create or replace function public.set_delivery_code()
returns trigger
language plpgsql
as $$
begin
  if new.delivery_code is null or length(trim(new.delivery_code)) <> 4 then
    new.delivery_code := public.generate_mission_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deliveries_code on public.deliveries;
create trigger trg_deliveries_code
  before insert on public.deliveries
  for each row
  execute function public.set_delivery_code();

-- Remplir les lignes existantes sans code
update public.rides
set start_code = public.generate_mission_code()
where start_code is null;

update public.deliveries
set delivery_code = public.generate_mission_code()
where delivery_code is null;

alter table public.rides
  alter column start_code set not null;

alter table public.deliveries
  alter column delivery_code set not null;

-- 4) Démarrer une course avec le code passager
create or replace function public.start_ride(p_ride_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rides%rowtype;
  cleaned text;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  cleaned := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');

  select * into r
  from public.rides
  where id = p_ride_id
  for update;

  if not found then
    raise exception 'Course introuvable';
  end if;

  if r.driver_id is distinct from auth.uid() then
    raise exception 'NOT_YOUR_RIDE';
  end if;

  if r.status <> 'assigned' then
    raise exception 'INVALID_STATUS';
  end if;

  if cleaned <> r.start_code then
    raise exception 'WRONG_CODE';
  end if;

  update public.rides
  set status = 'in_progress'
  where id = p_ride_id;
end;
$$;

revoke all on function public.start_ride(uuid, text) from public;
grant execute on function public.start_ride(uuid, text) to authenticated;

-- 5) Terminer une livraison avec le code destinataire (+ crédit zem)
create or replace function public.complete_delivery_with_code(
  p_delivery_id uuid,
  p_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deliveries%rowtype;
  payout numeric;
  cleaned text;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  cleaned := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');

  select * into d
  from public.deliveries
  where id = p_delivery_id
  for update;

  if not found then
    raise exception 'Livraison introuvable';
  end if;

  if d.driver_id is distinct from auth.uid() then
    raise exception 'NOT_YOUR_DELIVERY';
  end if;

  if d.status <> 'picked_up' then
    raise exception 'INVALID_STATUS';
  end if;

  if cleaned <> d.delivery_code then
    raise exception 'WRONG_CODE';
  end if;

  payout := coalesce(d.driver_payout, 0);

  update public.deliveries
  set status = 'delivered'
  where id = p_delivery_id;

  if payout > 0 then
    insert into public.wallets (user_id, balance)
    values (d.driver_id, payout)
    on conflict (user_id) do update
      set balance = public.wallets.balance + excluded.balance,
          updated_at = now();

    insert into public.wallet_transactions (user_id, amount, type, ref_id)
    values (d.driver_id, payout, 'earning', p_delivery_id);
  end if;
end;
$$;

revoke all on function public.complete_delivery_with_code(uuid, text) from public;
grant execute on function public.complete_delivery_with_code(uuid, text) to authenticated;
