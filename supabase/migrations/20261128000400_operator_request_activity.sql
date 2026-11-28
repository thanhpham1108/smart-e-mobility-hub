-- Existing bookings have no recorded submission time. Preserve that distinction.
alter table app.parking_reservations add column created_at timestamptz;
alter table app.parking_reservations alter column created_at set default clock_timestamp();

alter function app.view_for_profile(app.profiles,text,jsonb) rename to view_before_operator_activity;
create function app.view_for_profile(p app.profiles,p_view text,p_filter jsonb default '{}')
returns jsonb language plpgsql volatile set search_path='' as $$
declare result jsonb; bookings jsonb;
begin
  result := app.view_before_operator_activity(p,p_view,p_filter);
  if p_view is distinct from 'charging' or result->>'ok' is distinct from 'true' then return result; end if;

  select app.list_json(jsonb_agg(jsonb_build_object(
    'reservationId',b.reservation_id,'hubId',b.hub_id,'vehicleId',b.vehicle_id,'vehicleName',v.name,
    'status',b.status,'createdAt',b.created_at,'arrivalTime',b.arrival_time,'departureTime',b.departure_time
  ) order by b.created_at desc nulls last,b.arrival_time desc,b.reservation_id))
  into bookings
  from app.parking_reservations b join app.vehicles v using(vehicle_id)
  where p_filter->>'hubId' is null or b.hub_id=p_filter->>'hubId';

  return jsonb_set(result,'{data,parkingBookings}',bookings);
end $$;

create or replace function public.demo_view(p_role text,p_view text,p_filter jsonb default '{}')
returns jsonb language sql volatile security definer set search_path='' as $$
  select app.view_for_profile(app.demo_actor(p_role),p_view,p_filter)
$$;

revoke all on function app.view_for_profile(app.profiles,text,jsonb) from public,anon,authenticated;
