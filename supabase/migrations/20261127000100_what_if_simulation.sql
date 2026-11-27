alter table app.what_if_scenarios
  drop constraint what_if_scenarios_kind_check,
  add constraint what_if_scenarios_kind_check check (kind in
    ('Charging surge','Vehicle surge','Parking surge','Parking full','Point fault','Hub outage','Vehicle concentration')),
  add column conditions jsonb,
  add column assumptions text not null default '' check (length(assumptions) <= 500);

-- Capture the selected Hub and the alternative Hub summaries under the command's
-- shared state lock. Copy only the fields needed to explain and run the model.
create function app.what_if_baseline(target_hub text) returns jsonb
language sql stable set search_path = '' as $$
  select to_jsonb(h) || jsonb_build_object(
    'modelVersion', 2,
    'chargingPoints', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'pointId', c.point_id, 'vehicleType', c.charging_vehicle_type,
        'operational', c.status='Operational' and not c.reconciliation_hold and not exists(
          select from app.resource_restrictions i where i.point_id=c.point_id and i.lifted_at is null),
        'available', app.point_available(c), 'commitment', r.status
      ) order by c.point_id), '[]'::jsonb)
      from app.charging_points c
      left join app.charging_allocations a on a.point_id=c.point_id and a.released_at is null
      left join app.charging_requests r using(request_id)
      where c.hub_id=h.id
    ),
    'fleetVehicles', (
      select count(*) from app.vehicles v where v.current_hub_id=h.id and v.kind='SHARED'
    ),
    'openIncidents', (
      select count(*) from app.incident_tickets i
      where i.status not in ('Resolved','Closed') and (
        i.vehicle_id in (select v.vehicle_id from app.vehicles v where v.current_hub_id=h.id)
        or i.point_id in (select c.point_id from app.charging_points c where c.hub_id=h.id))
    ),
    'alternatives', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'name', a.name, 'vehiclesFree', a.vehicles_free,
        'parkingFree', a.parking_free,
        'chargingFreeCars', (select count(*) from app.charging_points c where c.hub_id=a.id
          and c.charging_vehicle_type='CAR' and app.point_available(c)),
        'chargingFreeMotorcycles', (select count(*) from app.charging_points c where c.hub_id=a.id
          and c.charging_vehicle_type='MOTORCYCLE' and app.point_available(c))
      ) order by a.name), '[]'::jsonb)
      from app.hub_summary a where a.id<>h.id and a.status='Operational' and a.freshness='Live'
    )
  ) from app.hub_summary h where h.id=target_hub
$$;

create or replace function app.simulation_action(p app.profiles,op text,d jsonb,t app.demo_state)
returns jsonb language plpgsql set search_path = '' as $$
declare
  s app.what_if_scenarios; r app.simulation_runs; snap app.simulation_snapshots;
  model_conditions jsonb; condition jsonb; baseline jsonb; kind text; magnitude integer;
  horizon integer; notes text; recommendation text; position integer:=0;
  condition_kinds text[]:='{}';
begin
  perform app.need(p.role='operator','FORBIDDEN');
  if op='simulation.configure' then
    perform app.need(length(trim(coalesce(d->>'name',''))) between 1 and 90,'INVALID_SCENARIO_NAME');
    perform app.need(exists(select from app.hubs where id=d->>'hubId'),'SCENARIO_HUB_NOT_FOUND');
    horizon:=(d->>'horizonMinutes')::integer;
    perform app.need(horizon between 15 and 1440,'INVALID_SIMULATION_HORIZON');
    notes:=trim(coalesce(d->>'assumptions',''));
    perform app.need(length(notes)<=500,'INVALID_SIMULATION_ASSUMPTIONS');
    -- Keep accepting the original single-condition command while the old UI is cached.
    model_conditions:=coalesce(d->'conditions',jsonb_build_array(
      jsonb_build_object('kind',d->>'kind','magnitude',(d->>'magnitude')::integer)));
    perform app.need(jsonb_typeof(model_conditions)='array','INVALID_SIMULATION_CONDITIONS');
    perform app.need(jsonb_array_length(model_conditions) between 1 and 7,'INVALID_SIMULATION_CONDITIONS');
    for condition in select value from jsonb_array_elements(model_conditions) loop
      kind:=condition->>'kind';
      perform app.need(kind in ('Charging surge','Vehicle surge','Parking surge','Parking full',
        'Point fault','Hub outage','Vehicle concentration'),'INVALID_SIMULATION_CONDITIONS');
      perform app.need(not (kind=any(condition_kinds)),'DUPLICATE_SIMULATION_CONDITION');
      condition_kinds:=array_append(condition_kinds,kind);
      magnitude:=(condition->>'magnitude')::integer;
      perform app.need(magnitude between 1 and 500,'INVALID_SIMULATION_MAGNITUDE');
      if kind='Charging surge' then
        perform app.need(coalesce(condition->>'vehicleType','MOTORCYCLE') in ('MOTORCYCLE','CAR'),
          'INVALID_SIMULATION_VEHICLE_TYPE');
      end if;
      if kind='Point fault' then
        perform app.need(magnitude<=(select count(*) from app.charging_points where hub_id=d->>'hubId'),
          'TOO_MANY_SIMULATED_POINT_FAULTS');
      end if;
    end loop;
    insert into app.what_if_scenarios (scenario_id,name,hub_id,kind,magnitude,horizon_minutes,created_at,conditions,assumptions)
    values(app.new_id('scenario'),trim(d->>'name'),d->>'hubId',model_conditions->0->>'kind',
      (model_conditions->0->>'magnitude')::integer,horizon,t.demo_time,
      case when d ? 'conditions' then model_conditions end,notes) returning * into s;
    return to_jsonb(s);
  elsif op='simulation.start' then
    select * into s from app.what_if_scenarios where scenario_id=d->>'scenarioId';
    perform app.need(s.scenario_id is not null,'SCENARIO_NOT_FOUND');
    baseline:=app.what_if_baseline(s.hub_id);
    perform app.need(baseline is not null,'SIMULATION_BASELINE_UNAVAILABLE');
    insert into app.simulation_snapshots values(app.new_id('snapshot'),t.demo_time,t.revision,baseline)
      returning * into snap;
    insert into app.simulation_runs values(app.new_id('run'),s.scenario_id,snap.snapshot_id,p.user_id,
      clock_timestamp(),null,'Running',null) returning * into r;
    return jsonb_build_object('runId',r.run_id,'scenario',to_jsonb(s),'snapshot',to_jsonb(snap));
  elsif op in ('simulation.complete','simulation.fail') then
    select * into r from app.simulation_runs where run_id=d->>'runId' and operator_id=p.user_id;
    perform app.need(r.status='Running','SIMULATION_NOT_RUNNING');
    if op='simulation.complete' then
      select * into s from app.what_if_scenarios where scenario_id=r.scenario_id;
      if s.conditions is not null then
        perform app.need(d#>>'{metrics,modelVersion}'='2' and jsonb_typeof(d#>'{metrics,baseline}')='object'
          and jsonb_typeof(d#>'{metrics,projected}')='object','INVALID_SIMULATION_RESULT');
      end if;
      perform app.need(jsonb_typeof(d->'metrics')='object' and jsonb_typeof(d->'recommendations')='array',
        'INVALID_SIMULATION_RESULT');
      insert into app.simulation_results values(r.run_id,d->'metrics');
      for recommendation in select value from jsonb_array_elements_text(d->'recommendations') loop
        position:=position+1;
        insert into app.simulation_recommendations values(r.run_id,position,recommendation);
      end loop;
      update app.simulation_runs set status='Completed',finished_at=clock_timestamp() where run_id=r.run_id returning * into r;
    else
      update app.simulation_runs set status='Failed',error=left(coalesce(d->>'message','Simulation failed.'),280),
        finished_at=clock_timestamp() where run_id=r.run_id returning * into r;
    end if;
    return to_jsonb(r);
  end if;
  raise exception 'UNKNOWN_OPERATION';
end $$;

-- Simulation shares the lock, revision and retry receipts but never runs live
-- reconciliation. Keep this dispatch at both RPC entry points so Parking/Fleet
-- can continue to own their shared operational command implementation.
create function app.what_if_command(p app.profiles,op text,d jsonb,command_key uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare t app.demo_state; previous app.command_receipts; result jsonb;
begin
  perform app.need(p.user_id is not null,'AUTH_REQUIRED');
  perform app.need(p.role='operator','FORBIDDEN');
  perform app.need(command_key is not null and jsonb_typeof(d)='object','INVALID_COMMAND');
  select * into t from app.demo_state where singleton for update;
  perform app.need(t.singleton,'DEMO_NOT_INITIALIZED');
  select * into previous from app.command_receipts
    where actor_id=p.user_id and operation=op and command_id=command_key;
  if previous.command_id is not null then
    perform app.need(previous.input=d,'COMMAND_CONFLICT');
    return previous.result;
  end if;
  result:=jsonb_build_object('ok',true,'data',app.simulation_action(p,op,d,t));
  update app.demo_state set revision=revision+1 where singleton;
  insert into app.command_receipts values(p.user_id,op,command_key,d,result);
  return result;
exception when raise_exception then
  return jsonb_build_object('ok',false,'code',sqlerrm);
when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or foreign_key_violation then
  return jsonb_build_object('ok',false,'code','INVALID_INPUT');
end $$;

create or replace function public.app_command(p_operation text,p_input jsonb,p_command_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_operation like 'simulation.%' then
    return app.what_if_command(app.actor(),p_operation,p_input,p_command_id);
  end if;
  return app.command_for_profile(app.actor(),p_operation,p_input,p_command_id);
exception when raise_exception then
  return jsonb_build_object('ok',false,'code',sqlerrm);
end $$;

create or replace function public.demo_command(p_role text,p_operation text,p_input jsonb,p_command_id uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select case when p_operation like 'simulation.%'
    then app.what_if_command(app.demo_actor(p_role),p_operation,p_input,p_command_id)
    else app.command_for_profile(app.demo_actor(p_role),p_operation,p_input,p_command_id)
  end
$$;

revoke all on function app.what_if_baseline(text),app.what_if_command(app.profiles,text,jsonb,uuid)
  from public,anon,authenticated;
