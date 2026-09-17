-- ============ ZEM : voir et réclamer les courses « searching » ============
-- Les policies existantes (rides_select_involved / rides_update_involved) ne
-- couvrent que client_id ou driver_id = auth.uid(). Une course searching n'a
-- pas encore de driver_id : il faut des policies dédiées.

create policy "rides_select_searching"
  on public.rides
  for select
  using (status = 'searching');

-- Réclamation atomique : uniquement si encore 'searching',
-- et la nouvelle ligne doit être assigned au zem connecté.
create policy "rides_claim_searching"
  on public.rides
  for update
  using (status = 'searching')
  with check (
    driver_id = auth.uid()
    and status = 'assigned'
  );
