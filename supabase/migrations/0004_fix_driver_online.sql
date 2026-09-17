-- Policies zem : idempotentes (safe à relancer)

-- Voir / réclamer les courses searching
drop policy if exists "rides_select_searching" on public.rides;
create policy "rides_select_searching"
  on public.rides
  for select
  using (status = 'searching');

drop policy if exists "rides_claim_searching" on public.rides;
create policy "rides_claim_searching"
  on public.rides
  for update
  using (status = 'searching')
  with check (
    driver_id = auth.uid()
    and status = 'assigned'
  );

-- Créer sa propre ligne drivers si absente
drop policy if exists "drivers_insert_self" on public.drivers;
create policy "drivers_insert_self"
  on public.drivers
  for insert
  with check (auth.uid() = user_id);

-- Réparer les profils zem sans ligne drivers
insert into public.drivers (user_id)
select p.id
from public.profiles p
where p.role = 'driver'
  and not exists (
    select 1 from public.drivers d where d.user_id = p.id
  );
