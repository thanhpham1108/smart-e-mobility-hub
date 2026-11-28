create or replace function app.point_available(p app.charging_points) returns boolean
language sql stable set search_path='' as $$
  select p.status='Operational' and not p.reconciliation_hold
    and exists(select from app.hubs h where h.id=p.hub_id and h.status='Operational')
    and not exists(select from app.resource_restrictions r where r.point_id=p.point_id and r.lifted_at is null)
    and not exists(select from app.charging_allocations a where a.point_id=p.point_id and a.released_at is null)
$$;

create function app.charging_vehicle_eligible(v app.vehicles,h text) returns boolean
language sql immutable set search_path='' as $$
  select v.condition='OPERATIONAL'
    and (v.kind='PRIVATE' or (v.status='AVAILABLE' and v.current_hub_id=h))
$$;

create or replace function app.charging_view(p_student text default null,p_hub text default null)
returns jsonb language sql stable set search_path='' as $$
  with queue as (
    select request_id,row_number() over(partition by hub_id order by accepted_at,current_battery_percent,request_id) as queue_position
    from app.charging_requests where status='Waiting'
  ), status_rows as (
    select r.*,q.queue_position,v.name as vehicle_name,v.condition as vehicle_condition,
      v.battery_level as vehicle_battery_percent,b.status as parking_status,
      case when r.status='Waiting' then case
        when h.status<>'Operational' then 'HubUnavailable'
        when app.charging_vehicle_eligible(v,r.hub_id) is distinct from true then 'VehicleUnavailable'
        when r.requested_start>d.demo_time then 'FutureStart'
        else 'Full' end end as waiting_reason
    from app.charging_requests r join app.vehicles v using(vehicle_id) join app.hubs h on h.id=r.hub_id
    left join queue q using(request_id) left join app.parking_reservations b on b.reservation_id=r.parking_reservation_id
    cross join app.demo_state d
    where (p_student is null or r.student_id=p_student) and (p_hub is null or r.hub_id=p_hub)
  )
  select jsonb_build_object(
    'chargingRequests',app.list_json((select jsonb_agg((to_jsonb(r)-'parking_status')||jsonb_build_object(
      'full',coalesce(r.waiting_reason='Full',false),'parkingStatus',r.parking_status)
      order by accepted_at,current_battery_percent,request_id) from status_rows r)),
    'chargingAllocations',app.list_json((select jsonb_agg(to_jsonb(a)) from app.charging_allocations a
      join status_rows r using(request_id) where a.released_at is null)),
    'chargingSessions',app.list_json((select jsonb_agg(to_jsonb(s)) from app.charging_sessions s join status_rows r using(request_id))),
    'chargingSchedules',app.list_json((select jsonb_agg(to_jsonb(s)) from app.charging_schedules s
      where p_student is null and (p_hub is null or s.hub_id=p_hub))),
    'chargingPoints',app.list_json((select jsonb_agg(to_jsonb(c)||jsonb_build_object('activeRestrictionIds',
      app.list_json((select jsonb_agg(incident_id) from app.resource_restrictions
        where point_id=c.point_id and lifted_at is null))) order by c.point_id)
      from app.charging_points c where (p_hub is null or c.hub_id=p_hub)
        and (p_student is null or exists(select from app.charging_allocations a join status_rows r using(request_id)
          where a.point_id=c.point_id and a.released_at is null))))
  )
$$;

-- Keep the existing FCFS order. A faulted or no-longer-present shared vehicle
-- must wait until operationally eligible instead of consuming newly freed capacity.
create or replace function app.promote(p_now timestamptz) returns void
language plpgsql set search_path='' as $$
declare r app.charging_requests; p app.charging_points; sid text;
begin
  for r in select request.* from app.charging_requests request
    join app.vehicles vehicle using(vehicle_id)
    where request.status='Waiting' and request.requested_start<=p_now and request.requested_end>p_now
      and app.charging_vehicle_eligible(vehicle,request.hub_id)
    order by request.accepted_at,request.current_battery_percent,request.request_id
  loop
    select x.* into p from app.charging_points x where x.hub_id=r.hub_id
      and x.charging_vehicle_type=r.charging_vehicle_type and app.point_available(x)
      order by x.point_id limit 1;
    if p.point_id is null then continue; end if;
    sid:=app.touch_schedule(r.hub_id,p_now);
    insert into app.charging_allocations(allocation_id,schedule_id,request_id,point_id,start_time,end_time)
      values(app.new_id('alloc'),sid,r.request_id,p.point_id,p_now,r.requested_end);
    update app.charging_requests set status='Scheduled',
      estimated_duration_minutes=ceil(estimated_energy_kwh*60/p.rated_power_kw)
      where request_id=r.request_id;
    insert into app.notifications(user_id,request_id,message,created_at)
      values(r.student_id,r.request_id,'Charging point assigned. Connect within 15 minutes.',p_now);
  end loop;
end $$;

alter function app.charging_action(app.profiles,text,jsonb,timestamptz) rename to charging_action_before_shared_eligibility;
create function app.charging_action(p app.profiles,op text,d jsonb,t timestamptz) returns jsonb
language plpgsql set search_path='' as $$
declare request app.charging_requests; kind text:=d->>'kind'; observation timestamptz;
begin
  if op='charging.submit' then
    perform app.need(not exists(select from app.vehicles where vehicle_id=d->>'vehicleId'
      and condition<>'OPERATIONAL'),'VEHICLE_UNAVAILABLE');
  elsif op='charging.event' then
    perform app.need(p.role='operator','FORBIDDEN');
    select * into request from app.charging_requests where request_id=d->>'requestId';
    if request.request_id is not null and kind in ('START','RESUME') then
      perform app.need(exists(select from app.hubs where id=request.hub_id and status='Operational'),'HUB_UNAVAILABLE');
      perform app.need(exists(select from app.vehicles v where v.vehicle_id=request.vehicle_id
        and app.charging_vehicle_eligible(v,request.hub_id)),'VEHICLE_UNAVAILABLE');
    elsif request.request_id is not null and kind in ('TARGET_REACHED','STOP') and d->>'batteryPercent' is not null then
      observation:=coalesce((d->>'observedAt')::timestamptz,t);
      perform app.need(not exists(select from app.vehicles
        where vehicle_id=request.vehicle_id and last_updated>observation),'STALE_VEHICLE_BATTERY');
    end if;
  end if;
  return app.charging_action_before_shared_eligibility(p,op,d,t);
end $$;

alter function app.rental_incident_restriction(text,boolean,timestamptz) rename to rental_incident_restriction_before_charging;
create function app.rental_incident_restriction(p_ticket text,p_active boolean,t timestamptz)
returns void language plpgsql set search_path='' as $$
begin
  perform app.rental_incident_restriction_before_charging(p_ticket,p_active,t);
  if not p_active then perform app.promote(t); end if;
end $$;

revoke all on function app.charging_vehicle_eligible(app.vehicles,text),app.charging_action(app.profiles,text,jsonb,timestamptz),
  app.rental_incident_restriction(text,boolean,timestamptz) from public,anon,authenticated;
