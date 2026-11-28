begin;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000009',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select app.restore_demo();

create function pg_temp.hub(role_name text,view_name text,hub_id text) returns jsonb
language sql volatile as $$
  select h from jsonb_array_elements(public.demo_view(role_name,view_name)#>'{data,hubs}') h where h->>'id'=hub_id
$$;

create function pg_temp.run_demo(role_name text,op text,input jsonb default '{}') returns jsonb
language plpgsql as $$
declare r jsonb;
begin
  r:=public.demo_command(role_name,op,input,gen_random_uuid());
  perform app.need(r->>'ok'='true',op||': '||r::text);
  return r->'data';
end $$;

do $$
declare h jsonb; live_at_start jsonb; simulation jsonb; legacy_id text;
  booking text; request text; allocation text; point text; session text; event jsonb; r jsonb;
begin
  perform app.need(pg_temp.hub('student','hubs','hcmut')->>'freshness'='Stale'
    and pg_temp.hub('operator','network','hcmut')->>'freshness'='Stale'
    and app.what_if_baseline('hcmut')->>'freshness'='Stale','HUB_FRESHNESS_DIFFERS_BETWEEN_MODULES');

  simulation:=pg_temp.run_demo('operator','simulation.configure',
    '{"name":"Parking handoff","hubId":"metro","horizonMinutes":60,"kind":"Parking surge","magnitude":1}');
  r:=pg_temp.run_demo('operator','simulation.start',jsonb_build_object('scenarioId',simulation->>'scenario_id'));
  live_at_start:=r#>'{snapshot,baseline}';
  legacy_id:=r#>>'{snapshot,snapshot_id}';
  perform app.need(live_at_start @> '{"parking_free":1,"parking_admission_free":1}'::jsonb,'WRONG_INITIAL_PARKING_BASELINE');

  r:=pg_temp.run_demo('student','parking.reserve',
    '{"hubId":"metro","vehicleId":"private-student-car-01","arrivalTime":"2026-10-24T02:00:00Z","departureTime":"2026-10-24T03:00:00Z"}');
  booking:=r->>'reservationId';
  h:='{"parking_free":1,"parking_admission_free":0,"parking_pending":1}'::jsonb;
  perform app.need(pg_temp.hub('student','parking','metro') @> h
    and pg_temp.hub('student','hubs','metro') @> h
    and pg_temp.hub('operator','network','metro') @> h
    and pg_temp.hub('operator','charging','metro') @> h
    and app.what_if_baseline('metro') @> h,'PARKING_HOLD_NOT_SYNCED');
  perform app.need((select baseline=live_at_start from app.simulation_snapshots where snapshot_id=legacy_id),
    'LIVE_BOOKING_CHANGED_EXISTING_WHAT_IF_SNAPSHOT');
  perform app.need((app.what_if_baseline('ktx-a')->'alternatives') @> '[{"id":"metro","parkingFree":0}]',
    'WHAT_IF_RECOMMENDED_ALREADY_HELD_PARKING');
  perform pg_temp.run_demo('student','parking.cancel',jsonb_build_object('reservationId',booking));

  r:=pg_temp.run_demo('operator','charging.submit','{"hubId":"ktx-a","vehicleId":"rental-a-01",
    "requestedStart":"2026-10-24T02:00:00Z","requestedEnd":"2026-10-24T03:00:00Z","targetBatteryPercent":95}');
  request:=r->>'requestId'; allocation:=r->>'allocationId';
  select point_id into point from app.charging_allocations where allocation_id=allocation;
  perform app.need(public.demo_view('student','rental')#>'{data,vehicles}' @>
    '[{"vehicle_id":"rental-a-01","chargingCommitted":true}]','CHARGING_NOT_SYNCED_TO_RENTAL');
  perform app.need(public.demo_view('operator','fleet.validate',
    '{"sourceHubId":"ktx-a","destinationHubId":"hcmut","vehicleIds":["rental-a-01"]}')#>>'{data,feasible}'='false',
    'FLEET_OFFERED_A_CHARGING_VEHICLE');

  event:=jsonb_build_object('kind','START','eventId','shared-start','requestId',request,'pointId',point,'vehicleId','rental-a-01');
  update app.hubs set status='Offline' where id='ktx-a';
  perform app.need(pg_temp.hub('student','hubs','ktx-a') @> '{"vehicles_free":0,"charging_free":0}',
    'OFFLINE_HUB_ADVERTISED_AVAILABLE_CAPACITY');
  perform app.need(public.demo_command('operator','charging.event',event,gen_random_uuid())->>'code'='HUB_UNAVAILABLE',
    'CHARGING_STARTED_WHILE_HUB_OFFLINE');
  update app.hubs set status='Operational' where id='ktx-a';
  r:=pg_temp.run_demo('operator','charging.event',event);
  session:=r->>'active_session_id';
  perform pg_temp.run_demo('operator','demo.advance');
  perform pg_temp.run_demo('operator','telemetry.vehicle','{"eventId":"shared-battery","vehicleId":"rental-a-01","batteryPercent":90}');
  event:=event||jsonb_build_object('kind','TARGET_REACHED','eventId','shared-stale-target','sessionId',session,
    'batteryPercent',95,'observedAt','2026-10-24T02:00:00Z');
  perform app.need(public.demo_command('operator','charging.event',event,gen_random_uuid())->>'code'='STALE_VEHICLE_BATTERY',
    'OLD_CHARGING_EVENT_OVERWROTE_NEWER_VEHICLE_TELEMETRY');
  perform pg_temp.run_demo('operator','charging.event',event||'{"eventId":"shared-confirmed-target","observedAt":"2026-10-24T02:15:00Z"}');
  perform app.need(public.demo_view('student','rental')#>'{data,vehicles}' @>
    '[{"vehicle_id":"rental-a-01","chargingCommitted":false,"battery_level":95}]','FINAL_BATTERY_NOT_SYNCED_TO_RENTAL');

  r:=pg_temp.run_demo('operator','charging.submit','{"hubId":"ktx-a","vehicleId":"rental-a-02",
    "requestedStart":"2026-10-24T02:15:00Z","requestedEnd":"2026-10-24T03:00:00Z","targetBatteryPercent":95}');
  request:=r->>'requestId'; allocation:=r->>'allocationId';
  select point_id into point from app.charging_allocations where allocation_id=allocation;
  perform pg_temp.run_demo('operator','incident.report','{"vehicleId":"rental-a-02","description":"Inspect battery fault before use."}');
  event:=jsonb_build_object('kind','START','eventId','shared-restricted-start','requestId',request,'pointId',point,'vehicleId','rental-a-02');
  perform app.need(public.demo_command('operator','charging.event',event,gen_random_uuid())->>'code'='VEHICLE_UNAVAILABLE',
    'CHARGING_STARTED_ON_RESTRICTED_VEHICLE');
  perform app.need((select released_at is null from app.charging_allocations where allocation_id=allocation),
    'INCIDENT_SILENTLY_RELEASED_EXISTING_CHARGING_COMMITMENT');
end $$;
rollback;
