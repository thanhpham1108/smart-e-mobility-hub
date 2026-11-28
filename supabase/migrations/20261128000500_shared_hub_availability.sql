-- Preserve physical occupancy for reconciliation and publish admission separately.
create or replace view app.hub_summary as
select h.id,h.name,h.area,
  case when point_state.oldest is null then 'Unavailable'
    when (h.freshness='Stale' and point_state.verified<point_state.total)
      or point_state.oldest<=d.demo_time-make_interval(mins=>policy.stale_minutes) then 'Stale'
    else 'Live' end as freshness,
  h.latitude,h.longitude,h.address,h.status,
  (select count(*) from app.vehicles v where h.status='Operational'
    and v.current_hub_id=h.id and v.kind='SHARED' and v.status='AVAILABLE' and v.condition='OPERATIONAL'
    and not exists(select from app.charging_requests r where r.vehicle_id=v.vehicle_id
      and r.status in ('Waiting','Scheduled','Charging','Suspended'))) as vehicles_free,
  parking.total as parking_total, parking.free as parking_free,
  point_state.total as charging_total, point_state.free as charging_free,
  (select count(*) from app.charging_requests r where r.hub_id=h.id and r.status='Charging') as charging_active,
  (select count(*) from app.charging_requests r where r.hub_id=h.id and r.status='Waiting') as charging_waiting,
  point_state.latest as last_observed_at, observation.discrepancy as parking_discrepancy,
  case when h.status='Operational' and observation.discrepancy is null then
    greatest(0, least(parking.free, parking.total - app.parking_slot_used(
      h.id,date_bin(interval '15 minutes',d.demo_time,timestamptz '2000-01-01 UTC'))))
    else 0 end as parking_admission_free,
  (select count(*) from app.parking_reservations b where b.hub_id=h.id
    and b.status='Confirmed' and b.expires_at>d.demo_time) as parking_pending,
  (select count(*) from app.charging_allocations a join app.charging_points p using(point_id)
    where p.hub_id=h.id and a.released_at is null) as charging_committed
from app.hubs h
join app.demo_state d on d.singleton
join app.fleet_policy policy on policy.singleton
left join app.fleet_observations observation
  on observation.resource_type='parking' and observation.resource_id=h.id
cross join lateral (
  select count(*) as total, count(*) filter (where
    not exists(select from app.vehicles v where v.parking_space_id=s.space_id)
    and not exists(select from app.parking_sessions p where p.parking_space_id=s.space_id and p.status='Active')) as free
  from app.parking_spaces s where s.hub_id=h.id and s.in_service
) parking
cross join lateral (
  select count(*) as total, count(*) filter (where h.status='Operational' and app.point_available(c)) as free,
    count(*) filter (where exists(select from app.fleet_observations f
      where f.resource_type='point' and f.resource_id=c.point_id)) as verified,
    min(c.status_observed_at) as oldest, max(c.status_observed_at) as latest
  from app.charging_points c where c.hub_id=h.id
) point_state;

-- Compose the domain projections with one source for shared Hub fields.
alter function app.view_for_profile(app.profiles,text,jsonb) rename to view_before_shared_availability;
create function app.view_for_profile(p app.profiles,p_view text,p_filter jsonb default '{}')
returns jsonb language plpgsql volatile set search_path='' as $$
declare result jsonb; hubs jsonb;
begin
  result := app.view_before_shared_availability(p,p_view,p_filter);
  if result->>'ok' is distinct from 'true' or not ((result->'data') ? 'hubs') then return result; end if;
  select app.list_json(jsonb_agg(entry.hub
    || (to_jsonb(s) - 'last_observed_at' - 'parking_discrepancy')
    || jsonb_build_object('lastObservedAt',s.last_observed_at,'parkingDiscrepancy',s.parking_discrepancy)
    order by entry.position))
  into hubs
  from jsonb_array_elements(result#>'{data,hubs}') with ordinality as entry(hub, position)
  join app.hub_summary s on s.id=entry.hub->>'id';
  return jsonb_set(result,'{data,hubs}',hubs);
end $$;

create or replace function public.demo_view(p_role text,p_view text,p_filter jsonb default '{}')
returns jsonb language sql volatile security definer set search_path='' as $$
  select app.view_for_profile(app.demo_actor(p_role),p_view,p_filter)
$$;

-- Existing simulation runs retain their captured JSON. New alternatives use
-- admissible parking capacity rather than vacant bays already covered by holds.
alter function app.what_if_baseline(text) rename to what_if_baseline_before_shared_availability;
create function app.what_if_baseline(target_hub text) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_set(snapshot.baseline,'{alternatives}',app.list_json((
    select jsonb_agg(entry.hub || jsonb_build_object('parkingFree',s.parking_admission_free) order by entry.position)
    from jsonb_array_elements(snapshot.baseline->'alternatives') with ordinality as entry(hub, position)
    join app.hub_summary s on s.id=entry.hub->>'id'
  )))
  from (select app.what_if_baseline_before_shared_availability(target_hub) as baseline) snapshot
$$;

revoke all on function app.view_for_profile(app.profiles,text,jsonb),app.what_if_baseline(text)
  from public,anon,authenticated;
