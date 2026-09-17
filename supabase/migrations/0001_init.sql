-- ============ TABLES ============

-- 1. Profils (liés à auth.users). Le téléphone est l'identifiant principal.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('client','driver')),
  full_name text not null,
  phone text not null unique,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. Infos spécifiques aux zems
create table public.drivers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  is_verified boolean not null default false,
  lat double precision,
  lng double precision,
  vehicle_label text,
  rating_avg numeric not null default 0,
  rating_count integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 3. Portefeuilles (clients ET zems)
create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- 4. Transactions de portefeuille (grand livre)
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  type text not null check (type in ('topup','ride_payment','delivery_payment','earning','commission','withdrawal')),
  ref_id uuid,
  created_at timestamptz not null default now()
);

-- 5. Courses
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  driver_id uuid references public.profiles(id),
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_label text not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  destination_label text not null,
  status text not null default 'searching'
    check (status in ('searching','assigned','in_progress','completed','cancelled')),
  payment_method text not null default 'cash' check (payment_method in ('cash','wallet')),
  driver_payout numeric,
  zemi_commission numeric,
  total_price numeric,
  created_at timestamptz not null default now()
);

-- 6. Livraisons
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id),
  driver_id uuid references public.profiles(id),
  delivery_type text not null check (delivery_type in ('livraison_simple','livraison_express')),
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_label text not null,
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,
  dropoff_label text not null,
  recipient_phone text not null,
  package_description text not null,
  package_photo_url text,
  status text not null default 'created'
    check (status in ('created','assigned','picked_up','delivered','cancelled','failed')),
  driver_payout numeric,
  zemi_commission numeric,
  total_price numeric,
  created_at timestamptz not null default now()
);

-- 7. Notes des zems
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  job_type text not null check (job_type in ('ride','delivery')),
  job_id uuid not null,
  stars integer not null check (stars between 1 and 5),
  remark text,
  created_at timestamptz not null default now()
);

-- 8. Configuration des prix (3 profils)
create table public.pricing_config (
  profile text primary key check (profile in ('course','livraison_simple','livraison_express')),
  base_fare numeric not null,
  price_per_km numeric not null,
  price_per_min numeric not null,
  min_fare numeric not null,
  rounding_step numeric not null default 50,
  commission_rate numeric not null default 0,
  commission_flat numeric not null default 0,
  weather_multipliers jsonb not null default '{}',
  time_bands jsonb not null default '[]',
  zone_multipliers jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ============ INDEX ============
create index idx_rides_client on public.rides(client_id);
create index idx_rides_driver_status on public.rides(driver_id, status);
create index idx_deliveries_sender on public.deliveries(sender_id);
create index idx_deliveries_driver_status on public.deliveries(driver_id, status);
create index idx_wtx_user on public.wallet_transactions(user_id);
create index idx_ratings_driver on public.ratings(driver_id);
create index idx_drivers_online on public.drivers(is_online);

-- ============ DÉCLENCHEUR : créer portefeuille (+ ligne driver) à la création du profil ============
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.wallets (user_id) values (new.id) on conflict (user_id) do nothing;
  if new.role = 'driver' then
    insert into public.drivers (user_id) values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- ============ VUE PUBLIQUE DES ZEMS (sans données sensibles comme le téléphone) ============
create view public.driver_public as
  select p.id, p.full_name, p.avatar_url,
         d.rating_avg, d.rating_count, d.is_online, d.is_verified,
         d.lat, d.lng, d.vehicle_label
  from public.profiles p
  join public.drivers d on d.user_id = p.id
  where p.role = 'driver';

grant select on public.driver_public to authenticated;

-- ============ SÉCURITÉ (RLS) ============
-- Point de départ raisonnable. À DURCIR plus tard : déplacer les mouvements d'argent
-- et les changements de statut vers des Edge Functions (service role), et restreindre
-- la visibilité des positions des zems aux seuls zems proches.

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

alter table public.drivers enable row level security;
create policy "drivers_select_own" on public.drivers for select using (auth.uid() = user_id);
create policy "drivers_update_own" on public.drivers for update using (auth.uid() = user_id);

alter table public.wallets enable row level security;
create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);
-- Écriture des soldes : uniquement via Edge Function (service role). Aucune policy d'update pour l'utilisateur.

alter table public.wallet_transactions enable row level security;
create policy "wtx_select_own" on public.wallet_transactions for select using (auth.uid() = user_id);
-- Insertion : uniquement via service role.

alter table public.rides enable row level security;
create policy "rides_select_involved" on public.rides for select
  using (auth.uid() = client_id or auth.uid() = driver_id);
create policy "rides_insert_client" on public.rides for insert with check (auth.uid() = client_id);
create policy "rides_update_involved" on public.rides for update
  using (auth.uid() = client_id or auth.uid() = driver_id);

alter table public.deliveries enable row level security;
create policy "deliveries_select_involved" on public.deliveries for select
  using (auth.uid() = sender_id or auth.uid() = driver_id);
create policy "deliveries_insert_sender" on public.deliveries for insert with check (auth.uid() = sender_id);
create policy "deliveries_update_involved" on public.deliveries for update
  using (auth.uid() = sender_id or auth.uid() = driver_id);

alter table public.ratings enable row level security;
create policy "ratings_select_auth" on public.ratings for select using (auth.role() = 'authenticated');
create policy "ratings_insert_author" on public.ratings for insert with check (auth.uid() = author_id);

alter table public.pricing_config enable row level security;
create policy "pricing_select_auth" on public.pricing_config for select using (auth.role() = 'authenticated');
-- Écriture : via le tableau de bord Supabase / service role uniquement.

-- ============ VALEURS DE PRIX PAR DÉFAUT (À CALIBRER avec tes vrais prix) ============
insert into public.pricing_config
  (profile, base_fare, price_per_km, price_per_min, min_fare, rounding_step,
   commission_rate, commission_flat, weather_multipliers, time_bands, zone_multipliers)
values
  ('course', 100, 60, 5, 200, 50, 0.0, 0,
   '{"normal":1.0,"rain":1.3,"storm":1.5}',
   '[{"label":"nuit","fromHour":22,"toHour":5,"multiplier":1.25},
     {"label":"pointe_matin","fromHour":7,"toHour":9,"multiplier":1.15},
     {"label":"pointe_soir","fromHour":17,"toHour":20,"multiplier":1.15}]',
   '{"default":1.0}'),
  ('livraison_simple', 150, 70, 5, 250, 50, 0.35, 0,
   '{"normal":1.0,"rain":1.3,"storm":1.5}',
   '[{"label":"nuit","fromHour":22,"toHour":5,"multiplier":1.25}]',
   '{"default":1.0}'),
  ('livraison_express', 250, 90, 8, 400, 50, 0.20, 0,
   '{"normal":1.0,"rain":1.3,"storm":1.5}',
   '[{"label":"nuit","fromHour":22,"toHour":5,"multiplier":1.25}]',
   '{"default":1.0}');
