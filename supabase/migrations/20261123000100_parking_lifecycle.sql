-- Member 3: parking lifecycle, interval review and owned booking details.
-- Existing command entry points serialize all writes on app.demo_state.
create function app.parking_expire(p_now timestamptz) returns boolean
language plpgsql set search_path = '' as $$
declare rid text; changed boolean := false;
begin
  for rid in
    select b.reservation_id from app.parking_reservations b
    where b.status='Confirmed' and b.expires_at<=p_now
      and not exists(select from app.parking_sessions s where s.reservation_id=b.reservation_id and s.status='Active')
      and not exists(select from app.charging_requests r where r.parking_reservation_id=b.reservation_id and r.status in ('Charging','Suspended'))
      and not exists(select from app.charging_sessions s join app.charging_requests r using(request_id)
        where r.parking_reservation_id=b.reservation_id and s.ended_at is null)
  loop
    perform app.cancel_booking_requests(rid,p_now);
    delete from app.parking_reservation_slots where reservation_id=rid;
    update app.parking_reservations set status='Expired',expired_at=p_now,expiry_reason='NoShow' where reservation_id=rid;
    changed := true;
  end loop;
  if changed then
    update app.demo_state set revision=revision+1 where singleton;
    perform app.promote(p_now);
  end if;
  return changed;
end $$;

-- An Active visit occupies one physical space throughout its stay, even after
-- the booked departure. Its slot holds are already represented by that visit.
create function app.parking_slot_used(p_hub text,p_slot timestamptz) returns bigint
language sql stable set search_path = '' as $$
  select
    (select count(*) from app.parking_spaces s where s.hub_id=p_hub and s.in_service
      and (exists(select from app.vehicles v where v.parking_space_id=s.space_id)
        or exists(select from app.parking_sessions v where v.parking_space_id=s.space_id and v.status='Active')))
    + (select count(*) from app.parking_reservation_slots slots
      join app.parking_reservations b using(reservation_id)
      where b.hub_id=p_hub and slots.slot_start=p_slot and b.status in ('Confirmed','Checked In')
        and not exists(select from app.parking_sessions v where v.reservation_id=b.reservation_id and v.status='Active'))
$$;

create or replace function app.free_space(p_hub text,p_now timestamptz,p_keep boolean default false)
returns text language sql stable set search_path = '' as $$
  select s.space_id from app.parking_spaces s
  where s.hub_id=p_hub and s.in_service
    and exists(select from app.hubs h where h.id=p_hub and h.status='Operational')
    and not exists(select from app.vehicles v where v.parking_space_id=s.space_id)
    and not exists(select from app.parking_sessions v where v.parking_space_id=s.space_id and v.status='Active')
    and (not p_keep or not exists(
      select from app.parking_reservation_slots slots join app.parking_reservations b using(reservation_id)
      where b.hub_id=p_hub and b.status in ('Confirmed','Checked In') and slots.slot_start+interval '15 minutes'>p_now
        and app.parking_slot_used(p_hub,slots.slot_start)>=(select count(*) from app.parking_spaces cfg where cfg.hub_id=p_hub and cfg.in_service)))
  order by s.space_id limit 1
$$;

create or replace function app.parking_review(p app.profiles,p_hub text,p_vehicle text,p_start timestamptz,p_end timestamptz,p_now timestamptz)
returns jsonb language plpgsql stable set search_path = '' as $$
declare expires timestamptz; blocked timestamptz; capacity bigint; slots jsonb;
begin
  perform app.need(p.role='student','FORBIDDEN');
  perform app.need(exists(select from app.vehicles where vehicle_id=p_vehicle and student_id=p.user_id and kind='PRIVATE'),'VEHICLE_NOT_FOUND');
  perform app.need(exists(select from app.hubs where id=p_hub and status='Operational'),'HUB_UNAVAILABLE');
  perform app.need(p_start<p_end and p_end<=p_start+interval '7 days'
    and extract(epoch from p_start)::numeric % 900=0 and extract(epoch from p_end)::numeric % 900=0,'INVALID_PARKING_WINDOW');
  expires:=least(p_start+interval '15 minutes',p_end);
  perform app.need(p_now<expires,'PARKING_WINDOW_EXPIRED');
  perform app.need(not exists(select from app.parking_reservations b where b.vehicle_id=p_vehicle
    and b.status in ('Confirmed','Checked In') and b.arrival_time<p_end and b.departure_time>p_start),'PARKING_OVERLAP');
  select count(*) into capacity from app.parking_spaces where hub_id=p_hub and in_service;
  select jsonb_agg(jsonb_build_object('start',slot,'free',greatest(0,capacity-app.parking_slot_used(p_hub,slot))) order by slot),
    min(slot) filter(where capacity<=app.parking_slot_used(p_hub,slot))
    into slots,blocked
    from generate_series(p_start,p_end-interval '15 minutes',interval '15 minutes') g(slot);
  return jsonb_build_object('available',blocked is null,'blockedSlot',blocked,'expiresAt',expires,
    'hubId',p_hub,'vehicleId',p_vehicle,'arrivalTime',p_start,'departureTime',p_end,'slots',slots,'graceMinutes',15);
end $$;

create function app.parking_details(p app.profiles,p_reference text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare b app.parking_reservations; visit jsonb; requests jsonb; consequences jsonb;
begin
  perform app.need(p.role='student','FORBIDDEN');
  select * into b from app.parking_reservations where reservation_id=p_reference and student_id=p.user_id;
  perform app.need(b.reservation_id is not null,'BOOKING_NOT_FOUND');
  select to_jsonb(s) into visit from app.parking_sessions s where s.reservation_id=b.reservation_id;
  select app.list_json(jsonb_agg(to_jsonb(r) order by r.accepted_at,r.request_id)) into requests
    from app.charging_requests r where r.parking_reservation_id=b.reservation_id;
  select app.list_json(jsonb_agg(jsonb_build_object('requestId',r.request_id,'status',r.status,
    'allocation',to_jsonb(a)) order by r.request_id))
    into consequences from app.charging_requests r left join app.charging_allocations a
      on a.request_id=r.request_id and a.released_at is null
    where r.parking_reservation_id=b.reservation_id and r.status in ('Waiting','Scheduled','Charging','Suspended');
  return to_jsonb(b)||jsonb_build_object('reservationId',b.reservation_id,'session',visit,'chargingRequests',requests,
    'reconciliationRequired',b.status='Confirmed' and b.expires_at<=(select demo_time from app.demo_state where singleton),
    'summaryVersion',md5(jsonb_build_object('booking',to_jsonb(b),'session',visit,'charging',consequences)::text));
end $$;

create function app.parking_action(p app.profiles,op text,d jsonb,t timestamptz) returns jsonb
language plpgsql set search_path = '' as $$
declare b app.parking_reservations; visit app.parking_sessions;
  rid text:=d->>'reservationId'; slot text; review jsonb; st timestamptz; en timestamptz;
begin
  perform app.need(p.role='student','FORBIDDEN');
  if op='parking.reserve' then
    st:=(d->>'arrivalTime')::timestamptz; en:=(d->>'departureTime')::timestamptz;
    review:=app.parking_review(p,d->>'hubId',d->>'vehicleId',st,en,t);
    perform app.need((review->>'available')::boolean,'PARKING_FULL');
    if d ? 'expectedExpiresAt' then
      perform app.need((d->>'expectedExpiresAt')::timestamptz=(review->>'expiresAt')::timestamptz,'PARKING_REVIEW_CHANGED');
    end if;
    rid:=app.new_id('parking');
    insert into app.parking_reservations(reservation_id,student_id,hub_id,vehicle_id,arrival_time,departure_time,grace_minutes,expires_at,status)
      values(rid,p.user_id,d->>'hubId',d->>'vehicleId',st,en,15,(review->>'expiresAt')::timestamptz,'Confirmed');
    insert into app.parking_reservation_slots select rid,g from generate_series(st,en-interval '15 minutes',interval '15 minutes') g;
    return app.parking_details(p,rid);
  end if;

  select * into b from app.parking_reservations where reservation_id=rid and student_id=p.user_id;
  perform app.need(b.reservation_id is not null,'BOOKING_NOT_FOUND');
  perform app.need(not(d ? 'vehicleId') or d->>'vehicleId'=b.vehicle_id,'ARRIVAL_MISMATCH');
  perform app.need(not(d ? 'hubId') or d->>'hubId'=b.hub_id,'ARRIVAL_MISMATCH');
  select * into visit from app.parking_sessions where reservation_id=rid;
  if op='parking.checkIn' then
    if b.status='Checked In' and visit.status='Active' then
      return jsonb_build_object('sessionId',visit.session_id,'parkingSpaceId',visit.parking_space_id,'reservationId',rid,'status','Checked In');
    end if;
    perform app.need(b.status='Confirmed' and t>=b.arrival_time and t<b.expires_at,'CHECK_IN_WINDOW_CLOSED');
    perform app.need(visit.session_id is null and not exists(
      select from app.parking_sessions s join app.parking_reservations r using(reservation_id)
      where r.vehicle_id=b.vehicle_id and s.status='Active'),'VEHICLE_ALREADY_PARKED');
    perform app.need(not exists(
      select g from generate_series(b.arrival_time,b.departure_time-interval '15 minutes',interval '15 minutes') g
      where not exists(select from app.parking_reservation_slots s where s.reservation_id=rid and s.slot_start=g)),'PARKING_HOLD_UNAVAILABLE');
    slot:=app.free_space(b.hub_id,t);
    perform app.need(slot is not null,'PARKING_FULL');
    insert into app.parking_sessions values(app.new_id('visit'),rid,slot,t,null,'Active') returning * into visit;
    update app.parking_reservations set status='Checked In' where reservation_id=rid;
    return jsonb_build_object('sessionId',visit.session_id,'parkingSpaceId',slot,'reservationId',rid,'status','Checked In');
  elsif op in ('parking.cancel','parking.checkOut') then
    if (op='parking.cancel' and b.status='Cancelled') or (op='parking.checkOut' and b.status='Completed') then
      return app.parking_details(p,rid);
    end if;
    perform app.need((op='parking.cancel' and b.status='Confirmed' and t<b.expires_at)
      or (op='parking.checkOut' and b.status='Checked In'),'INVALID_BOOKING_TRANSITION');
    if d ? 'expectedSummary' then
      perform app.need(d->>'expectedSummary'=app.parking_details(p,rid)->>'summaryVersion','PARKING_SUMMARY_CHANGED');
    end if;
    perform app.need(not exists(select from app.charging_sessions s join app.charging_requests r using(request_id)
      where r.parking_reservation_id=rid and s.ended_at is null),'STOP_CHARGING_FIRST');
    perform app.need(op<>'parking.cancel' or visit.status is distinct from 'Active','PARKING_NOT_CANCELLABLE');
    perform app.cancel_booking_requests(rid,t);
    if op='parking.checkOut' then
      update app.parking_sessions set status='Closed',actual_departure=t where reservation_id=rid and status='Active';
      perform app.need(found,'PARKING_NOT_ACTIVE');
    end if;
    delete from app.parking_reservation_slots where reservation_id=rid;
    update app.parking_reservations set status=case op when 'parking.cancel' then 'Cancelled' else 'Completed' end where reservation_id=rid;
    perform app.promote(t);
    return app.parking_details(p,rid);
  end if;
  raise exception 'UNKNOWN_OPERATION';
end $$;

create or replace function app.mobility_action(p app.profiles,op text,d jsonb,t timestamptz)
returns jsonb language plpgsql set search_path = '' as $$
declare v app.vehicles; rr app.rental_reservations; trip app.rental_trips;
  h text:=d->>'hubId'; vid text:=d->>'vehicleId'; rid text:=d->>'reservationId'; slot text; generated text;
begin
  perform app.need(p.role='student','FORBIDDEN');
  if op like 'parking.%' then
    return app.parking_action(p,op,d,t);
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


create or replace function app.reconcile(p_now timestamptz) returns void language plpgsql set search_path = '' as $$
declare row_id text;
begin
  with expired as (
    update app.rental_reservations set status='EXPIRED' where status='CONFIRMED' and expires_at<=p_now returning vehicle_id
  )
  update app.vehicles set status=case when condition='OPERATIONAL' then 'AVAILABLE' else 'UNDER_MAINTENANCE' end
    where status='RESERVED' and vehicle_id in (select vehicle_id from expired);
  perform app.parking_expire(p_now);
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


create or replace function app.command_for_profile(p app.profiles,p_operation text,p_input jsonb,p_command_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare t app.demo_state; previous app.command_receipts; result jsonb; err text;
begin
  perform app.need(p.user_id is not null,'AUTH_REQUIRED');
  select * into t from app.demo_state where singleton for update;
  perform app.need(t.singleton,'DEMO_NOT_INITIALIZED');
  perform app.need(p_command_id is not null and coalesce(jsonb_typeof(p_input),'null')='object','INVALID_COMMAND');
  select * into previous from app.command_receipts where actor_id=p.user_id and operation=p_operation and command_id=p_command_id;
  if previous.command_id is not null then
    perform app.need(previous.input=p_input,'COMMAND_CONFLICT');
    return previous.result;
  end if;

  if p_operation not in ('demo.advance','demo.reset') then
    perform app.parking_expire(t.demo_time);
  end if;
  begin
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
  end;
exception when raise_exception then
  return jsonb_build_object('ok',false,'code',sqlerrm);
end $$;


create or replace function app.view_for_profile(p app.profiles,p_view text,p_filter jsonb default '{}'::jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare t app.demo_state; data jsonb; h text:=p_filter->>'hubId'; err text;
begin
  perform app.need(p.user_id is not null,'AUTH_REQUIRED');
  select * into t from app.demo_state where singleton for update;
  perform app.need(t.singleton,'DEMO_NOT_INITIALIZED');
  if p_view in ('parking','parking.review','parking.detail','charging','hubs','network') then
    perform app.parking_expire(t.demo_time);
    select * into t from app.demo_state where singleton;
  end if;
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
  elsif p_view='parking.detail' then
    data:=app.parking_details(p,p_filter->>'reservationId');
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


-- Read endpoints can reconcile overdue parking before returning eligibility.
alter function public.app_view(text,jsonb) volatile;
alter function public.demo_view(text,text,jsonb) volatile;

-- Parking/Charging boundary: expired holds cannot submit, and a stop must
-- resolve the actual assigned session before Parking may release its space.
create or replace function app.charging_action(p app.profiles, op text, d jsonb, t timestamptz)
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
        and b.status in ('Confirmed','Checked In')
        and (b.status<>'Confirmed' or t<b.expires_at)
        and (b.status<>'Checked In' or st>=t),'PARKING_NOT_ELIGIBLE');
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
    perform app.need(exists(select from app.charging_sessions s
      join app.charging_allocations ca on ca.request_id=s.request_id and ca.released_at is null
      join app.charging_points cp on cp.point_id=ca.point_id
      where s.session_id=r.active_session_id and s.request_id=r.request_id and s.ended_at is null
        and s.point_id=ca.point_id and s.vehicle_id=r.vehicle_id and not cp.reconciliation_hold),'RECONCILIATION_REQUIRED');
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
