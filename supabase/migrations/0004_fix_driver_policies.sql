-- ============ ZEMi : policies nécessaires pour le côté ZEM ============
-- À exécuter une fois dans Supabase → SQL Editor → Run

-- 1) Voir les courses en attente
drop policy if exists "rides_select_searching" on public.rides;
create policy "rides_select_searching"
  on public.rides
  for select
  using (status = 'searching');

-- 2) Réclamer une course searching
drop policy if exists "rides_claim_searching" on public.rides;
create policy "rides_claim_searching"
  on public.rides
  for update
  using (status = 'searching')
  with check (
    driver_id = auth.uid()
    and status = 'assigned'
  );

-- 3) Créer sa propre ligne drivers (si absente)
drop policy if exists "drivers_insert_self" on public.drivers;
create policy "drivers_insert_self"
  on public.drivers
  for insert
  with check (auth.uid() = user_id);

-- Vérification rapide (doit renvoyer 3 lignes de policies)
select policyname, tablename
from pg_policies
where schemaname = 'public'
  and policyname in (
    'rides_select_searching',
    'rides_claim_searching',
    'drivers_insert_self'
  );
