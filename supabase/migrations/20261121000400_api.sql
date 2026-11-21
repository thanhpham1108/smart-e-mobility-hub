create view app.hub_summary as
select h.*,
  (select count(*) from app.vehicles v where v.current_hub_id=h.id and v.kind='SHARED' and v.status='AVAILABLE'
    and v.condition='OPERATIONAL' and not exists(select from app.charging_requests r where r.vehicle_id=v.vehicle_id and r.status in ('Waiting','Scheduled','Charging','Suspended'))) as vehicles_free,
  (select count(*) from app.parking_spaces s where s.hub_id=h.id and s.in_service) as parking_total,
  (select count(*) from app.parking_spaces s where s.hub_id=h.id and s.in_service
    and not exists(select from app.vehicles v where v.parking_space_id=s.space_id)
    and not exists(select from app.parking_sessions v where v.parking_space_id=s.space_id and v.status='Active')) as parking_free,
  (select count(*) from app.charging_points c where c.hub_id=h.id) as charging_total,
  (select count(*) from app.charging_points c where c.hub_id=h.id and app.point_available(c)) as charging_free,
  (select count(*) from app.charging_requests r where r.hub_id=h.id and r.status='Charging') as charging_active,
  (select count(*) from app.charging_requests r where r.hub_id=h.id and r.status='Waiting') as charging_waiting
from app.hubs h;

create function app.simulation_action(p app.profiles,op text,d jsonb,t app.demo_state)
returns jsonb language plpgsql set search_path = '' as $$
declare s app.what_if_scenarios; r app.simulation_runs; snap app.simulation_snapshots; m text; n integer:=0;
begin
  perform app.need(p.role='operator','FORBIDDEN');
  if op='simulation.configure' then
    perform app.need(nullif(trim(d->>'name'),'') is not null,'INVALID_SCENARIO');
    insert into app.what_if_scenarios values(app.new_id('scenario'),trim(d->>'name'),d->>'hubId',d->>'kind',
      (d->>'magnitude')::integer,(d->>'horizonMinutes')::integer,t.demo_time) returning * into s;
    return to_jsonb(s);
  elsif op='simulation.start' then
    select * into s from app.what_if_scenarios where scenario_id=d->>'scenarioId';
    perform app.need(s.scenario_id is not null,'SCENARIO_NOT_FOUND');
    insert into app.simulation_snapshots values(app.new_id('snapshot'),t.demo_time,t.revision,
      (select to_jsonb(h) from app.hub_summary h where h.id=s.hub_id)) returning * into snap;
    insert into app.simulation_runs values(app.new_id('run'),s.scenario_id,snap.snapshot_id,p.user_id,
      clock_timestamp(),null,'Running',null) returning * into r;
    return jsonb_build_object('runId',r.run_id,'scenario',to_jsonb(s),'snapshot',to_jsonb(snap));
  elsif op in ('simulation.complete','simulation.fail') then
    select * into r from app.simulation_runs where run_id=d->>'runId' and operator_id=p.user_id;
    perform app.need(r.status='Running','SIMULATION_NOT_RUNNING');
    if op='simulation.complete' then
      perform app.need(jsonb_typeof(d->'metrics')='object' and jsonb_typeof(d->'recommendations')='array','INVALID_SIMULATION_RESULT');
      insert into app.simulation_results values(r.run_id,d->'metrics');
      for m in select value from jsonb_array_elements_text(d->'recommendations')
      loop n:=n+1; insert into app.simulation_recommendations values(r.run_id,n,m); end loop;
      update app.simulation_runs set status='Completed',finished_at=clock_timestamp() where run_id=r.run_id returning * into r;
    else
      update app.simulation_runs set status='Failed',finished_at=clock_timestamp(),error=left(d->>'message',280)
        where run_id=r.run_id returning * into r;
    end if;
    return to_jsonb(r);
  end if;
  raise exception 'UNKNOWN_OPERATION';
end $$;

create function public.app_command(p_operation text,p_input jsonb,p_command_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p app.profiles; t app.demo_state; previous app.command_receipts; result jsonb; err text;
begin
  p:=app.actor();
  select * into t from app.demo_state where singleton for update;
  perform app.need(t.singleton,'DEMO_NOT_INITIALIZED');
  perform app.need(p_command_id is not null and coalesce(jsonb_typeof(p_input),'null')='object','INVALID_COMMAND');
  select * into previous from app.command_receipts where actor_id=p.user_id and operation=p_operation and command_id=p_command_id;
  if previous.command_id is not null then
    perform app.need(previous.input=p_input,'COMMAND_CONFLICT');
    return previous.result;
  end if;

  if p_operation='demo.advance' then
    perform app.need(p.role='operator','FORBIDDEN');
    t.demo_time:=t.demo_time+interval '15 minutes';
    update app.demo_state set demo_time=t.demo_time where singleton;
    perform app.reconcile(t.demo_time);
    result:=jsonb_build_object('demoTime',t.demo_time);
  elsif p_operation='demo.reset' then
    perform app.need(p.role='operator','FORBIDDEN');
    perform app.need(p_input->>'confirm'='true','CONFIRM_RESET');
    perform app.restore_demo();
    result:='{}'::jsonb;
  else
    perform app.reconcile(t.demo_time);
    if p_operation='identity.profile' then
      perform app.need(length(coalesce(p_input->>'email',''))<=160 and length(coalesce(p_input->>'phone',''))<=32,'INVALID_PROFILE');
      update app.profiles set email=nullif(trim(p_input->>'email'),''), phone=nullif(trim(p_input->>'phone'),'')
        where user_id=p.user_id returning * into p;
      result:=jsonb_build_object('email',p.email,'phone',p.phone);
    elsif p_operation like 'charging.%' then
      result:=app.charging_action(p,p_operation,p_input,t.demo_time);
    elsif p_operation like 'parking.%' or p_operation like 'rental.%' then
      result:=app.mobility_action(p,p_operation,p_input,t.demo_time);
    elsif p_operation like 'fleet.%' or p_operation like 'incident.%' or p_operation like 'telemetry.%' then
      result:=app.fleet_action(p,p_operation,p_input,t.demo_time);
    elsif p_operation like 'simulation.%' then
      result:=app.simulation_action(p,p_operation,p_input,t);
    else raise exception 'UNKNOWN_OPERATION';
    end if;
  end if;
  update app.demo_state set revision=revision+1 where singleton;
  result:=jsonb_build_object('ok',true,'data',result);
  insert into app.command_receipts values(p.user_id,p_operation,p_command_id,p_input,result);
  return result;
exception
  when raise_exception then
    get stacked diagnostics err=message_text;
    return jsonb_build_object('ok',false,'code',err);
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or not_null_violation or check_violation or foreign_key_violation then
    return jsonb_build_object('ok',false,'code','INVALID_INPUT');
  when unique_violation or exclusion_violation then
    return jsonb_build_object('ok',false,'code','RESOURCE_CONFLICT');
end $$;

create function app.charging_view(p_student text default null,p_hub text default null)
returns jsonb language sql stable set search_path = '' as $$
  with queue as (
    select request_id,row_number() over(partition by hub_id order by accepted_at,current_battery_percent,request_id) as queue_position
      from app.charging_requests where status='Waiting'
  ), requests as (
    select r.*,q.queue_position,
      (r.status='Waiting' and r.requested_start<=d.demo_time) as full
    from app.charging_requests r left join queue q using(request_id) cross join app.demo_state d
      where (p_student is null or r.student_id=p_student) and (p_hub is null or r.hub_id=p_hub)
  )
  select jsonb_build_object(
    'chargingRequests', app.list_json((select jsonb_agg(to_jsonb(r) order by accepted_at,current_battery_percent,request_id) from requests r)),
    'chargingAllocations', app.list_json((select jsonb_agg(to_jsonb(a)) from app.charging_allocations a join requests r using(request_id) where released_at is null)),
    'chargingSessions', app.list_json((select jsonb_agg(to_jsonb(s)) from app.charging_sessions s join requests r using(request_id))),
    'chargingSchedules', app.list_json((select jsonb_agg(to_jsonb(s)) from app.charging_schedules s where p_student is null and (p_hub is null or s.hub_id=p_hub))),
    'chargingPoints', app.list_json((select jsonb_agg(to_jsonb(c)||jsonb_build_object('activeRestrictionIds',coalesce((
      select jsonb_agg(incident_id) from app.resource_restrictions where point_id=c.point_id and lifted_at is null),'[]'::jsonb)) order by c.point_id)
      from app.charging_points c where (p_hub is null or c.hub_id=p_hub)
        and (p_student is null or exists(select from app.charging_allocations a join requests r using(request_id) where a.point_id=c.point_id and a.released_at is null))))
  )
$$;

create function public.app_view(p_view text,p_filter jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p app.profiles; t app.demo_state; data jsonb; h text:=p_filter->>'hubId'; err text;
begin
  p:=app.actor();
  select * into t from app.demo_state where singleton;
  perform app.need(t.singleton,'DEMO_NOT_INITIALIZED');
  if p_view='bootstrap' then
    data:=jsonb_build_object('userId',p.user_id,'role',p.role,'name',p.name,'email',p.email,'phone',p.phone);
  elsif p_view='hubs' or p_view='network' then
    if p_view='network' then perform app.need(p.role='operator','FORBIDDEN'); end if;
    data:=jsonb_build_object('hubs',app.list_json((select jsonb_agg(to_jsonb(s) order by id) from app.hub_summary s)));
  elsif p_view='charging' then
    perform app.need(p.role='operator','FORBIDDEN');
    data:=app.charging_view(null,h)||jsonb_build_object('hubs',app.list_json((select jsonb_agg(to_jsonb(s) order by case id when 'ktx-a' then 0 else 1 end,id) from app.hubs s)));
  elsif p_view='parking' then
    perform app.need(p.role='student','FORBIDDEN');
    data:=app.charging_view(p.user_id)||jsonb_build_object(
      'hubs',app.list_json((select jsonb_agg(to_jsonb(s) order by id) from app.hub_summary s)),
      'privateVehicles',app.list_json((select jsonb_agg(to_jsonb(v) order by name) from app.vehicles v where student_id=p.user_id and kind='PRIVATE')),
      'parkingReservations',app.list_json((select jsonb_agg(to_jsonb(b) order by arrival_time desc) from app.parking_reservations b where student_id=p.user_id)),
      'parkingSessions',app.list_json((select jsonb_agg(to_jsonb(s)) from app.parking_sessions s join app.parking_reservations b using(reservation_id) where b.student_id=p.user_id)),
      'notifications',app.list_json((select jsonb_agg(to_jsonb(n) order by created_at desc) from app.notifications n where user_id=p.user_id)));
  elsif p_view='parking.review' then
    data:=app.parking_review(p,h,p_filter->>'vehicleId',(p_filter->>'arrivalTime')::timestamptz,
      (p_filter->>'departureTime')::timestamptz,t.demo_time);
  elsif p_view='rental' then
    perform app.need(p.role='student','FORBIDDEN');
    data:=jsonb_build_object(
      'hubs',app.list_json((select jsonb_agg(to_jsonb(s) order by id) from app.hub_summary s)),
      'vehicles',app.list_json((select jsonb_agg(to_jsonb(v)||jsonb_build_object('chargingCommitted',exists(
        select from app.charging_requests c where c.vehicle_id=v.vehicle_id and c.status in ('Waiting','Scheduled','Charging','Suspended'))) order by v.name)
        from app.vehicles v where v.kind='SHARED')),
      'reservations',app.list_json((select jsonb_agg(to_jsonb(r) order by created_at desc) from app.rental_reservations r where student_id=p.user_id)),
      'trips',app.list_json((select jsonb_agg(to_jsonb(r) order by start_time desc) from app.rental_trips r where student_id=p.user_id)));
  elsif p_view='fleet' or p_view='incidents' then
    perform app.need(p.role='operator','FORBIDDEN');
    data:=jsonb_build_object(
      'hubs',app.list_json((select jsonb_agg(to_jsonb(s) order by id) from app.hub_summary s)),
      'vehicles',app.list_json((select jsonb_agg(to_jsonb(v) order by name) from app.vehicles v where v.kind='SHARED')),
      'points',app.list_json((select jsonb_agg(to_jsonb(c) order by point_id) from app.charging_points c)),
      'orders',app.list_json((select jsonb_agg(to_jsonb(o)||jsonb_build_object('vehicles',
        app.list_json((select jsonb_agg(to_jsonb(v) order by vehicle_id) from app.redistribution_order_vehicles v where v.order_id=o.order_id))) order by created_at desc) from app.redistribution_orders o)),
      'incidents',app.list_json((select jsonb_agg(to_jsonb(i) order by created_at desc) from app.incident_tickets i)));
  elsif p_view='simulation' then
    perform app.need(p.role='operator','FORBIDDEN');
    data:=jsonb_build_object(
      'hubs',app.list_json((select jsonb_agg(to_jsonb(s) order by id) from app.hub_summary s)),
      'scenarios',app.list_json((select jsonb_agg(to_jsonb(s) order by created_at desc) from app.what_if_scenarios s)),
      'runs',app.list_json((select jsonb_agg(to_jsonb(r)||jsonb_build_object('metrics',m.metrics,'baseline',s.baseline,
        'capturedAt',s.captured_at,'sourceRevision',s.source_revision,'recommendations',
        app.list_json((select jsonb_agg(i.message order by i.position) from app.simulation_recommendations i where i.run_id=r.run_id))) order by r.created_at desc)
        from app.simulation_runs r join app.simulation_snapshots s using(snapshot_id) left join app.simulation_results m using(run_id))));
  else raise exception 'UNKNOWN_VIEW';
  end if;
  return jsonb_build_object('ok',true,'data',data||jsonb_build_object('revision',t.revision,'demoTime',t.demo_time));
exception
  when raise_exception then
    get stacked diagnostics err=message_text;
    return jsonb_build_object('ok',false,'code',err);
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    return jsonb_build_object('ok',false,'code','INVALID_INPUT');
end $$;

revoke all on function public.app_view(text,jsonb),public.app_command(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.app_view(text,jsonb),public.app_command(text,jsonb,uuid) to authenticated;
