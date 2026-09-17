-- ============ ZEMi : règlement atomique à la fin d'une course ============
-- Miroir de complete_delivery : passe la course à « completed » et règle
-- les portefeuilles (débit client si wallet, crédit zem du driver_payout).

create or replace function public.complete_ride(p_ride_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rides%rowtype;
  payout numeric;
  total numeric;
  client_bal numeric;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  select * into r
  from public.rides
  where id = p_ride_id
  for update;

  if not found then
    raise exception 'Course introuvable';
  end if;

  if r.driver_id is distinct from auth.uid() then
    raise exception 'Non autorisé';
  end if;

  if r.status <> 'in_progress' and r.status <> 'assigned' then
    raise exception 'Statut invalide';
  end if;

  -- Déjà réglée (idempotence)
  if exists (
    select 1
    from public.wallet_transactions
    where ref_id = p_ride_id
      and type in ('earning', 'ride_payment')
  ) then
    update public.rides
    set status = 'completed'
    where id = p_ride_id;
    return;
  end if;

  payout := coalesce(r.driver_payout, 0);
  total := coalesce(r.total_price, 0);

  -- Vérifier le solde AVANT de valider la course
  if r.payment_method = 'wallet' and total > 0 then
    select balance into client_bal
    from public.wallets
    where user_id = r.client_id
    for update;

    if client_bal is null then
      insert into public.wallets (user_id, balance)
      values (r.client_id, 0);
      client_bal := 0;
    end if;

    if client_bal < total then
      raise exception 'INSUFFICIENT_BALANCE';
    end if;
  end if;

  update public.rides
  set status = 'completed'
  where id = p_ride_id;

  -- Paiement portefeuille : débiter le client du total
  if r.payment_method = 'wallet' and total > 0 then
    update public.wallets
    set balance = balance - total,
        updated_at = now()
    where user_id = r.client_id;

    insert into public.wallet_transactions (user_id, amount, type, ref_id)
    values (r.client_id, total, 'ride_payment', p_ride_id);
  end if;

  -- Créditer le zem uniquement si le client a payé via le portefeuille
  -- (espèces : l'argent change de main hors app — pas de mouvement portefeuille).
  if r.payment_method = 'wallet' and payout > 0 and r.driver_id is not null then
    insert into public.wallets (user_id, balance)
    values (r.driver_id, payout)
    on conflict (user_id) do update
      set balance = public.wallets.balance + excluded.balance,
          updated_at = now();

    insert into public.wallet_transactions (user_id, amount, type, ref_id)
    values (r.driver_id, payout, 'earning', p_ride_id);
  end if;
end;
$$;

revoke all on function public.complete_ride(uuid) from public;
grant execute on function public.complete_ride(uuid) to authenticated;


-- Stats du jour (gains + missions) pour l'écran zem
create or replace function public.driver_today_stats()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  day_start timestamptz;
  earnings numeric;
  jobs integer;
begin
  if uid is null then
    raise exception 'Non authentifié';
  end if;

  day_start := date_trunc('day', timezone('Africa/Porto-Novo', now()));

  select coalesce(sum(abs(amount)), 0)
  into earnings
  from public.wallet_transactions
  where user_id = uid
    and type = 'earning'
    and created_at >= day_start;

  select count(*)::integer
  into jobs
  from (
    select id
    from public.rides
    where driver_id = uid
      and status = 'completed'
      and created_at >= day_start
    union all
    select id
    from public.deliveries
    where driver_id = uid
      and status = 'delivered'
      and created_at >= day_start
  ) as missions;

  return json_build_object(
    'earnings_today', earnings,
    'jobs_today', jobs
  );
end;
$$;

revoke all on function public.driver_today_stats() from public;
grant execute on function public.driver_today_stats() to authenticated;
