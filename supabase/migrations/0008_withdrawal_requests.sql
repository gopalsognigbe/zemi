-- ============ ZEMi : retraits Mobile Money (zem) ============

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  momo_number text not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_withdrawal_requests_driver
  on public.withdrawal_requests(driver_id, created_at desc);

alter table public.withdrawal_requests enable row level security;

drop policy if exists "withdrawal_select_own" on public.withdrawal_requests;
create policy "withdrawal_select_own"
  on public.withdrawal_requests
  for select
  using (auth.uid() = driver_id);

-- Demande atomique : vérif solde → débit → demande → transaction
create or replace function public.request_withdrawal(
  p_amount numeric,
  p_momo_number text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal numeric;
  cleaned text;
  req_id uuid;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> trunc(p_amount) then
    raise exception 'INVALID_AMOUNT';
  end if;

  cleaned := regexp_replace(coalesce(p_momo_number, ''), '\D', '', 'g');
  if length(cleaned) < 8 or length(cleaned) > 15 then
    raise exception 'INVALID_NUMBER';
  end if;

  select balance into bal
  from public.wallets
  where user_id = uid
  for update;

  if bal is null then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  if bal < p_amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  update public.wallets
  set balance = balance - p_amount,
      updated_at = now()
  where user_id = uid;

  insert into public.withdrawal_requests (driver_id, amount, momo_number, status)
  values (uid, p_amount, cleaned, 'pending')
  returning id into req_id;

  insert into public.wallet_transactions (user_id, amount, type, ref_id)
  values (uid, -p_amount, 'withdrawal', req_id);

  return req_id;
end;
$$;

revoke all on function public.request_withdrawal(numeric, text) from public;
grant execute on function public.request_withdrawal(numeric, text) to authenticated;
