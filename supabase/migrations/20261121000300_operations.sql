create function app.list_json(p_rows jsonb) returns jsonb language sql immutable
  as $$ select coalesce(p_rows, '[]'::jsonb) $$;

create function app.actor() returns app.profiles language plpgsql stable set search_path = '' as $$
declare p app.profiles;
begin
  select * into p from app.profiles where auth_user_id=auth.uid();
  if p.user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  return p;
end $$;

create function app.need(p_condition boolean, p_error text) returns void language plpgsql immutable
  set search_path = '' as $$
begin
  if p_condition is distinct from true then raise exception '%', p_error; end if;
end $$;

create function app.new_id(p_prefix text) returns text language sql volatile set search_path = ''
  as $$ select p_prefix || '-' || gen_random_uuid()::text $$;

create function app.point_available(p app.charging_points) returns boolean language sql stable
  set search_path = '' as $$
  select p.status='Operational' and not p.reconciliation_hold
    and not exists(select from app.resource_restrictions r where r.point_id=p.point_id and r.lifted_at is null)
    and not exists(select from app.charging_allocations a where a.point_id=p.point_id and a.released_at is null)
$$;
create function app.free_space(p_hub text,p_now timestamptz,p_keep boolean default false) returns text language sql stable set search_path = '' as $$
  select s.space_id from app.parking_spaces s where s.hub_id=p_hub and s.in_service
    and not exists(select from app.vehicles v where v.parking_space_id=s.space_id)
    and not exists(select from app.parking_sessions p where p.parking_space_id=s.space_id and p.status='Active')
    and (not p_keep or not exists (
      select 1 from app.parking_reservation_slots slots join app.parking_reservations b using(reservation_id)
      where b.hub_id=p_hub and slots.slot_start+interval '15 minutes'>p_now
        and (b.status='Checked In' or (b.status='Confirmed' and b.expires_at>p_now))
      group by slots.slot_start
      having count(*) >= (select count(*) from app.parking_spaces cfg where cfg.hub_id=p_hub and cfg.in_service)
        -(select count(*) from app.vehicles v join app.parking_spaces ps on ps.space_id=v.parking_space_id where ps.hub_id=p_hub and ps.in_service)
        -(select count(*) from app.parking_sessions v join app.parking_reservations pr using(reservation_id)
          where pr.hub_id=p_hub and v.status='Active' and pr.departure_time<=slots.slot_start)
    ))
  order by s.space_id limit 1
$$;

create function app.touch_schedule(p_hub text, p_now timestamptz) returns text language sql volatile set search_path = '' as $$
  insert into app.charging_schedules(schedule_id,hub_id,generated_at,version)
  values ('schedule-'||p_hub,p_hub,p_now,1)
  on conflict(hub_id) do update set generated_at=excluded.generated_at, version=app.charging_schedules.version+1
  returning schedule_id
$$;

create function app.release_request(p_request text,p_status text,p_now timestamptz,p_reason text default null)
returns void language plpgsql set search_path = '' as $$
declare h text;
begin
  update app.charging_requests set status=p_status, ended_at=p_now,cancel_reason=p_reason
    where request_id=p_request returning hub_id into h;
  update app.charging_allocations set released_at=p_now where request_id=p_request and released_at is null;
  if found then perform app.touch_schedule(h,p_now); end if;
end $$;

create function app.promote(p_now timestamptz) returns void language plpgsql set search_path = '' as $$
declare r app.charging_requests; p app.charging_points; sid text;
begin
  for r in select * from app.charging_requests
    where status='Waiting' and requested_start<=p_now and requested_end>p_now
    order by accepted_at,current_battery_percent,request_id
  loop
    select x.* into p from app.charging_points x where x.hub_id=r.hub_id
      and x.charging_vehicle_type=r.charging_vehicle_type and app.point_available(x)
      and exists(select from app.hubs h where h.id=x.hub_id and h.status='Operational')
      order by x.point_id limit 1;
    if p.point_id is null then continue; end if;
    sid := app.touch_schedule(r.hub_id,p_now);
    insert into app.charging_allocations(allocation_id,schedule_id,request_id,point_id,start_time,end_time)
      values (app.new_id('alloc'),sid,r.request_id,p.point_id,p_now,r.requested_end);
    update app.charging_requests set status='Scheduled',
      estimated_duration_minutes=ceil(estimated_energy_kwh*60/p.rated_power_kw)
      where request_id=r.request_id;
    insert into app.notifications(user_id,request_id,message,created_at)
      values(r.student_id,r.request_id,'Charging point assigned. Connect within 15 minutes.',p_now);
  end loop;
end $$;

create function app.cancel_booking_requests(p_booking text,p_now timestamptz) returns void
language plpgsql set search_path = '' as $$
declare rid text;
begin
  perform app.need(not exists(select from app.charging_requests where parking_reservation_id=p_booking and status in ('Charging','Suspended')), 'STOP_CHARGING_FIRST');
  for rid in select request_id from app.charging_requests where parking_reservation_id=p_booking and status in ('Waiting','Scheduled')
  loop perform app.release_request(rid,'Cancelled',p_now,'PARKING_ENDED'); end loop;
end $$;

create function app.reconcile(p_now timestamptz) returns void language plpgsql set search_path = '' as $$
declare row_id text;
begin
  with expired as (
    update app.rental_reservations set status='EXPIRED' where status='CONFIRMED' and expires_at<=p_now returning vehicle_id
  )
  update app.vehicles set status=case when condition='OPERATIONAL' then 'AVAILABLE' else 'UNDER_MAINTENANCE' end
    where status='RESERVED' and vehicle_id in (select vehicle_id from expired);
  for row_id in update app.parking_reservations set status='Expired',expired_at=p_now,expiry_reason='NoShow'
    where status='Confirmed' and expires_at<=p_now returning reservation_id
  loop
    perform app.cancel_booking_requests(row_id,p_now);
    delete from app.parking_reservation_slots where reservation_id=row_id;
  end loop;
  with expired as (
    update app.charging_requests set status='Expired',ended_at=p_now
      where status='Waiting' and requested_end<=p_now returning student_id,request_id
  )
  insert into app.notifications(user_id,request_id,message,created_at)
    select student_id,request_id,'Your requested charging window has ended.',p_now from expired;
  for row_id in select r.request_id from app.charging_requests r join app.charging_allocations a using(request_id)
    where r.status='Scheduled' and a.released_at is null and a.start_time+interval '15 minutes'<=p_now
  loop
    perform app.release_request(row_id,'Cancelled',p_now,'START_TIMEOUT');
  end loop;
  update app.simulation_runs set status='Failed',error='Simulation did not finish.',finished_at=clock_timestamp()
    where status in ('Queued','Running') and created_at<clock_timestamp()-interval '2 minutes';
  perform app.promote(p_now);
end $$;

create function app.parking_review(p app.profiles,p_hub text,p_vehicle text,p_start timestamptz,p_end timestamptz,p_now timestamptz)
returns jsonb language plpgsql stable set search_path = '' as $$
declare expires timestamptz; blocked timestamptz;
begin
  perform app.need(p.role='student','FORBIDDEN');
  perform app.need(exists(select from app.vehicles where vehicle_id=p_vehicle and student_id=p.user_id and kind='PRIVATE'),'VEHICLE_NOT_FOUND');
  perform app.need(exists(select from app.hubs where id=p_hub and status='Operational'),'HUB_UNAVAILABLE');
  perform app.need(p_start<p_end and p_end<=p_start+interval '7 days'
    and extract(epoch from p_start)::numeric % 900=0 and extract(epoch from p_end)::numeric % 900=0,'INVALID_PARKING_WINDOW');
  expires:=least(p_start+interval '15 minutes',p_end);
  perform app.need(p_now<expires,'PARKING_WINDOW_EXPIRED');
  perform app.need(not exists(select from app.parking_reservations where vehicle_id=p_vehicle
    and status in ('Confirmed','Checked In') and arrival_time<p_end and departure_time>p_start),'PARKING_OVERLAP');
  select slot into blocked from generate_series(p_start,p_end-interval '15 minutes',interval '15 minutes') as g(slot)
    where (select count(*) from app.parking_spaces s where s.hub_id=p_hub and s.in_service)
      <= (select count(*) from app.vehicles v join app.parking_spaces s on s.space_id=v.parking_space_id where s.hub_id=p_hub and s.in_service)
      +(select count(*) from app.parking_reservation_slots ps join app.parking_reservations pr using(reservation_id)
        where ps.slot_start=slot and pr.hub_id=p_hub and (pr.status='Checked In' or (pr.status='Confirmed' and pr.expires_at>p_now)))
      +(select count(*) from app.parking_sessions s join app.parking_reservations pr using(reservation_id)
        where pr.hub_id=p_hub and s.status='Active' and slot>=pr.departure_time) limit 1;
  return jsonb_build_object('available',blocked is null,'blockedSlot',blocked,'expiresAt',expires);
end $$;

create function app.charging_action(p app.profiles, op text, d jsonb, t timestamptz)
returns jsonb language plpgsql set search_path = '' as $$
declare r app.charging_requests; a app.charging_allocations; b app.parking_reservations;
  v app.vehicles; pt app.charging_points; sid text; rid text; rstatus text; pos integer;
  st timestamptz; en timestamptz; seen timestamptz; low numeric; high numeric; kind text; eid text;
begin
  if op='charging.submit' then
    select * into v from app.vehicles where vehicle_id=d->>'vehicleId';
    perform app.need(v.vehicle_id is not null,'VEHICLE_NOT_FOUND');
    perform app.need(exists(select from app.hubs where id=d->>'hubId' and status='Operational'),'HUB_UNAVAILABLE');
    st:=(d->>'requestedStart')::timestamptz; en:=(d->>'requestedEnd')::timestamptz;
    low:=v.battery_level; high:=(d->>'targetBatteryPercent')::numeric;
    perform app.need(st<en and en>t and high>low and high<=100,'INVALID_CHARGING_REQUEST');
    if p.role='student' then
      select * into b from app.parking_reservations where reservation_id=d->>'parkingReservationId' and student_id=p.user_id;
      perform app.need(b.vehicle_id=v.vehicle_id and b.hub_id=d->>'hubId' and st>=b.arrival_time and en<=b.departure_time
        and b.status in ('Confirmed','Checked In'),'PARKING_NOT_ELIGIBLE');
    else
      perform app.need(v.kind='SHARED' and v.current_hub_id=d->>'hubId' and v.status='AVAILABLE','VEHICLE_UNAVAILABLE');
    end if;
    perform app.need(not exists(select from app.charging_requests where vehicle_id=v.vehicle_id and status in ('Waiting','Scheduled','Charging','Suspended')),'VEHICLE_ALREADY_WAITING_OR_CHARGING');
    rid:=app.new_id('request');
    insert into app.charging_requests(request_id,hub_id,vehicle_id,student_id,parking_reservation_id,
      charging_vehicle_type,submitted_at,accepted_at,requested_start,requested_end,current_battery_percent,
      target_battery_percent,estimated_energy_kwh,estimated_duration_minutes,status)
    values (rid,d->>'hubId',v.vehicle_id,p.user_id,b.reservation_id,v.charging_vehicle_type,t,clock_timestamp(),
      st,en,low,high,(high-low)*0.4,ceil((high-low)*24/7),'Waiting');
    perform app.promote(t);
    select * into r from app.charging_requests where request_id=rid;
    select * into a from app.charging_allocations where request_id=rid and released_at is null;
    if r.status='Waiting' then
      select q.position into pos from (select request_id,row_number() over(order by accepted_at,current_battery_percent,request_id) as position
        from app.charging_requests where hub_id=r.hub_id and status='Waiting') q where q.request_id=rid;
    end if;
    return jsonb_build_object('requestId',rid,'status',r.status,'allocationId',a.allocation_id,'queuePosition',pos,
      'reason',case when r.status='Waiting' then case when st>t then 'FutureStart' else 'Full' end end);
  end if;

  if op in ('charging.adjust','charging.event') then perform app.need(p.role='operator','FORBIDDEN'); end if;
  select * into r from app.charging_requests where request_id=d->>'requestId' and (p.role='operator' or student_id=p.user_id);
  if op='charging.adjust' then
    select * into a from app.charging_allocations where allocation_id=d->>'allocationId' and released_at is null;
    select * into r from app.charging_requests where request_id=a.request_id;
    perform app.need(r.status='Scheduled','REQUEST_NOT_ADJUSTABLE');
    perform app.need(exists(select from app.charging_schedules where schedule_id=a.schedule_id and version=(d->>'expectedVersion')::int),'STALE_SCHEDULE');
    select * into pt from app.charging_points where point_id=d->>'pointId' and hub_id=r.hub_id;
    perform app.need(pt.charging_vehicle_type=r.charging_vehicle_type and app.point_available(pt),'POINT_UNAVAILABLE');
    perform app.need(not exists(select from app.charging_requests q where q.hub_id=r.hub_id
      and q.charging_vehicle_type=r.charging_vehicle_type and q.status='Waiting'
      and q.requested_start<=t and q.requested_end>t
      and (q.accepted_at,q.current_battery_percent,q.request_id)<(r.accepted_at,r.current_battery_percent,r.request_id)),'FCFS_PRIORITY');
    update app.charging_allocations set point_id=pt.point_id where allocation_id=a.allocation_id;
    perform app.touch_schedule(r.hub_id,t);
    perform app.promote(t);
    return jsonb_build_object('pointId',pt.point_id);
  end if;
  perform app.need(r.request_id is not null,'REQUEST_NOT_FOUND');
  select * into a from app.charging_allocations where request_id=r.request_id and released_at is null;
  if op='charging.cancel' then
    perform app.need(r.status in ('Waiting','Scheduled'),'SESSION_ALREADY_ACTIVE');
    perform app.release_request(r.request_id,'Cancelled',t,'USER_CANCELLED');
  elsif op='charging.stop' then
    perform app.need(r.status in ('Charging','Suspended') and d->>'choice' in ('COMPLETE','CANCEL'),'INVALID_STOP');
    rstatus:=case d->>'choice' when 'COMPLETE' then 'Completed' else 'Cancelled' end;
    update app.charging_sessions set ended_at=t,last_event_at=t where session_id=r.active_session_id;
    perform app.release_request(r.request_id,rstatus,t);
  elsif op='charging.event' then
    eid:=d->>'eventId'; kind:=d->>'kind'; seen:=coalesce((d->>'observedAt')::timestamptz,t);
    perform app.need(eid is not null and kind in ('START','STOP','TARGET_REACHED','SUSPEND','RESUME'),'INVALID_EVENT');
    perform app.need(not exists(select from app.telemetry_events where event_id=eid),'DUPLICATE_EVENT');
    if (a.point_id=d->>'pointId' and r.vehicle_id=d->>'vehicleId' and seen between a.start_time and t) is distinct from true then
      update app.charging_points set reconciliation_hold=true where point_id=a.point_id;
      if a.point_id is not null then
        insert into app.telemetry_events values(eid,'Demo simulator',a.point_id,'RECONCILIATION_REQUIRED',seen,d);
      end if;
      return jsonb_build_object('status','RECONCILIATION_REQUIRED','message','The event does not match the current assignment.');
    end if;
    select * into pt from app.charging_points where point_id=a.point_id;
    if kind='START' then
      perform app.need(r.status='Scheduled' and pt.status='Operational' and not pt.reconciliation_hold and
        not exists(select from app.resource_restrictions where point_id=pt.point_id and lifted_at is null),'POINT_UNAVAILABLE');
      perform app.need(r.parking_reservation_id is null or exists(select from app.parking_sessions
        where reservation_id=r.parking_reservation_id and status='Active'),'PARKING_NOT_ACTIVE');
      sid:=app.new_id('session');
      insert into app.charging_sessions values(sid,r.request_id,a.point_id,r.vehicle_id,seen,null,seen);
      update app.charging_requests set status='Charging',started_at=seen,active_session_id=sid where request_id=r.request_id;
    else
      perform app.need(r.active_session_id=d->>'sessionId' and exists(select from app.charging_sessions
        where session_id=r.active_session_id and ended_at is null and seen>=last_event_at),'RECONCILIATION_REQUIRED');
      if kind in ('SUSPEND','RESUME') then
        perform app.need((kind='SUSPEND' and r.status='Charging') or (kind='RESUME' and r.status='Suspended'
          and pt.status='Operational' and not pt.reconciliation_hold
          and not exists(select from app.resource_restrictions where point_id=pt.point_id and lifted_at is null)),'INVALID_SESSION_TRANSITION');
        update app.charging_sessions set last_event_at=seen where session_id=r.active_session_id;
        update app.charging_requests set status=case kind when 'SUSPEND' then 'Suspended' else 'Charging' end where request_id=r.request_id;
      else
        perform app.need(r.status in ('Charging','Suspended'),'INVALID_SESSION_TRANSITION');
        high:=(d->>'batteryPercent')::numeric;
        perform app.need((kind='TARGET_REACHED' and high between r.target_battery_percent and 100)
          or (kind='STOP' and d->>'stopChoice' in ('COMPLETE','CANCEL')),'INVALID_STOP');
        rstatus:=case when kind='TARGET_REACHED' or d->>'stopChoice'='COMPLETE' then 'Completed' else 'Cancelled' end;
        update app.charging_sessions set ended_at=seen,last_event_at=seen where session_id=r.active_session_id;
        perform app.release_request(r.request_id,rstatus,t);
        if high between 0 and 100 then
          update app.charging_requests set final_battery_percent=high where request_id=r.request_id;
          update app.vehicles set battery_level=high,last_updated=seen where vehicle_id=r.vehicle_id;
        end if;
      end if;
    end if;
    insert into app.telemetry_events values(eid,'Demo simulator',a.point_id,kind,seen,d);
  else raise exception 'UNKNOWN_OPERATION';
  end if;
  perform app.promote(t);
  return (select to_jsonb(x) from app.charging_requests x where x.request_id=r.request_id);
end $$;

create function app.mobility_action(p app.profiles,op text,d jsonb,t timestamptz)
returns jsonb language plpgsql set search_path = '' as $$
declare b app.parking_reservations; v app.vehicles; rr app.rental_reservations; trip app.rental_trips;
  h text:=d->>'hubId'; vid text:=d->>'vehicleId'; rid text:=d->>'reservationId'; slot text; generated text;
  st timestamptz; en timestamptz; review jsonb;
begin
  perform app.need(p.role='student','FORBIDDEN');
  if op='parking.reserve' then
    st:=(d->>'arrivalTime')::timestamptz; en:=(d->>'departureTime')::timestamptz;
    review:=app.parking_review(p,h,vid,st,en,t);
    perform app.need((review->>'available')::boolean,'PARKING_FULL');
    rid:=app.new_id('parking');
    insert into app.parking_reservations(reservation_id,student_id,hub_id,vehicle_id,arrival_time,departure_time,expires_at,status)
      values (rid,p.user_id,h,vid,st,en,(review->>'expiresAt')::timestamptz,'Confirmed');
    insert into app.parking_reservation_slots select rid,g from generate_series(st,en-interval '15 minutes',interval '15 minutes') g;
    return jsonb_build_object('reservationId',rid,'status','Confirmed');
  elsif op like 'parking.%' then
    select * into b from app.parking_reservations where reservation_id=rid and student_id=p.user_id;
    perform app.need(b.reservation_id is not null,'BOOKING_NOT_FOUND');
    if op='parking.checkIn' then
      perform app.need(b.status='Confirmed' and t>=b.arrival_time and t<b.expires_at,'CHECK_IN_WINDOW_CLOSED');
      slot:=app.free_space(b.hub_id,t);
      perform app.need(slot is not null,'PARKING_FULL');
      generated:=app.new_id('visit');
      insert into app.parking_sessions values(generated,rid,slot,t,null,'Active');
      update app.parking_reservations set status='Checked In' where reservation_id=rid;
      return jsonb_build_object('sessionId',generated,'parkingSpaceId',slot);
    elsif op='parking.cancel' or op='parking.checkOut' then
      perform app.need((op='parking.cancel' and b.status='Confirmed') or (op='parking.checkOut' and b.status='Checked In'),'INVALID_BOOKING_TRANSITION');
      perform app.cancel_booking_requests(rid,t);
      if op='parking.checkOut' then
        update app.parking_sessions set status='Closed',actual_departure=t where reservation_id=rid and status='Active';
        perform app.need(found,'PARKING_NOT_ACTIVE');
      end if;
      delete from app.parking_reservation_slots where reservation_id=rid;
      update app.parking_reservations set status=case op when 'parking.cancel' then 'Cancelled' else 'Completed' end
        where reservation_id=rid returning * into b;
      perform app.promote(t);
      return to_jsonb(b);
    end if;
  elsif op='rental.reserve' then
    select * into v from app.vehicles where vehicle_id=vid;
    perform app.need(v.kind='SHARED' and v.status='AVAILABLE' and v.condition='OPERATIONAL'
      and exists(select from app.hubs where id=v.current_hub_id and status='Operational')
      and not exists(select from app.charging_requests where vehicle_id=vid and status in ('Waiting','Scheduled','Charging','Suspended')),
      'VEHICLE_UNAVAILABLE');
    rid:=app.new_id('rental');
    insert into app.rental_reservations values(rid,p.user_id,vid,t,t+interval '15 minutes','CONFIRMED');
    update app.vehicles set status='RESERVED',last_updated=t where vehicle_id=vid;
    return jsonb_build_object('reservationId',rid,'status','CONFIRMED');
  elsif op in ('rental.pickup','rental.cancel') then
    select * into rr from app.rental_reservations where reservation_id=rid and student_id=p.user_id;
    perform app.need(rr.status='CONFIRMED' and rr.expires_at>t,'RENTAL_HOLD_UNAVAILABLE');
    select * into v from app.vehicles where vehicle_id=rr.vehicle_id;
    if op='rental.pickup' then
      perform app.need(v.status='RESERVED' and v.condition='OPERATIONAL','VEHICLE_UNAVAILABLE');
      generated:=app.new_id('trip');
      insert into app.rental_trips(trip_id,reservation_id,student_id,vehicle_id,start_hub_id,start_time,status)
        values(generated,rid,p.user_id,v.vehicle_id,v.current_hub_id,t,'ACTIVE');
      update app.rental_reservations set status='PICKED_UP' where reservation_id=rid;
      update app.vehicles set status='IN_USE',current_hub_id=null,parking_space_id=null,last_updated=t where vehicle_id=v.vehicle_id;
    else
      update app.rental_reservations set status='CANCELLED' where reservation_id=rid;
      update app.vehicles set status=case when condition='OPERATIONAL' then 'AVAILABLE' else 'UNDER_MAINTENANCE' end,last_updated=t
        where vehicle_id=v.vehicle_id;
    end if;
    return jsonb_build_object('reservationId',rid,'tripId',generated);
  elsif op='rental.return' then
    select * into trip from app.rental_trips where trip_id=d->>'tripId' and student_id=p.user_id and status='ACTIVE';
    perform app.need(trip.trip_id is not null,'TRIP_NOT_FOUND');
    perform app.need(exists(select from app.hubs where id=h and status='Operational'),'HUB_UNAVAILABLE');
    slot:=app.free_space(h,t,true);
    perform app.need(slot is not null,'PARKING_FULL');
    update app.rental_trips set end_hub_id=h,end_time=t,status='COMPLETED' where trip_id=trip.trip_id;
    update app.vehicles set status=case when condition='OPERATIONAL' then 'AVAILABLE' else 'UNDER_MAINTENANCE' end,
      current_hub_id=h,parking_space_id=slot,last_updated=t where vehicle_id=trip.vehicle_id;
    return jsonb_build_object('tripId',trip.trip_id,'parkingSpaceId',slot);
  end if;
  raise exception 'UNKNOWN_OPERATION';
end $$;

create function app.fleet_action(p app.profiles,op text,d jsonb,t timestamptz)
returns jsonb language plpgsql set search_path = '' as $$
declare id text:=d->>'orderId'; vid text:=d->>'vehicleId'; pid text:=d->>'pointId'; incident text:=d->>'incidentId';
  src text:=d->>'sourceHubId'; dst text:=d->>'destinationHubId'; slot text; eid text:=d->>'eventId';
  next_status text; o app.redistribution_orders; ticket app.incident_tickets; seen timestamptz; battery numeric;
begin
  if op='incident.report' then
    perform app.need(nullif(trim(d->>'description'),'') is not null and num_nonnulls(vid,pid)=1,'INVALID_INCIDENT');
    if p.role='student' then
      perform app.need(pid is null and exists(select from app.rental_trips where vehicle_id=vid and student_id=p.user_id and app.rental_trips.status='ACTIVE'),'FORBIDDEN');
    end if;
    incident:=app.new_id('incident');
    insert into app.incident_tickets values(incident,p.user_id,vid,pid,trim(d->>'description'),'Open',t,null);
    insert into app.resource_restrictions values(incident,vid,pid,null);
    if vid is not null then
      update app.vehicles set condition='FAULTED',
        status=case when app.vehicles.status='AVAILABLE' then 'UNDER_MAINTENANCE' else app.vehicles.status end,last_updated=t
      where vehicle_id=vid;
    end if;
    return jsonb_build_object('incidentId',incident);
  end if;
  perform app.need(p.role='operator','FORBIDDEN');
  if op='fleet.create' then
    perform app.need(src<>dst and exists(select from app.hubs h where h.id=dst and h.status='Operational'),'INVALID_TRANSFER');
    perform app.need(jsonb_typeof(d->'vehicleIds')='array' and jsonb_array_length(d->'vehicleIds') between 1 and 10,'INVALID_TRANSFER');
    id:=app.new_id('transfer');
    insert into app.redistribution_orders values(id,src,dst,t,'Planned');
    for vid in select value from jsonb_array_elements_text(d->'vehicleIds')
    loop
      update app.vehicles set status='REDISTRIBUTING',last_updated=t
        where vehicle_id=vid and current_hub_id=src and app.vehicles.status='AVAILABLE' and condition='OPERATIONAL'
        and not exists(select from app.charging_requests where vehicle_id=vid and app.charging_requests.status in ('Waiting','Scheduled','Charging','Suspended'));
      perform app.need(found,'VEHICLE_UNAVAILABLE');
      insert into app.redistribution_order_vehicles values(id,vid,null);
    end loop;
    return jsonb_build_object('orderId',id);
  elsif op in ('fleet.dispatch','fleet.arrive','fleet.cancel') then
    select * into o from app.redistribution_orders where order_id=id;
    if op='fleet.dispatch' then
      perform app.need(o.status='Planned','INVALID_TRANSFER_TRANSITION');
      perform app.need(not exists(select from app.redistribution_order_vehicles w join app.vehicles v using(vehicle_id)
        where w.order_id=id and v.condition<>'OPERATIONAL'),'VEHICLE_UNAVAILABLE');
      next_status:='Dispatched';
      update app.vehicles set parking_space_id=null,last_updated=t
        where vehicle_id in (select vehicle_id from app.redistribution_order_vehicles where order_id=id);
    elsif op='fleet.cancel' then
      perform app.need(o.status='Planned','INVALID_TRANSFER_TRANSITION');
      update app.vehicles set status=case when condition='OPERATIONAL' then 'AVAILABLE' else 'UNDER_MAINTENANCE' end,last_updated=t
        where vehicle_id in (select vehicle_id from app.redistribution_order_vehicles where order_id=id);
      next_status:='Cancelled';
    else
      perform app.need(o.status in ('Dispatched','Partial','AtRisk') and exists(select from app.redistribution_order_vehicles
        where order_id=id and vehicle_id=vid and arrived_at is null),'INVALID_TRANSFER_ARRIVAL');
      slot:=app.free_space(o.destination_hub_id,t,true);
      if slot is null then
        next_status:='AtRisk';
      else
        update app.vehicles set current_hub_id=o.destination_hub_id,parking_space_id=slot,last_updated=t,
          status=case when condition='OPERATIONAL' then 'AVAILABLE' else 'UNDER_MAINTENANCE' end where vehicle_id=vid;
        update app.redistribution_order_vehicles set arrived_at=t where order_id=id and vehicle_id=vid;
        next_status:=case when exists(select from app.redistribution_order_vehicles where order_id=id and arrived_at is null) then 'Partial' else 'Completed' end;
      end if;
    end if;
    update app.redistribution_orders set status=next_status where order_id=id;
    return jsonb_build_object('orderId',id,'status',next_status);
  elsif op in ('incident.investigate','incident.resolve','incident.close') then
    select * into ticket from app.incident_tickets where incident_id=incident;
    if op='incident.investigate' then
      perform app.need(ticket.status='Open','INVALID_INCIDENT_TRANSITION');
      next_status:='Investigating';
    elsif op='incident.close' then
      perform app.need(ticket.status='Resolved','INVALID_INCIDENT_TRANSITION');
      next_status:='Closed';
    else
      perform app.need(ticket.status in ('Open','Investigating') and d->>'verified'='true','RECOVERY_NOT_VERIFIED');
      next_status:='Resolved';
      update app.resource_restrictions set lifted_at=t where incident_id=incident;
      if ticket.vehicle_id is not null and not exists(select from app.resource_restrictions where vehicle_id=ticket.vehicle_id and lifted_at is null) then
        update app.vehicles set condition='OPERATIONAL',
          status=case when app.vehicles.status='UNDER_MAINTENANCE' then 'AVAILABLE' else app.vehicles.status end,last_updated=t
          where vehicle_id=ticket.vehicle_id;
      end if;
    end if;
    update app.incident_tickets set status=next_status,
      resolved_at=case when next_status='Resolved' then t else resolved_at end where incident_id=incident;
    perform app.promote(t);
    return jsonb_build_object('incidentId',incident,'status',next_status);
  elsif op='telemetry.point' then
    next_status:=d->>'status'; seen:=coalesce((d->>'observedAt')::timestamptz,t);
    perform app.need(eid is not null and next_status in ('Operational','Maintenance','Faulty','Unknown') and seen<=t,'INVALID_EVENT');
    perform app.need(not exists(select from app.telemetry_events where event_id=eid),'DUPLICATE_EVENT');
    update app.charging_points set status=next_status,status_observed_at=seen
      where point_id=pid and status_observed_at<=seen;
    perform app.need(found,'STALE_OBSERVATION');
    insert into app.telemetry_events values(eid,'Demo simulator',pid,'POINT_STATUS',seen,d);
    perform app.promote(t);
    return jsonb_build_object('pointId',pid,'status',next_status);
  elsif op='telemetry.vehicle' then
    seen:=coalesce((d->>'observedAt')::timestamptz,t); battery:=(d->>'batteryPercent')::numeric;
    perform app.need(eid is not null and seen<=t and battery between 0 and 100,'INVALID_EVENT');
    perform app.need(not exists(select from app.telemetry_events where event_id=eid),'DUPLICATE_EVENT');
    update app.vehicles set battery_level=battery,last_updated=seen
      where vehicle_id=vid and kind='SHARED' and last_updated<=seen;
    perform app.need(found,'STALE_OBSERVATION');
    insert into app.telemetry_events values(eid,'Demo simulator',vid,'VEHICLE_BATTERY',seen,d);
    return jsonb_build_object('vehicleId',vid,'batteryPercent',battery);
  end if;
  raise exception 'UNKNOWN_OPERATION';
end $$;
