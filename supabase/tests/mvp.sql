-- Run against a disposable PostgreSQL database with the Supabase Auth integration.
begin;
insert into auth.users (id,email) values
 ('00000000-0000-4000-8000-000000000001','mvp-student@example.com'),
 ('00000000-0000-4000-8000-000000000002','mvp-operator@example.com'),
 ('00000000-0000-4000-8000-000000000003','mvp-guest@example.com');
update app.profiles set auth_user_id=case user_id
  when 'demo-student' then '00000000-0000-4000-8000-000000000001'::uuid
  when 'demo-operator' then '00000000-0000-4000-8000-000000000002'::uuid
  when 'demo-guest' then '00000000-0000-4000-8000-000000000003'::uuid end;
select app.restore_demo();

do $$
declare student uuid:='00000000-0000-4000-8000-000000000001';
  operator uuid:='00000000-0000-4000-8000-000000000002';
  result jsonb; booking text; request text; reservation text; trip text; transfer text; ticket text;
  allocation text; sess text; scenario text; run text; args jsonb; receipt uuid; before_run jsonb;
begin
  perform app.need((select count(*)=60 from app.charging_points),'SEED_POINT_TOTAL');
  perform app.need(not exists(select 1 from app.charging_points group by hub_id
    having count(*) filter(where charging_vehicle_type='CAR')<>4 or count(*) filter(where charging_vehicle_type='MOTORCYCLE')<>8),'SEED_TYPE_TOTAL');
  perform app.need(not has_function_privilege('anon','public.app_command(text,jsonb,uuid)','execute'),'ANON_WRITE');
  perform set_config('request.jwt.claim.sub',student::text,true);

  result:=public.app_view('bootstrap');
  perform app.need(result#>>'{data,role}'='student',result::text);
  result:=public.app_view('parking');
  perform app.need(jsonb_array_length(result#>'{data,parkingReservations}')=0,result::text);
  result:=public.app_command('demo.advance','{}',gen_random_uuid());
  perform app.need(result->>'code'='FORBIDDEN',result::text);

  args:='{"hubId":"ktx-a","vehicleId":"private-student-car-01","arrivalTime":"2026-10-24T02:00:00Z","departureTime":"2026-10-24T03:00:00Z"}';
  result:=public.app_view('parking.review',args);
  perform app.need(result#>>'{data,available}'='true',result::text);
  receipt:=gen_random_uuid();
  result:=public.app_command('parking.reserve',args,receipt);
  booking:=result#>>'{data,reservationId}';
  perform app.need(booking is not null,result::text);
  perform app.need(public.app_command('parking.reserve',args,receipt)=result,'IDEMPOTENCE');
  perform app.need(public.app_command('parking.reserve',args||'{"hubId":"ktx-b"}',receipt)->>'code'='COMMAND_CONFLICT','RETRY_CONFLICT');
  args:=jsonb_build_object('reservationId',booking);
  result:=public.app_command('parking.checkIn',args,gen_random_uuid());
  perform app.need(result->>'ok'='true',result::text);
  result:=public.app_command('charging.submit',jsonb_build_object('vehicleId','private-student-car-01','hubId','ktx-a',
    'parkingReservationId',booking,'targetBatteryPercent',80,'requestedStart','2026-10-24T02:00:00Z','requestedEnd','2026-10-24T03:00:00Z'),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Scheduled',result::text);
  request:=result#>>'{data,requestId}'; allocation:=result#>>'{data,allocationId}';
  perform app.need(exists(select from app.charging_allocations join app.charging_points using(point_id)
    where allocation_id=allocation and charging_vehicle_type='CAR'),'CAR_COMPATIBILITY');

  perform set_config('request.jwt.claim.sub',operator::text,true);
  result:=public.app_view('network');
  perform app.need(result->>'ok'='true',result::text);
  result:=public.app_view('charging');
  perform app.need(result->>'ok'='true' and jsonb_array_length(result#>'{data,chargingPoints}')=60,result::text);
  args:=jsonb_build_object('requestId',request,'kind','START','eventId','demo-start','vehicleId','private-student-car-01',
    'pointId',(select point_id from app.charging_allocations where allocation_id=allocation));
  result:=public.app_command('charging.event',args,gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Charging',result::text);
  sess:=result#>>'{data,active_session_id}';
  perform set_config('request.jwt.claim.sub',student::text,true);
  result:=public.app_command('parking.checkOut',jsonb_build_object('reservationId',booking),gen_random_uuid());
  perform app.need(result->>'code'='STOP_CHARGING_FIRST',result::text);
  perform set_config('request.jwt.claim.sub',operator::text,true);
  result:=public.app_command('charging.event',args||jsonb_build_object(
    'kind','TARGET_REACHED','sessionId',sess,'eventId','demo-target','batteryPercent',80),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Completed',result::text);

  perform set_config('request.jwt.claim.sub',student::text,true);
  result:=public.app_command('parking.checkOut',jsonb_build_object('reservationId',booking),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Completed',result::text);
  result:=public.app_command('rental.reserve','{"vehicleId":"rental-a-01"}',gen_random_uuid());
  reservation:=result#>>'{data,reservationId}';
  perform app.need(reservation is not null,result::text);
  result:=public.app_command('rental.pickup',jsonb_build_object('reservationId',reservation),gen_random_uuid());
  trip:=result#>>'{data,tripId}';
  perform app.need(trip is not null,result::text);
  result:=public.app_command('rental.return',jsonb_build_object('tripId',trip,'hubId','ktx-a'),gen_random_uuid());
  perform app.need(result->>'ok'='true',result::text);

  perform set_config('request.jwt.claim.sub',operator::text,true);
  result:=public.app_command('fleet.create','{"sourceHubId":"ktx-a","destinationHubId":"hcmut","vehicleIds":["rental-a-01","rental-a-02"]}',gen_random_uuid());
  transfer:=result#>>'{data,orderId}';
  perform app.need(transfer is not null,result::text);
  result:=public.app_command('fleet.dispatch',jsonb_build_object('orderId',transfer),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Dispatched',result::text);
  result:=public.app_command('fleet.arrive',jsonb_build_object('orderId',transfer,'vehicleId','rental-a-01'),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Partial',result::text);
  result:=public.app_command('incident.report','{"pointId":"charge-a-03","description":"Test fault"}',gen_random_uuid());
  ticket:=result#>>'{data,incidentId}';
  perform app.need(ticket is not null,result::text);
  result:=public.app_command('incident.resolve',jsonb_build_object('incidentId',ticket,'verified',true),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Resolved',result::text);
  result:=public.app_command('telemetry.point','{"pointId":"charge-a-03","status":"Maintenance","eventId":"status-1"}',gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Maintenance',result::text);

  before_run:=(select jsonb_agg(to_jsonb(v) order by vehicle_id) from app.vehicles v);
  result:=public.app_command('simulation.configure','{"name":"Demand","kind":"Charging surge","hubId":"ktx-a","magnitude":12,"horizonMinutes":60}',gen_random_uuid());
  scenario:=result#>>'{data,scenario_id}';
  perform app.need(scenario is not null,result::text);
  result:=public.app_command('simulation.start',jsonb_build_object('scenarioId',scenario),gen_random_uuid());
  run:=result#>>'{data,runId}';
  perform app.need(run is not null,result::text);
  result:=public.app_command('simulation.complete',jsonb_build_object('runId',run,'metrics','{"unserved":4}'::jsonb,'recommendations',jsonb_build_array('Check capacity')),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Completed',result::text);
  perform app.need(before_run=(select jsonb_agg(to_jsonb(v) order by vehicle_id) from app.vehicles v),'SIMULATION_CHANGED_VEHICLES');

  result:=public.app_command('demo.advance','{}',gen_random_uuid());
  perform app.need(result->>'ok'='true',result::text);
  result:=public.app_command('demo.reset','{"confirm":true}',gen_random_uuid());
  perform app.need(result->>'ok'='true',result::text);
end $$;
rollback;
