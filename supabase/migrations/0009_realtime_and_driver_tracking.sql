-- ============ ZEMi : temps réel + lecture position zem pendant mission active ============

-- Client peut lire la position du zem assigné à sa course ou livraison en cours
drop policy if exists "drivers_select_assigned_client" on public.drivers;
create policy "drivers_select_assigned_client"
  on public.drivers
  for select
  using (
    exists (
      select 1
      from public.rides r
      where r.driver_id = drivers.user_id
        and r.client_id = auth.uid()
        and r.status in ('assigned', 'in_progress')
    )
    or exists (
      select 1
      from public.deliveries d
      where d.driver_id = drivers.user_id
        and d.sender_id = auth.uid()
        and d.status in ('assigned', 'picked_up')
    )
  );

-- Activer le temps réel Supabase sur les tables de suivi
do $$
begin
  alter publication supabase_realtime add table public.drivers;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.rides;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.deliveries;
exception
  when duplicate_object then null;
end $$;
