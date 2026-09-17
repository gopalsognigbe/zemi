-- Vue driver_public lisible par les clients (contourne RLS des tables sous-jacentes)
create or replace view public.driver_public
with (security_invoker = false)
as
  select p.id, p.full_name, p.avatar_url,
         d.rating_avg, d.rating_count, d.is_online, d.is_verified,
         d.lat, d.lng, d.vehicle_label
  from public.profiles p
  join public.drivers d on d.user_id = p.id
  where p.role = 'driver';

grant select on public.driver_public to authenticated;

-- Recalcule rating_avg / rating_count à chaque nouvelle note
create or replace function public.refresh_driver_rating()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.drivers
  set
    rating_avg = (
      select coalesce(round(avg(stars)::numeric, 2), 0)
      from public.ratings
      where driver_id = new.driver_id
    ),
    rating_count = (
      select count(*)::integer
      from public.ratings
      where driver_id = new.driver_id
    ),
    updated_at = now()
  where user_id = new.driver_id;
  return new;
end;
$$;

drop trigger if exists on_rating_inserted on public.ratings;
create trigger on_rating_inserted
  after insert on public.ratings
  for each row execute function public.refresh_driver_rating();
