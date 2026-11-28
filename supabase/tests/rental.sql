-- Vehicle rental checks for the demo RPCs and their shared database effects.
begin;
select app.restore_demo();
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000045',true);

create function pg_temp.rental_cmd(op text,d jsonb,expected text default null)
returns jsonb language plpgsql as $$
declare r jsonb;
begin
  r:=public.demo_command('student',op,d,gen_random_uuid());
  if expected is null then perform app.need(r->>'ok'='true',op||': '||r::text);
  else perform app.need(r->>'code'=expected,op||': expected '||expected||', got '||r::text); end if;
  return r->'data';
end $$;

do $$
declare
  reserve_input constant jsonb:='{"vehicleId":"rental-a-01"}';
  receipt uuid:=gen_random_uuid();
  reserved jsonb;
  pickup jsonb;
  trip text;
  options jsonb;
  return_input jsonb;
  selected_space text;
  ticket text;
  original_space text;
begin
  perform app.need((select provolatile='v' from pg_proc where oid='public.demo_view(text,text,jsonb)'::regprocedure),
    'DEMO_VIEW_MUST_ALLOW_PARKING_AND_FLEET_RECONCILIATION');
  select parking_space_id into original_space from app.vehicles where vehicle_id='rental-a-01';
  reserved:=public.demo_command('student','rental.reserve',reserve_input,receipt);
  perform app.need(reserved->>'ok'='true',reserved::text);
  perform app.need(public.demo_command('student','rental.reserve',reserve_input,receipt)=reserved,'RENTAL_RESERVE_RETRY');
  perform pg_temp.rental_cmd('rental.reserve',reserve_input,'VEHICLE_UNAVAILABLE');
  pickup:=jsonb_build_object('vehicleId','rental-a-01','reservationId',reserved#>>'{data,reservationId}');
  perform app.need((select expires_at-created_at=interval '15 minutes' from app.rental_reservations
    where reservation_id=pickup->>'reservationId'),'RENTAL_HOLD_DURATION');
  perform pg_temp.rental_cmd('rental.pickup',pickup||'{"vehicleId":"rental-a-02"}','RENTAL_VEHICLE_MISMATCH');
  perform pg_temp.rental_cmd('rental.pickup',pickup||'{"simulateDeviceFailure":true}','RENTAL_UNLOCK_FAILED');
  perform app.need(not exists(select from app.rental_trips),'FAILED_PICKUP_STARTED_TRIP');
  perform app.need((select status='RESERVED' and parking_space_id=original_space from app.vehicles
    where vehicle_id='rental-a-01'),'FAILED_PICKUP_RELEASED_PARKING');

  perform app.need(public.demo_command('operator','demo.advance','{}',gen_random_uuid())->>'ok'='true','RENTAL_CLOCK');
  perform pg_temp.rental_cmd('rental.pickup',pickup,'RENTAL_HOLD_UNAVAILABLE');
  perform app.need((select status='EXPIRED' and expires_at=(select demo_time from app.demo_state)
    from app.rental_reservations where reservation_id=pickup->>'reservationId'),'RENTAL_EXPIRY_BOUNDARY');
  perform app.need((select status='AVAILABLE' and parking_space_id=original_space from app.vehicles
    where vehicle_id='rental-a-01'),'EXPIRY_CHANGED_PARKING');

  pickup:=reserve_input||pg_temp.rental_cmd('rental.reserve',reserve_input);
  perform pg_temp.rental_cmd('rental.cancel',pickup);
  perform app.need((select status='CANCELLED' from app.rental_reservations where reservation_id=pickup->>'reservationId'),
    'RENTAL_CANCEL_STATUS');
  pickup:=reserve_input||pg_temp.rental_cmd('rental.reserve',reserve_input);
  trip:=pg_temp.rental_cmd('rental.pickup',pickup)->>'tripId';
  perform app.need((select status='IN_USE' and parking_space_id is null and current_hub_id is null
    from app.vehicles where vehicle_id='rental-a-01'),'PICKUP_DID_NOT_RELEASE_PARKING');
  return_input:=jsonb_build_object('tripId',trip,'hubId','hcmut');
  perform app.need(public.demo_view('operator','rental.returnOptions',return_input)->>'code'='FORBIDDEN','OPERATOR_RETURN_READ');
  perform app.need(public.demo_view('student','rental.returnOptions',
    return_input||'{"tripId":"unknown"}')->>'code'='TRIP_NOT_FOUND','UNOWNED_RETURN_OPTIONS');
  options:=public.demo_view('student','rental.returnOptions',return_input);
  perform app.need(options->>'ok'='true' and jsonb_array_length(options#>'{data,spaces}')>=2,options::text);
  selected_space:=options#>>'{data,spaces,0,spaceId}';
  update app.parking_spaces set in_service=false where space_id=selected_space;
  perform pg_temp.rental_cmd('rental.return',return_input||jsonb_build_object('parkingSpaceId',selected_space),'RETURN_SPACE_UNAVAILABLE');
  perform app.need((select status='ACTIVE' from app.rental_trips where trip_id=trip),'STALE_SLOT_COMPLETED_TRIP');

  selected_space:=options#>>'{data,spaces,1,spaceId}';
  return_input:=return_input||jsonb_build_object('parkingSpaceId',selected_space);
  perform pg_temp.rental_cmd('rental.return',return_input||'{"distanceKm":-1}','INVALID_INPUT');
  perform pg_temp.rental_cmd('rental.return',return_input||'{"simulateDeviceFailure":true}','RENTAL_LOCK_FAILED');
  perform app.need(not exists(select from app.vehicles where parking_space_id=selected_space),'FAILED_LOCK_TOOK_SPACE');
  perform pg_temp.rental_cmd('incident.report',reserve_input||'{"tripId":"unknown","description":"Brake fault"}','FORBIDDEN');
  ticket:=pg_temp.rental_cmd('incident.report',
    reserve_input||jsonb_build_object('tripId',trip,'description','Brake fault'))->>'incidentId';
  perform app.need(exists(select from app.incident_history where incident_id=ticket and rental_trip_id=trip),'MISSING_RENTAL_EVIDENCE');
  perform app.need((select status='IN_USE' and condition='FAULTED' from app.vehicles where vehicle_id='rental-a-01'),
    'REPORT_ENDED_TRIP');
  perform pg_temp.rental_cmd('rental.return',return_input||'{"distanceKm":3.5}');
  perform app.need((select status='COMPLETED' and return_condition='FAULTED' and distance_km=3.5
    and return_parking_space_id=selected_space and end_hub_id='hcmut'
    from app.rental_trips where trip_id=trip),'RENTAL_COMPLETION');
  perform app.need((select status='UNDER_MAINTENANCE' and condition='FAULTED'
    and current_hub_id='hcmut' and parking_space_id=selected_space from app.vehicles where vehicle_id='rental-a-01'),
    'FAULTED_RETURN_STATE');
  perform app.need(exists(select from jsonb_array_elements(public.demo_view('student','rental')#>'{data,trips}') item
    where item->>'trip_id'=trip and item->>'return_parking_space_id'=selected_space),'TRIP_SUMMARY_NOT_VISIBLE');
  perform pg_temp.rental_cmd('rental.reserve',reserve_input,'VEHICLE_UNAVAILABLE');
  perform app.need(public.demo_command('operator','demo.reset','{"confirm":true}',gen_random_uuid())->>'ok'='true',
    'RENTAL_RESET_WITH_INCIDENT_EVIDENCE');
end $$;
rollback;
