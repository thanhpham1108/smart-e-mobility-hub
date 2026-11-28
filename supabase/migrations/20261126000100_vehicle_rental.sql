-- Add the Rental screens' capabilities through the existing account and demo RPCs.
alter table app.rental_trips
  add column return_parking_space_id text references app.parking_spaces(space_id),
  add column return_condition text check (return_condition in ('OPERATIONAL','FAULTED')),
  add column distance_km numeric check (distance_km >= 0 and distance_km < 'Infinity'::numeric);

alter table app.incident_history
  add column rental_trip_id text references app.rental_trips(trip_id) on delete set null;

-- Keep the parking owner's capacity, future holds and reconciliation checks.
create function app.rental_return_spaces(p_hub text,p_now timestamptz)
returns setof text language sql stable set search_path='' as $$
  select s.space_id
  from app.parking_spaces s
  where s.hub_id=p_hub and s.in_service
    and app.free_space(p_hub,p_now,true) is not null
    and not exists(select from app.vehicles v where v.parking_space_id=s.space_id)
    and not exists(select from app.parking_sessions ps where ps.parking_space_id=s.space_id and ps.status='Active')
  order by s.space_id
$$;

alter function app.mobility_action(app.profiles,text,jsonb,timestamptz) rename to mobility_before_rental;
create function app.mobility_action(p app.profiles,op text,d jsonb,t timestamptz)
returns jsonb language plpgsql set search_path='' as $$
declare
  hold app.rental_reservations;
  trip app.rental_trips;
  hub text:=d->>'hubId';
  space text;
  condition_at_return text;
  distance numeric;
begin
  perform app.need(p.role='student','FORBIDDEN');
  if op='rental.pickup' then
    select * into hold from app.rental_reservations
      where reservation_id=d->>'reservationId' and student_id=p.user_id;
    perform app.need(hold.status='CONFIRMED' and hold.expires_at>t,'RENTAL_HOLD_UNAVAILABLE');
    if d ? 'vehicleId' then
      perform app.need(trim(d->>'vehicleId')=hold.vehicle_id,'RENTAL_VEHICLE_MISMATCH');
    end if;
    perform app.need(exists(select from app.vehicles v join app.hubs h on h.id=v.current_hub_id
      where v.vehicle_id=hold.vehicle_id and v.status='RESERVED' and v.condition='OPERATIONAL'
        and h.status='Operational'
        and not exists(select from app.charging_requests c where c.vehicle_id=v.vehicle_id
          and c.status in ('Waiting','Scheduled','Charging','Suspended'))),'VEHICLE_UNAVAILABLE');
    perform app.need((d->'simulateDeviceFailure') is distinct from 'true'::jsonb,'RENTAL_UNLOCK_FAILED');
  elsif op='rental.return' then
    select * into trip from app.rental_trips where trip_id=d->>'tripId' and student_id=p.user_id and status='ACTIVE';
    perform app.need(trip.trip_id is not null,'TRIP_NOT_FOUND');
    perform app.need(exists(select from app.hubs where id=hub and status='Operational'),'HUB_UNAVAILABLE');
    if d ? 'parkingSpaceId' then
      select s.space_id into space from app.rental_return_spaces(hub,t) as s(space_id)
        where s.space_id=d->>'parkingSpaceId';
      perform app.need(space is not null,'RETURN_SPACE_UNAVAILABLE');
    else
      space:=app.free_space(hub,t,true);
      perform app.need(space is not null,'PARKING_FULL');
    end if;
    if coalesce(jsonb_typeof(d->'distanceKm'),'null')<>'null' then
      perform app.need(jsonb_typeof(d->'distanceKm')='number','INVALID_INPUT');
      distance:=(d->>'distanceKm')::numeric;
      perform app.need(distance>=0,'INVALID_INPUT');
    end if;
    perform app.need((d->'simulateDeviceFailure') is distinct from 'true'::jsonb,'RENTAL_LOCK_FAILED');
    update app.vehicles set status=case when condition='OPERATIONAL' then 'AVAILABLE' else 'UNDER_MAINTENANCE' end,
      current_hub_id=hub,parking_space_id=space,last_updated=t where vehicle_id=trip.vehicle_id
      returning condition into condition_at_return;
    update app.rental_trips set end_hub_id=hub,end_time=t,status='COMPLETED',
      return_parking_space_id=space,return_condition=condition_at_return,distance_km=distance where trip_id=trip.trip_id;
    return jsonb_build_object('tripId',trip.trip_id,'parkingSpaceId',space);
  end if;
  return app.mobility_before_rental(p,op,d,t);
end $$;

-- Keep Fleet's restriction and evidence workflow and attach the active trip to Student evidence.
alter function app.incident_action(app.profiles,text,jsonb,timestamptz) rename to incident_before_rental;
create function app.incident_action(p app.profiles,op text,d jsonb,t timestamptz)
returns jsonb language plpgsql set search_path='' as $$
declare
  trip text;
  result jsonb;
begin
  if op='incident.report' and p.role='student' then
    select r.trip_id into trip from app.rental_trips r
      where r.student_id=p.user_id and r.vehicle_id=d->>'vehicleId' and r.status='ACTIVE'
        and (not (d ? 'tripId') or r.trip_id=d->>'tripId');
    perform app.need(trip is not null,'FORBIDDEN');
    result:=app.incident_before_rental(p,op,d,t);
    update app.incident_history set rental_trip_id=trip where sequence_no=(
      select max(sequence_no) from app.incident_history
      where incident_id=result->>'incidentId' and actor_id=p.user_id and action='Evidence'
    );
    return result;
  end if;
  return app.incident_before_rental(p,op,d,t);
end $$;

alter function app.view_for_profile(app.profiles,text,jsonb) rename to view_before_rental;
create function app.view_for_profile(p app.profiles,p_view text,p_filter jsonb default '{}')
returns jsonb language plpgsql stable set search_path='' as $$
declare
  t app.demo_state;
  hub text:=p_filter->>'hubId';
begin
  if p_view is distinct from 'rental.returnOptions' then
    return app.view_before_rental(p,p_view,p_filter);
  end if;
  perform app.need(p.user_id is not null,'AUTH_REQUIRED');
  perform app.need(p.role='student','FORBIDDEN');
  select * into t from app.demo_state where singleton;
  perform app.need(t.singleton,'DEMO_NOT_INITIALIZED');
  perform app.need(exists(select from app.rental_trips where trip_id=p_filter->>'tripId'
    and student_id=p.user_id and status='ACTIVE'),'TRIP_NOT_FOUND');
  perform app.need(exists(select from app.hubs where id=hub and status='Operational'),'HUB_UNAVAILABLE');
  return jsonb_build_object('ok',true,'data',jsonb_build_object('hubId',hub,'demoTime',t.demo_time,'revision',t.revision,
    'spaces',app.list_json((select jsonb_agg(jsonb_build_object('spaceId',s.space_id) order by s.space_id)
      from app.rental_return_spaces(hub,t.demo_time) as s(space_id)))));
exception when raise_exception then return jsonb_build_object('ok',false,'code',sqlerrm);
end $$;

create or replace function public.demo_view(p_role text,p_view text,p_filter jsonb default '{}')
returns jsonb language sql stable security definer set search_path='' as $$
  select app.view_for_profile(app.demo_actor(p_role),p_view,p_filter)
$$;

revoke all on function app.rental_return_spaces(text,timestamptz),
  app.mobility_action(app.profiles,text,jsonb,timestamptz),app.incident_action(app.profiles,text,jsonb,timestamptz),
  app.view_for_profile(app.profiles,text,jsonb) from public,anon,authenticated;
