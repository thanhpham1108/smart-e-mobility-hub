-- Member 4: Fleet & Incident. Additive migration; keep the shared RPC envelope.
alter table app.redistribution_orders
  add column version integer not null default 1,
  add column resume_status text,
  add column risk_reason text;
-- Preserve the physical stage of orders created by the previous implementation.
update app.redistribution_orders o set resume_status=case
  when exists(select from app.redistribution_order_vehicles ov where ov.order_id=o.order_id and ov.arrived_at is not null) then 'Partial'
  when exists(select from app.redistribution_order_vehicles ov join app.vehicles v using(vehicle_id)
    where ov.order_id=o.order_id and v.parking_space_id is null) then 'Dispatched'
  else 'Planned' end,
  risk_reason='Existing at-risk transfer. Inspect resources and revalidate before continuing.' where status='AtRisk';
alter table app.incident_tickets
  add column version integer not null default 1,
  add column fault_key text not null default 'reported-fault',
  add column severity text not null default 'Medium' check (severity in ('Low','Medium','High')),
  add column assignee text,
  add column repair_note text,
  add column repaired_at timestamptz;
alter table app.incident_tickets drop constraint incident_tickets_status_check;
alter table app.incident_tickets add constraint incident_tickets_status_check
  check (status in ('Open','Investigating','ActionAssigned','InRepair','Resolved','Closed'));

create table app.fleet_policy (
  singleton boolean primary key default true check(singleton),
  stale_minutes integer not null check(stale_minutes > 0),
  low_vehicle_threshold integer not null check(low_vehicle_threshold >= 0),
  capacity_warning_percent integer not null check(capacity_warning_percent between 1 and 100)
);
insert into app.fleet_policy values(true,15,2,85);
create table app.fleet_observations (
  resource_type text not null check(resource_type in ('vehicle','point','parking')),
  resource_id text not null,
  hub_id text references app.hubs on delete cascade,
  observed_at timestamptz not null,
  payload jsonb not null,
  discrepancy text,
  primary key(resource_type,resource_id)
);
create table app.incident_history (
  history_id uuid primary key default gen_random_uuid(),
  sequence_no bigint generated always as identity,
  incident_id text not null references app.incident_tickets on delete cascade,
  actor_id text not null references app.profiles,
  action text not null, note text not null, created_at timestamptz not null
);
create table app.transfer_history (
  history_id uuid primary key default gen_random_uuid(),
  sequence_no bigint generated always as identity,
  order_id text not null references app.redistribution_orders on delete cascade,
  actor_id text not null references app.profiles,
  action text not null, note text not null, created_at timestamptz not null
);
create table app.fleet_event_results (
  event_id text primary key references app.telemetry_events on delete cascade,
  result jsonb not null
);

-- Resource-owner integration boundaries. Fleet coordinates these in the shared transaction.
create function app.rental_incident_restriction(p_ticket text,p_active boolean,t timestamptz)
returns void language plpgsql set search_path='' as $$
declare v text;
begin
  select vehicle_id into v from app.incident_tickets where incident_id=p_ticket;
  update app.resource_restrictions set lifted_at=case when p_active then null else t end where incident_id=p_ticket;
  if v is not null then
    update app.vehicles set condition=case when exists(select from app.resource_restrictions where vehicle_id=v and lifted_at is null) then 'FAULTED' else 'OPERATIONAL' end,
      status=case
        when exists(select from app.resource_restrictions where vehicle_id=v and lifted_at is null) and status='AVAILABLE' then 'UNDER_MAINTENANCE'
        when not exists(select from app.resource_restrictions where vehicle_id=v and lifted_at is null) and status='UNDER_MAINTENANCE'
          then case when exists(select from app.rental_reservations where vehicle_id=v and status='CONFIRMED') then 'RESERVED'
            when exists(select from app.redistribution_order_vehicles ov join app.redistribution_orders o using(order_id)
              where ov.vehicle_id=v and ov.arrived_at is null and o.status not in ('Completed','Cancelled')) then 'REDISTRIBUTING'
            else 'AVAILABLE' end
        else status end,last_updated=t where vehicle_id=v;
  end if;
end $$;


create function app.charging_incident_restriction(p_ticket text,p_active boolean,t timestamptz)
returns void language plpgsql set search_path='' as $$
begin
  update app.resource_restrictions set lifted_at=case when p_active then null else t end where incident_id=p_ticket;
  -- Actual sessions/allocations and physical point condition remain owned by Charging.
  perform app.promote(t);
end $$;

create function app.fleet_flag_vehicle(v text,reason text) returns void language sql set search_path='' as $$
  update app.redistribution_orders o set resume_status=case when status='AtRisk' then resume_status else status end,
    status='AtRisk',risk_reason=reason,version=version+1
    where status not in ('Completed','Cancelled') and exists(select from app.redistribution_order_vehicles x
      where x.order_id=o.order_id and x.vehicle_id=v and x.arrived_at is null)
$$;

-- A sensor mismatch is evidence, never a synthetic check-in or checkout.
create function app.parking_observe(h text,observed integer,seen timestamptz) returns jsonb
language plpgsql set search_path='' as $$
declare expected integer; capacity integer; reason text;
begin
  select parking_total,parking_total-parking_free into capacity,expected from app.hub_summary where id=h;
  perform app.need(capacity is not null and observed between 0 and capacity,'INVALID_OCCUPANCY');
  reason:=case when observed<>expected then 'Observed '||observed||' occupied; ledger records '||expected||'. Verify vehicles before reopening capacity.' end;
  insert into app.fleet_observations values('parking',h,h,seen,jsonb_build_object('occupiedCount',observed,'expectedCount',expected),reason)
    on conflict(resource_type,resource_id) do update set observed_at=excluded.observed_at,payload=excluded.payload,discrepancy=excluded.discrepancy;
  return jsonb_build_object('status',case when reason is null then 'APPLIED' else 'RECONCILIATION_REQUIRED' end,'message',coalesce(reason,'Occupancy matches the parking ledger.'));
end $$;
alter function app.free_space(text,timestamptz,boolean) rename to free_space_before_fleet;
create function app.free_space(p_hub text,p_now timestamptz,p_keep boolean default false) returns text
language sql stable set search_path='' as $$
  select app.free_space_before_fleet(p_hub,p_now,p_keep)
  where not exists(select from app.fleet_observations where resource_type='parking' and resource_id=p_hub and discrepancy is not null)
$$;
alter function app.parking_review(app.profiles,text,text,timestamptz,timestamptz,timestamptz) rename to parking_review_before_fleet;
create function app.parking_review(p app.profiles,p_hub text,p_vehicle text,p_start timestamptz,p_end timestamptz,p_now timestamptz)
returns jsonb language plpgsql stable set search_path='' as $$
begin
  perform app.need(not exists(select from app.fleet_observations where resource_type='parking' and resource_id=p_hub and discrepancy is not null),'PARKING_RECONCILIATION_REQUIRED');
  return app.parking_review_before_fleet(p,p_hub,p_vehicle,p_start,p_end,p_now);
end $$;

create function app.fleet_parking_fresh(h text,t timestamptz) returns boolean language sql stable set search_path='' as $$
  select coalesce((select observed_at from app.fleet_observations where resource_type='parking' and resource_id=h),
    (select min(status_observed_at) from app.charging_points where hub_id=h)) > t-make_interval(mins=>(select stale_minutes from app.fleet_policy))
$$;

create function app.fleet_proposal(d jsonb,t timestamptz) returns jsonb language plpgsql stable set search_path='' as $$
declare src text:=d->>'sourceHubId'; dst text:=d->>'destinationHubId'; ids jsonb:=d->'vehicleIds';
  reasons jsonb:='[]'; v text; available integer; held integer; token text;
begin
  perform app.need(jsonb_typeof(ids)='array' and jsonb_array_length(ids) between 1 and 10,'SELECT_VEHICLES');
  perform app.need((select count(*)=count(distinct value) from jsonb_array_elements_text(ids)),'DUPLICATE_VEHICLE');
  if src=dst or not exists(select from app.hubs where id=src and status='Operational')
    or not exists(select from app.hubs where id=dst and status='Operational') then
    reasons:=reasons||jsonb_build_array('Select two different operational Hubs.');
  end if;
  for v in select value from jsonb_array_elements_text(ids) loop
    if not exists(select from app.vehicles x where x.vehicle_id=v and x.kind='SHARED' and x.current_hub_id=src
      and x.status='AVAILABLE' and x.condition='OPERATIONAL' and not exists(select from app.charging_requests c
        where c.vehicle_id=v and c.status in ('Waiting','Scheduled','Charging','Suspended'))) then
      reasons:=reasons||jsonb_build_array(v||' is unavailable or committed to another operation.');
    end if;
    if exists(select from app.vehicles where vehicle_id=v and last_updated<=t-make_interval(mins=>(select stale_minutes from app.fleet_policy))) then
      reasons:=reasons||jsonb_build_array(v||' has stale observations. Verify it with a fresh vehicle observation.');
    end if;
  end loop;
  if not coalesce(app.fleet_parking_fresh(dst,t),false) then
    reasons:=reasons||jsonb_build_array('Destination observations are stale or unavailable. Verify its current parking occupancy.');
  end if;
  select parking_free into available from app.hub_summary where id=dst;
  select coalesce(max(n),0) into held from (select count(*) as n from app.parking_reservation_slots s
    join app.parking_reservations b using(reservation_id) where b.hub_id=dst and b.status='Confirmed'
      and b.expires_at>t and s.slot_start+interval '15 minutes'>t group by s.slot_start) counts;
  available:=greatest(0,coalesce(available,0)-held);
  if exists(select from app.fleet_observations where resource_type='parking' and resource_id=dst and discrepancy is not null) then
    available:=0; reasons:=reasons||jsonb_build_array('Destination occupancy needs reconciliation.');
  end if;
  if available<jsonb_array_length(ids) or app.free_space(dst,t,true) is null then
    reasons:=reasons||jsonb_build_array('Destination cannot accommodate all selected vehicles and existing parking commitments.');
  end if;
  token:=md5(jsonb_build_object('source',src,'destination',dst,'ids',ids,'capacity',available,
    'vehicles',(select jsonb_agg(to_jsonb(x) order by vehicle_id) from app.vehicles x where vehicle_id in(select value from jsonb_array_elements_text(ids))))::text);
  return jsonb_build_object('feasible',jsonb_array_length(reasons)=0,'reasons',reasons,'availableCapacity',available,
    'vehicleCount',jsonb_array_length(ids),'validationToken',token,'reviewedAt',t);
end $$;

create function app.incident_action(p app.profiles,op text,d jsonb,t timestamptz) returns jsonb
language plpgsql set search_path='' as $$
declare i app.incident_tickets; vid text:=d->>'vehicleId'; pid text:=d->>'pointId';
  note text:=trim(d->>'note'); fault text:=coalesce(nullif(trim(d->>'faultKey'),''),'reported-fault'); next_status text;
begin
  if op='incident.report' then
    perform app.need(num_nonnulls(vid,pid)=1 and length(trim(d->>'description')) between 1 and 1000,'INVALID_INCIDENT');
    if p.role='student' then
      perform app.need(pid is null and exists(select from app.rental_trips where vehicle_id=vid and student_id=p.user_id and status='ACTIVE'),'FORBIDDEN');
    else perform app.need(p.role='operator','FORBIDDEN'); end if;
    perform app.need(length(fault)<=80,'INVALID_FAULT_KEY');
    select * into i from app.incident_tickets where vehicle_id is not distinct from vid and point_id is not distinct from pid
      and fault_key=fault and status<>'Closed' order by created_at limit 1;
    if i.incident_id is null then
      insert into app.incident_tickets(incident_id,reporter_id,vehicle_id,point_id,description,status,created_at,fault_key,severity)
        values(app.new_id('incident'),p.user_id,vid,pid,trim(d->>'description'),'Open',t,fault,coalesce(d->>'severity','Medium')) returning * into i;
      insert into app.resource_restrictions values(i.incident_id,vid,pid,null);
    else
      update app.incident_tickets set status=case when status='Resolved' then 'Investigating' else status end,
        version=version+1,repair_note=null,repaired_at=null,resolved_at=null where incident_id=i.incident_id returning * into i;
    end if;
    insert into app.incident_history(incident_id,actor_id,action,note,created_at) values(i.incident_id,p.user_id,'Evidence',trim(d->>'description'),t);
    if vid is not null then
      perform app.rental_incident_restriction(i.incident_id,true,t);
      perform app.fleet_flag_vehicle(vid,'Incident on '||vid||': '||i.description);
      insert into app.transfer_history(order_id,actor_id,action,note,created_at)
        select o.order_id,p.user_id,'AtRisk','Incident restriction: '||i.incident_id,t
        from app.redistribution_orders o join app.redistribution_order_vehicles ov using(order_id)
        where ov.vehicle_id=vid and ov.arrived_at is null and o.status='AtRisk';
    else perform app.charging_incident_restriction(i.incident_id,true,t); end if;
    return to_jsonb(i)||jsonb_build_object('incidentId',i.incident_id);
  end if;
  perform app.need(p.role='operator','FORBIDDEN');
  select * into i from app.incident_tickets where incident_id=d->>'incidentId';
  perform app.need(i.incident_id is not null,'INCIDENT_NOT_FOUND');
  perform app.need(i.version=(d->>'expectedVersion')::integer,'STALE_INCIDENT');
  if op='incident.investigate' then
    perform app.need(i.status='Open','INVALID_INCIDENT_TRANSITION'); next_status:='Investigating';
    note:=coalesce(nullif(note,''),'Investigation accepted.');
  elsif op='incident.plan' then
    perform app.need(i.status='Investigating' and length(trim(d->>'assignee')) between 1 and 100 and length(note) between 1 and 1000,'REPAIR_PLAN_REQUIRED');
    next_status:='ActionAssigned';
    update app.incident_tickets set assignee=trim(d->>'assignee') where incident_id=i.incident_id;
  elsif op='incident.repair' then
    perform app.need(i.status in ('ActionAssigned','InRepair') and length(note) between 1 and 1000,'REPAIR_EVIDENCE_REQUIRED');
    next_status:='InRepair';
    update app.incident_tickets set repair_note=case when d->>'complete'='true' then note else null end,
      repaired_at=case when d->>'complete'='true' then t else null end where incident_id=i.incident_id;
  elsif op='incident.resolve' then
    perform app.need(i.status='InRepair' and i.repaired_at is not null and d->>'verified'='true','RECOVERY_NOT_VERIFIED');
    if i.point_id is not null then
      perform app.need(exists(select from app.charging_points where point_id=i.point_id and status='Operational' and not reconciliation_hold
        and status_observed_at>t-make_interval(mins=>(select stale_minutes from app.fleet_policy))),'POINT_NOT_RECOVERED');
      perform app.charging_incident_restriction(i.incident_id,false,t);
    else perform app.rental_incident_restriction(i.incident_id,false,t); end if;
    next_status:='Resolved'; note:='Recovery verified. Only this incident restriction was lifted.';
  elsif op='incident.close' then
    perform app.need(i.status='Resolved','INVALID_INCIDENT_TRANSITION'); next_status:='Closed'; note:='Incident closed; history retained.';
  else raise exception 'UNKNOWN_OPERATION'; end if;
  update app.incident_tickets set status=next_status,version=version+1,
    resolved_at=case when next_status='Resolved' then t else resolved_at end where incident_id=i.incident_id returning * into i;
  insert into app.incident_history(incident_id,actor_id,action,note,created_at) values(i.incident_id,p.user_id,next_status,note,t);
  return to_jsonb(i);
end $$;

-- Existing callers still use fleet.*, incident.* and telemetry.* through app_command.
create function app.parking_return_transfer(v_id text,h text,t timestamptz) returns void
language plpgsql set search_path='' as $$
declare v app.vehicles; space text;
begin
  select * into v from app.vehicles where vehicle_id=v_id;
  perform app.need(v.status='REDISTRIBUTING','VEHICLE_UNAVAILABLE');
  perform app.need(v.parking_space_id is null or v.current_hub_id=h,'DISPOSITION_CONFLICT');
  space:=coalesce(v.parking_space_id,app.free_space(h,t,true));
  perform app.need(space is not null,'SOURCE_PARKING_FULL');
  update app.vehicles set current_hub_id=h,parking_space_id=space,last_updated=t,
    status=case when condition='OPERATIONAL' then 'AVAILABLE' else 'UNDER_MAINTENANCE' end where vehicle_id=v_id;
end $$;

alter function app.fleet_action(app.profiles,text,jsonb,timestamptz) rename to fleet_action_before_final;
create function app.fleet_action(p app.profiles,op text,d jsonb,t timestamptz) returns jsonb
language plpgsql set search_path='' as $$
declare o app.redistribution_orders; proposal jsonb; result jsonb; ids jsonb; vid text; sid text;
  eid text:=d->>'eventId'; resource text; typ text; seen timestamptz; previous app.telemetry_events;
  current_observation app.fleet_observations; condition text; discrepancy text; observed_hub text;
begin
  if op like 'incident.%' then return app.incident_action(p,op,d,t); end if;
  perform app.need(p.role='operator','FORBIDDEN');
  if op='fleet.create' then
    proposal:=app.fleet_proposal(d,t);
    perform app.need((proposal->>'feasible')::boolean,'TRANSFER_NOT_FEASIBLE');
    perform app.need(d->>'validationToken'=proposal->>'validationToken','STALE_TRANSFER_REVIEW');
    result:=app.fleet_action_before_final(p,op,d,t);
    insert into app.transfer_history(order_id,actor_id,action,note,created_at)
      values(result->>'orderId',p.user_id,'Planned','Vehicles committed. Destination capacity is not reserved.',t);
    return result;
  elsif op like 'fleet.%' then
    select * into o from app.redistribution_orders where order_id=d->>'orderId';
    perform app.need(o.order_id is not null,'ORDER_NOT_FOUND');
    perform app.need(o.version=(d->>'expectedVersion')::integer,'STALE_ORDER');
    if op='fleet.revalidate' then
      perform app.need(o.status='AtRisk','INVALID_TRANSFER_TRANSITION');
      perform app.need(exists(select from app.hubs where id=o.destination_hub_id and status='Operational')
        and app.fleet_parking_fresh(o.destination_hub_id,t) and app.free_space(o.destination_hub_id,t,true) is not null,'DESTINATION_UNAVAILABLE');
      perform app.need(not exists(select from app.redistribution_order_vehicles ov join app.vehicles v using(vehicle_id)
        where ov.order_id=o.order_id and ov.arrived_at is null and (v.condition<>'OPERATIONAL' or v.status<>'REDISTRIBUTING'
          or v.last_updated<=t-make_interval(mins=>(select stale_minutes from app.fleet_policy)))),'VEHICLE_UNAVAILABLE');
      update app.redistribution_orders set status=coalesce(resume_status,'Planned'),resume_status=null,risk_reason=null where order_id=o.order_id;
    elsif op='fleet.arrive' then
      perform app.need(o.status in ('Dispatched','Partial'),'REVALIDATE_ORDER_FIRST');
      perform app.need(exists(select from app.hubs where id=o.destination_hub_id and status='Operational'),'HUB_UNAVAILABLE');
      ids:=coalesce(d->'vehicleIds',jsonb_build_array(d->>'vehicleId'));
      perform app.need(jsonb_typeof(ids)='array' and jsonb_array_length(ids)>0
        and (select count(*)=count(distinct value) from jsonb_array_elements_text(ids)),'INVALID_ARRIVAL');
      begin
      for vid in select value from jsonb_array_elements_text(ids) loop
        perform app.need(exists(select from app.redistribution_order_vehicles ov join app.vehicles v using(vehicle_id)
          where ov.order_id=o.order_id and ov.vehicle_id=vid and ov.arrived_at is null
            and v.condition='OPERATIONAL' and v.status='REDISTRIBUTING'),'INVALID_ARRIVAL');
        result:=app.fleet_action_before_final(p,op,jsonb_build_object('orderId',o.order_id,'vehicleId',vid),t);
        perform app.need(result->>'status'<>'AtRisk','PARKING_FULL');
      end loop;
      exception when raise_exception then
        if sqlerrm<>'PARKING_FULL' then raise; end if;
        -- Roll back the entire selected batch, then retain the risk for the operator.
        update app.redistribution_orders set status='AtRisk',resume_status=o.status,
          risk_reason='Destination capacity changed. No selected vehicles were moved. Verify capacity and revalidate.' where order_id=o.order_id;
      end;
    elsif op='fleet.cancel' then
      perform app.need(o.status in ('Planned','AtRisk'),'TRANSFER_ALREADY_DISPATCHED');
      if o.status='AtRisk' and o.resume_status<>'Planned' then
        perform app.need(d->>'sourceDispositionVerified'='true' and length(trim(d->>'note')) between 1 and 1000,'DISPOSITION_REQUIRED');
        perform app.need(exists(select from app.hubs where id=o.source_hub_id and status='Operational'),'HUB_UNAVAILABLE');
      else
        perform app.need(not exists(select from app.redistribution_order_vehicles ov join app.vehicles v using(vehicle_id)
          where ov.order_id=o.order_id and ov.arrived_at is null and (v.parking_space_id is null or v.current_hub_id<>o.source_hub_id)),'DISPOSITION_REQUIRED');
      end if;
      -- Explicitly verified source disposition; arrived vehicles are never touched.
      -- All outstanding returns and cancellation succeed together or roll back.
      for vid in select vehicle_id from app.redistribution_order_vehicles where order_id=o.order_id and arrived_at is null loop
        perform app.parking_return_transfer(vid,o.source_hub_id,t);
      end loop;
      update app.redistribution_orders set status='Cancelled',risk_reason=null,resume_status=null where order_id=o.order_id;
    elsif op='fleet.dispatch' then
      perform app.need(exists(select from app.hubs where id=o.source_hub_id and status='Operational')
        and exists(select from app.hubs where id=o.destination_hub_id and status='Operational'),'HUB_UNAVAILABLE');
      result:=app.fleet_action_before_final(p,op,d,t);
    else raise exception 'UNKNOWN_OPERATION'; end if;
    update app.redistribution_orders set version=version+1 where order_id=o.order_id returning * into o;
    insert into app.transfer_history(order_id,actor_id,action,note,created_at)
      values(o.order_id,p.user_id,o.status,case when ids is not null then 'Confirmed arrivals: '||ids::text
        when op='fleet.cancel' and d->>'sourceDispositionVerified'='true' then 'Outstanding vehicles verified at source: '||trim(d->>'note') else op end,t);
    return to_jsonb(o)||case when o.status='AtRisk' then jsonb_build_object('message',o.risk_reason) else '{}'::jsonb end;
  elsif op like 'telemetry.%' then
    typ:=case op when 'telemetry.vehicle' then 'vehicle' when 'telemetry.point' then 'point' when 'telemetry.parking' then 'parking' end;
    perform app.need(typ is not null,'UNKNOWN_OPERATION');
    resource:=case typ when 'vehicle' then d->>'vehicleId' when 'point' then d->>'pointId' else d->>'hubId' end;
    perform app.need(length(eid) between 1 and 100 and resource is not null,'INVALID_EVENT');
    select * into previous from app.telemetry_events where event_id=eid;
    if previous.event_id is not null then
      perform app.need(previous.payload=d and previous.kind=op,'EVENT_CONFLICT');
      select r.result into result from app.fleet_event_results r where r.event_id=eid;
      perform app.need(result is not null,'EVENT_CONFLICT');
      return result||jsonb_build_object('duplicate',true);
    end if;
    seen:=coalesce((d->>'observedAt')::timestamptz,t);
    perform app.need(seen<=t and seen>t-make_interval(mins=>(select stale_minutes from app.fleet_policy)),'STALE_OBSERVATION');
    select * into current_observation from app.fleet_observations where resource_type=typ and resource_id=resource;
    perform app.need(current_observation.resource_id is null or seen>current_observation.observed_at,'STALE_OBSERVATION');
    if typ='parking' then
      result:=app.parking_observe(resource,(d->>'occupiedCount')::integer,seen);
    elsif typ='vehicle' then
      perform app.need(exists(select from app.vehicles where vehicle_id=resource and kind='SHARED' and last_updated<=seen),'STALE_OR_UNKNOWN_VEHICLE');
      perform app.need((d->>'batteryPercent')::numeric between 0 and 100,'INVALID_BATTERY');
      condition:=coalesce(d->>'condition','OPERATIONAL');
      perform app.need(condition in ('OPERATIONAL','FAULTED'),'INVALID_CONDITION');
      observed_hub:=nullif(d->>'observedHubId','');
      perform app.need(observed_hub is null or exists(select from app.hubs where id=observed_hub),'HUB_NOT_FOUND');
      update app.vehicles set battery_level=(d->>'batteryPercent')::numeric,last_updated=seen where vehicle_id=resource;
      if condition='FAULTED' then
        result:=app.incident_action(p,'incident.report',jsonb_build_object('vehicleId',resource,'faultKey',coalesce(d->>'faultKey','telemetry-fault'),
          'description',coalesce(nullif(d->>'description',''),'Fault reported by the demo telemetry simulator.'),'severity','High'),t);
      end if;
      if observed_hub is not null and observed_hub is distinct from (select current_hub_id from app.vehicles where vehicle_id=resource) then
        discrepancy:='Observed Hub differs from confirmed location. Confirm transfer arrival separately.';
      end if;
      insert into app.fleet_observations values(typ,resource,observed_hub,seen,d,discrepancy)
        on conflict(resource_type,resource_id) do update set hub_id=excluded.hub_id,observed_at=excluded.observed_at,payload=excluded.payload,discrepancy=excluded.discrepancy;
      result:=jsonb_build_object('status',case when discrepancy is null then 'APPLIED' else 'RECONCILIATION_REQUIRED' end,
        'incidentId',result->>'incident_id','message',coalesce(discrepancy,'Vehicle observation accepted. Existing commitments and incident restrictions are preserved.'));
    else
      perform app.need(exists(select from app.charging_points where point_id=resource and status_observed_at<=seen),'STALE_OR_UNKNOWN_POINT');
      perform app.need(d->>'status' in ('Operational','Maintenance','Faulty','Unknown'),'INVALID_CONDITION');
      update app.charging_points set status=d->>'status',status_observed_at=seen where point_id=resource;
      if d->>'status'='Faulty' then
        result:=app.incident_action(p,'incident.report',jsonb_build_object('pointId',resource,'faultKey',coalesce(d->>'faultKey','telemetry-fault'),
          'description',coalesce(nullif(d->>'description',''),'Point fault reported by the demo telemetry simulator.'),'severity','High'),t);
      end if;
      insert into app.fleet_observations values(typ,resource,(select hub_id from app.charging_points where point_id=resource),seen,d,null)
        on conflict(resource_type,resource_id) do update set observed_at=excluded.observed_at,payload=excluded.payload;
      perform app.promote(t);
      result:=jsonb_build_object('status','APPLIED','incidentId',result->>'incident_id','message','Point condition recorded. Session state and incident restrictions are preserved.');
    end if;
    insert into app.telemetry_events values(eid,'Demo simulator',resource,op,seen,d);
    insert into app.fleet_event_results values(eid,result);
    return result;
  end if;
  raise exception 'UNKNOWN_OPERATION';
end $$;

-- Enrich only Member 4 views; Student and other modules keep their existing contracts.
alter function app.view_for_profile(app.profiles,text,jsonb) rename to view_before_fleet_final;
create function app.view_for_profile(p app.profiles,p_view text,p_filter jsonb default '{}') returns jsonb
language plpgsql stable set search_path='' as $$
declare result jsonb; data jsonb; t app.demo_state; err text;
begin
  if p_view not in ('network','fleet','incidents','fleet.validate') then return app.view_before_fleet_final(p,p_view,p_filter); end if;
  perform app.need(p.user_id is not null,'AUTH_REQUIRED');
  perform app.need(p.role='operator','FORBIDDEN');
  select * into t from app.demo_state where singleton;
  if p_view='fleet.validate' then data:=app.fleet_proposal(p_filter,t.demo_time);
  else
    result:=app.view_before_fleet_final(p,'fleet',p_filter);
    if result->>'ok'<>'true' then return result; end if;
    data:=result->'data';
    data:=data||jsonb_build_object(
      'hubs',app.list_json((select jsonb_agg(to_jsonb(h)||jsonb_build_object(
        'lastObservedAt',(select max(c.status_observed_at) from app.charging_points c where c.hub_id=h.id),
        'freshness',case when (select min(c.status_observed_at) from app.charging_points c where c.hub_id=h.id) > t.demo_time-make_interval(mins=>f.stale_minutes) then 'Live' else 'Stale' end,
        'parkingDiscrepancy',(select discrepancy from app.fleet_observations where resource_type='parking' and resource_id=h.id)) order by h.id)
        from app.hub_summary h cross join app.fleet_policy f)),
      'vehicles',app.list_json((select jsonb_agg(to_jsonb(v)||jsonb_build_object('chargingCommitted',exists(select from app.charging_requests c
        where c.vehicle_id=v.vehicle_id and c.status in ('Waiting','Scheduled','Charging','Suspended')),
        'activeRestrictionIds',app.list_json((select jsonb_agg(incident_id) from app.resource_restrictions r where r.vehicle_id=v.vehicle_id and lifted_at is null))) order by v.vehicle_id)
        from app.vehicles v where kind='SHARED')),
      'observations',app.list_json((select jsonb_agg(to_jsonb(x)) from app.fleet_observations x)),
      'policy',(select to_jsonb(x) from app.fleet_policy x),
      'incidentHistory',app.list_json((select jsonb_agg(to_jsonb(x) order by sequence_no) from app.incident_history x)),
      'transferHistory',app.list_json((select jsonb_agg(to_jsonb(x) order by sequence_no) from app.transfer_history x)),
      'telemetryEvents',app.list_json((select jsonb_agg(to_jsonb(x)) from (select e.*,r.result from app.telemetry_events e left join app.fleet_event_results r using(event_id) order by observed_at desc,event_id limit 25) x))
    )||app.charging_view();
  end if;
  return jsonb_build_object('ok',true,'data',data||jsonb_build_object('revision',t.revision,'demoTime',t.demo_time));
exception when raise_exception then return jsonb_build_object('ok',false,'code',sqlerrm);
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then return jsonb_build_object('ok',false,'code','INVALID_INPUT');
end $$;

-- SQL-language RPCs are rebound explicitly to the latest view implementation.
create or replace function public.demo_view(p_role text,p_view text,p_filter jsonb default '{}') returns jsonb
language sql stable security definer set search_path='' as $$ select app.view_for_profile(app.demo_actor(p_role),p_view,p_filter) $$;
-- All added tables are private; no table or helper grants to browser roles.
revoke all on app.fleet_policy,app.fleet_observations,app.incident_history,app.transfer_history,app.fleet_event_results from public,anon,authenticated;

alter function app.restore_demo() rename to restore_demo_before_fleet_final;
create function app.restore_demo() returns void language plpgsql set search_path='' as $$
begin
  -- Vehicle observations can have no Hub, so they cannot rely on a Hub FK cascade.
  delete from app.fleet_observations;
  perform app.restore_demo_before_fleet_final();
end $$;

-- New PostgreSQL functions otherwise inherit PUBLIC EXECUTE by default.
-- Only the security-definer public RPCs may invoke private module helpers.
revoke all on all functions in schema app from public,anon,authenticated;
