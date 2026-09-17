-- ============ ZEMi : livraisons côté zem + RPC complete_delivery ============

-- 1) Voir les livraisons en attente
drop policy if exists "deliveries_select_created" on public.deliveries;
create policy "deliveries_select_created"
  on public.deliveries
  for select
  using (status = 'created');

-- 2) Réclamer une livraison created → assigned
drop policy if exists "deliveries_claim_created" on public.deliveries;
create policy "deliveries_claim_created"
  on public.deliveries
  for update
  using (status = 'created')
  with check (
    driver_id = auth.uid()
    and status = 'assigned'
  );

-- 3) Terminer une livraison : status delivered + crédit du gain zem
create or replace function public.complete_delivery(p_delivery_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deliveries%rowtype;
  payout numeric;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  select * into d
  from public.deliveries
  where id = p_delivery_id
  for update;

  if not found then
    raise exception 'Livraison introuvable';
  end if;

  if d.driver_id is distinct from auth.uid() then
    raise exception 'Non autorisé';
  end if;

  if d.status <> 'picked_up' then
    raise exception 'Statut invalide';
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

revoke all on function public.complete_delivery(uuid) from public;
grant execute on function public.complete_delivery(uuid) to authenticated;
