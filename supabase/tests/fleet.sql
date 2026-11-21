-- Member 4 integration checks. A disposable database only; all changes roll back.
begin;
select app.restore_demo();
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000044',true);

create function pg_temp.fleet_cmd(op text,d jsonb default '{}',expected_error text default null) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  r:=public.demo_command('operator',op,d,gen_random_uuid());
  if expected_error is null then perform app.need(r->>'ok'='true',op||': '||r::text);
  else perform app.need(r->>'code'=expected_error,op||': expected '||expected_error||', got '||r::text); end if;
  return r->'data';
end $$;
create function pg_temp.ticket_step(id text,op text,d jsonb default '{}') returns jsonb language sql as $$
  select pg_temp.fleet_cmd(op,d||jsonb_build_object('incidentId',id,'expectedVersion',(select version from app.incident_tickets where incident_id=id)))
$$;
create function pg_temp.repair_ticket(id text) returns void language plpgsql as $$
begin
  perform pg_temp.ticket_step(id,'incident.investigate');
  perform pg_temp.ticket_step(id,'incident.plan','{"assignee":"Test technician","note":"Inspect and repair"}');
  perform pg_temp.ticket_step(id,'incident.repair','{"note":"Tested recovery","complete":true}');
  perform pg_temp.ticket_step(id,'incident.resolve','{"verified":true}');
end $$;

do $$
declare d jsonb; r jsonb; proposal jsonb; before_state jsonb; transfer_id text; first_ticket text; second_ticket text; observed jsonb;
  source_space text; rev bigint; event_count integer; current_time timestamptz;
begin
  perform app.need(public.demo_view('student','fleet')->>'code'='FORBIDDEN','STUDENT_FLEET_ACCESS');
  perform app.need(public.demo_command('student','telemetry.vehicle','{}',gen_random_uuid())->>'code'='FORBIDDEN','STUDENT_TELEMETRY_ACCESS');
  perform app.need(not has_table_privilege('authenticated','app.fleet_observations','select'),'PRIVATE_TABLE_EXPOSED');
  perform app.need(not has_function_privilege('authenticated','app.incident_action(app.profiles,text,jsonb,timestamptz)','execute'),'HELPER_EXPOSED');
  d:='{"sourceHubId":"ktx-a","destinationHubId":"hcmut","vehicleIds":["rental-a-01","rental-a-02"]}';
  select revision into rev from app.demo_state;
  select jsonb_agg(to_jsonb(v) order by vehicle_id) into before_state from app.vehicles v;
  proposal:=public.demo_view('operator','fleet.validate',d);
  perform app.need(proposal#>>'{data,feasible}'='true',proposal::text);
  perform app.need((select revision=rev from app.demo_state),'REVIEW_CHANGED_REVISION');
  perform app.need(before_state=(select jsonb_agg(to_jsonb(v) order by vehicle_id) from app.vehicles v),'REVIEW_CHANGED_VEHICLES');
  perform pg_temp.fleet_cmd('fleet.create',d||'{"validationToken":"old"}','STALE_TRANSFER_REVIEW');
  perform app.need(public.demo_view('operator','fleet.validate',d||'{"vehicleIds":["rental-a-01","rental-a-01"]}')->>'code'='DUPLICATE_VEHICLE','DUPLICATE_SELECTION');
  perform app.need(public.demo_view('operator','fleet.validate',d||'{"sourceHubId":"hcmut"}')#>>'{data,feasible}'='false','SAME_HUB_ALLOWED');
  select parking_space_id into source_space from app.vehicles where vehicle_id='rental-a-01';
  r:=pg_temp.fleet_cmd('fleet.create',d||jsonb_build_object('validationToken',proposal#>>'{data,validationToken}'));
  transfer_id:=r->>'orderId';
  perform app.need((select status='REDISTRIBUTING' and parking_space_id=source_space and current_hub_id='ktx-a' from app.vehicles where vehicle_id='rental-a-01'),'CREATE_MOVED_VEHICLE');
  perform app.need((select parking_free=2 from app.hub_summary where id='hcmut'),'CREATE_RESERVED_DESTINATION');
  perform pg_temp.fleet_cmd('fleet.dispatch',jsonb_build_object('orderId',transfer_id,'expectedVersion',0),'STALE_ORDER');
  perform pg_temp.fleet_cmd('fleet.dispatch',jsonb_build_object('orderId',transfer_id,'expectedVersion',1));
  perform app.need((select parking_space_id is null and current_hub_id='ktx-a' from app.vehicles where vehicle_id='rental-a-01'),'DISPATCH_LOCATION');
  perform pg_temp.fleet_cmd('fleet.cancel',jsonb_build_object('orderId',transfer_id,'expectedVersion',2),'TRANSFER_ALREADY_DISPATCHED');
  -- One of two spaces becomes unavailable after review/dispatch: no partial batch commit.
  update app.parking_spaces set in_service=false where space_id=(select space_id from app.parking_spaces where hub_id='hcmut' order by space_id limit 1);
  r:=pg_temp.fleet_cmd('fleet.arrive',jsonb_build_object('orderId',transfer_id,'expectedVersion',2,'vehicleIds','["rental-a-01","rental-a-02"]'::jsonb));
  perform app.need(r->>'status'='AtRisk',r::text);
  perform app.need(not exists(select from app.redistribution_order_vehicles where order_id=transfer_id and arrived_at is not null),'BATCH_PARTIALLY_COMMITTED');
  perform app.need((select count(*)=2 from app.vehicles where vehicle_id in ('rental-a-01','rental-a-02') and current_hub_id='ktx-a' and parking_space_id is null),'FAILED_BATCH_MOVED_VEHICLE');
  update app.parking_spaces set in_service=true where hub_id='hcmut';
  perform pg_temp.fleet_cmd('fleet.revalidate',jsonb_build_object('orderId',transfer_id,'expectedVersion',3));
  r:=pg_temp.fleet_cmd('fleet.arrive',jsonb_build_object('orderId',transfer_id,'expectedVersion',4,'vehicleIds','["rental-a-01"]'::jsonb));
  perform app.need(r->>'status'='Partial',r::text);
  perform app.need((select parking_free=1 from app.hub_summary where id='hcmut'),'PARTIAL_OCCUPANCY');
  perform pg_temp.fleet_cmd('fleet.arrive',jsonb_build_object('orderId',transfer_id,'expectedVersion',5,'vehicleIds','["rental-a-01"]'::jsonb),'INVALID_ARRIVAL');
  r:=pg_temp.fleet_cmd('incident.report','{"vehicleId":"rental-a-02","faultKey":"brake","description":"Brake failure","severity":"High"}');
  first_ticket:=r->>'incidentId';
  perform app.need((select status='AtRisk' and resume_status='Partial' from app.redistribution_orders o where o.order_id=transfer_id),'FAULT_NOT_FLAGGED');
  perform pg_temp.fleet_cmd('fleet.revalidate',jsonb_build_object('orderId',transfer_id,'expectedVersion',6),'VEHICLE_UNAVAILABLE');
  r:=pg_temp.fleet_cmd('incident.report','{"vehicleId":"rental-a-02","faultKey":"brake","description":"Additional brake evidence"}');
  perform app.need(r->>'incidentId'=first_ticket,'INCIDENT_NOT_DEDUPED');
  r:=pg_temp.fleet_cmd('incident.report','{"vehicleId":"rental-a-02","faultKey":"battery","description":"Battery fault"}');
  second_ticket:=r->>'incidentId';
  perform pg_temp.fleet_cmd('incident.resolve',jsonb_build_object('incidentId',first_ticket,'expectedVersion',2,'verified',true),'RECOVERY_NOT_VERIFIED');
  perform pg_temp.fleet_cmd('incident.investigate',jsonb_build_object('incidentId',first_ticket,'expectedVersion',1),'STALE_INCIDENT');
  perform pg_temp.repair_ticket(first_ticket);
  perform app.need((select condition='FAULTED' and status='REDISTRIBUTING' from app.vehicles where vehicle_id='rental-a-02'),'OTHER_RESTRICTION_LOST');
  perform pg_temp.repair_ticket(second_ticket);
  perform app.need((select condition='OPERATIONAL' and status='REDISTRIBUTING' from app.vehicles where vehicle_id='rental-a-02'),'TRANSFER_COMMITMENT_LOST');
  perform pg_temp.fleet_cmd('fleet.revalidate',jsonb_build_object('orderId',transfer_id,'expectedVersion',(select version from app.redistribution_orders o where o.order_id=transfer_id)));
  perform pg_temp.fleet_cmd('fleet.arrive',jsonb_build_object('orderId',transfer_id,'expectedVersion',(select version from app.redistribution_orders o where o.order_id=transfer_id),'vehicleIds','["rental-a-02"]'::jsonb));
  perform app.need((select parking_free=0 from app.hub_summary where id='hcmut'),'COMPLETED_OCCUPANCY');

  -- A verified cancellation after partial arrival must preserve that arrival.
  perform app.restore_demo();
  proposal:=public.demo_view('operator','fleet.validate',d);
  r:=pg_temp.fleet_cmd('fleet.create',d||jsonb_build_object('validationToken',proposal#>>'{data,validationToken}'));
  transfer_id:=r->>'orderId';
  perform pg_temp.fleet_cmd('fleet.dispatch',jsonb_build_object('orderId',transfer_id,'expectedVersion',1));
  perform pg_temp.fleet_cmd('fleet.arrive',jsonb_build_object('orderId',transfer_id,'expectedVersion',2,'vehicleIds','["rental-a-01"]'::jsonb));
  perform pg_temp.fleet_cmd('incident.report','{"vehicleId":"rental-a-02","description":"Return for repair"}');
  perform pg_temp.fleet_cmd('fleet.cancel',jsonb_build_object('orderId',transfer_id,'expectedVersion',4),'DISPOSITION_REQUIRED');
  r:=pg_temp.fleet_cmd('fleet.cancel',jsonb_build_object('orderId',transfer_id,'expectedVersion',4,'sourceDispositionVerified',true,'note','Operator received rental-a-02 back at KTX A.'));
  perform app.need(r->>'status'='Cancelled',r::text);
  perform app.need((select current_hub_id='hcmut' and status='AVAILABLE' and parking_space_id is not null from app.vehicles where vehicle_id='rental-a-01'),'CANCEL_MOVED_ARRIVED_VEHICLE');
  perform app.need((select current_hub_id='ktx-a' and status='UNDER_MAINTENANCE' and parking_space_id is not null from app.vehicles where vehicle_id='rental-a-02'),'CANCEL_LOST_RESTRICTION_OR_OCCUPANCY');
  perform app.need((select arrived_at is null from app.redistribution_order_vehicles ov where ov.order_id=transfer_id and vehicle_id='rental-a-02'),'CANCEL_INVENTED_ARRIVAL');

  perform app.restore_demo();
  perform pg_temp.fleet_cmd('demo.advance');
  perform app.need(public.demo_view('operator','fleet.validate',d)#>>'{data,feasible}'='false','STALE_REVIEW_ALLOWED');
  perform pg_temp.fleet_cmd('telemetry.vehicle','{"eventId":"boundary","vehicleId":"rental-a-01","batteryPercent":80,"observedAt":"2026-10-24T02:00:00Z"}','STALE_OBSERVATION');
  perform pg_temp.fleet_cmd('telemetry.vehicle','{"eventId":"fresh-a1","vehicleId":"rental-a-01","batteryPercent":80}');
  perform pg_temp.fleet_cmd('telemetry.vehicle','{"eventId":"fresh-a2","vehicleId":"rental-a-02","batteryPercent":70}');
  perform pg_temp.fleet_cmd('telemetry.parking','{"eventId":"fresh-parking","hubId":"hcmut","occupiedCount":0}');
  perform app.need(public.demo_view('operator','fleet.validate',d)#>>'{data,feasible}'='true','FRESH_REVIEW_BLOCKED');

  perform app.restore_demo();
  observed:='{"eventId":"vehicle-event","vehicleId":"rental-a-01","batteryPercent":44,"condition":"FAULTED","observedHubId":"hcmut","faultKey":"motor","description":"Motor fault"}';
  r:=pg_temp.fleet_cmd('telemetry.vehicle',observed);
  perform app.need(r->>'status'='RECONCILIATION_REQUIRED' and r->>'incidentId' is not null,r::text);
  first_ticket:=r->>'incidentId';
  perform app.need((select current_hub_id='ktx-a' and parking_space_id is not null from app.vehicles where vehicle_id='rental-a-01'),'TELEMETRY_MOVED_VEHICLE');
  perform app.need(pg_temp.fleet_cmd('telemetry.vehicle',observed)->>'duplicate'='true','EVENT_NOT_DEDUPED');
  perform app.need((select count(*)=1 from app.incident_history where incident_id=first_ticket),'DUPLICATE_EVIDENCE');
  perform pg_temp.fleet_cmd('telemetry.vehicle',observed||'{"batteryPercent":45}','EVENT_CONFLICT');
  perform pg_temp.fleet_cmd('telemetry.vehicle',observed||'{"eventId":"equal-time"}','STALE_OBSERVATION');
  perform pg_temp.fleet_cmd('telemetry.vehicle',observed||'{"eventId":"future","observedAt":"2099-01-01T00:00:00Z"}','STALE_OBSERVATION');
  perform pg_temp.fleet_cmd('telemetry.vehicle',observed||'{"eventId":"old","observedAt":"2026-10-24T01:00:00Z"}','STALE_OBSERVATION');
  perform pg_temp.fleet_cmd('demo.advance');
  perform pg_temp.fleet_cmd('telemetry.vehicle',observed||'{"eventId":"healthy","condition":"OPERATIONAL"}');
  perform app.need((select condition='FAULTED' from app.vehicles where vehicle_id='rental-a-01'),'TELEMETRY_LIFTED_RESTRICTION');
  perform pg_temp.repair_ticket(first_ticket);
  r:=pg_temp.fleet_cmd('incident.report','{"vehicleId":"rental-a-01","faultKey":"motor","description":"Fault recurred"}');
  perform app.need(r->>'incidentId'=first_ticket and r->>'status'='Investigating' and r->>'repaired_at' is null,'REOPEN_RETAINED_VERIFICATION');

  perform app.restore_demo();
  r:=pg_temp.fleet_cmd('telemetry.point','{"pointId":"charge-a-01","status":"Faulty","eventId":"point-fault"}');
  first_ticket:=r->>'incidentId';
  perform app.need((select count(*)=1 from app.charging_sessions where point_id='charge-a-01' and ended_at is null),'FAULT_STOPPED_ACTIVE_SESSION');
  perform pg_temp.ticket_step(first_ticket,'incident.investigate');
  perform pg_temp.ticket_step(first_ticket,'incident.plan','{"assignee":"Technician","note":"Inspect point"}');
  perform pg_temp.ticket_step(first_ticket,'incident.repair','{"note":"Repair complete","complete":true}');
  perform pg_temp.fleet_cmd('incident.resolve',jsonb_build_object('incidentId',first_ticket,'expectedVersion',4,'verified',true),'POINT_NOT_RECOVERED');
  perform pg_temp.fleet_cmd('demo.advance');
  perform pg_temp.fleet_cmd('telemetry.point','{"pointId":"charge-a-01","status":"Operational","eventId":"point-healthy"}');
  perform app.need((select lifted_at is null from app.resource_restrictions where incident_id=first_ticket),'POINT_OBSERVATION_LIFTED_RESTRICTION');
  perform pg_temp.ticket_step(first_ticket,'incident.resolve','{"verified":true}');
  perform app.need((select count(*)=1 from app.charging_sessions where point_id='charge-a-01' and ended_at is null),'RECOVERY_STOPPED_ACTIVE_SESSION');
  r:=pg_temp.fleet_cmd('telemetry.parking','{"hubId":"hcmut","occupiedCount":1,"eventId":"parking-mismatch"}');
  perform app.need(r->>'status'='RECONCILIATION_REQUIRED',r::text);
  perform app.need(app.free_space('hcmut',(select demo_time from app.demo_state),true) is null,'MISMATCH_ADMITTED_VEHICLE');
  perform app.need(public.demo_view('operator','fleet.validate',d)#>>'{data,feasible}'='false','MISMATCH_TRANSFER_ALLOWED');
  perform pg_temp.fleet_cmd('demo.advance');
  r:=pg_temp.fleet_cmd('telemetry.parking','{"hubId":"hcmut","occupiedCount":0,"eventId":"parking-reconciled"}');
  perform app.need(r->>'status'='APPLIED',r::text);
  perform app.need(app.free_space('hcmut',(select demo_time from app.demo_state),true) is not null,'RECONCILED_CAPACITY_BLOCKED');
  perform app.restore_demo();
  perform app.need(not exists(select from app.fleet_observations) and not exists(select from app.fleet_event_results)
    and not exists(select from app.incident_history) and not exists(select from app.transfer_history),'RESET_LEFT_FLEET_DATA');
end $$;
rollback;
