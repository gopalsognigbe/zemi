-- RPC : zems en ligne à proximité (positions anonymes uniquement)
create or replace function public.nearby_drivers(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 5
)
returns table (lat double precision, lng double precision)
language sql
security definer
set search_path = public
as $$
  select d.lat, d.lng
  from public.drivers d
  where d.is_online = true
    and d.lat is not null
    and d.lng is not null
    and (
      6371 * acos(
        least(1.0, greatest(-1.0,
          cos(radians(p_lat)) * cos(radians(d.lat)) *
          cos(radians(d.lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(d.lat))
        ))
      )
    ) <= p_radius_km;
$$;

revoke all on function public.nearby_drivers(double precision, double precision, double precision)
  from public;
grant execute on function public.nearby_drivers(double precision, double precision, double precision)
  to authenticated;
