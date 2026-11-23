-- Parking integration checks use the same authenticated RPCs as the browser.
begin;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select app.restore_demo();

do $$
declare result jsonb; draft jsonb; review jsonb; booking text; other text; request text; snapshot jsonb;
  detail jsonb; original jsonb; key uuid; visits bigint; free_before bigint; revision_before bigint;
begin
  draft:='{"hubId":"ktx-a","vehicleId":"private-student-01","arrivalTime":"2026-10-24T02:00:00Z","departureTime":"2026-10-24T03:00:00Z"}';
  -- Review does not allocate. Both invalid grid points and reversed windows fail.
  visits:=(select count(*) from app.parking_reservation_slots);
  result:=public.demo_view('student','parking.review',draft);
  perform app.need(result#>>'{data,available}'='true' and jsonb_array_length(result#>'{data,slots}')=4,'REVIEW_ALL_SLOTS');
  perform app.need(result#>>'{data,expiresAt}'='2026-10-24T02:15:00+00:00','DEADLINE');
  perform app.need((select count(*)=visits from app.parking_reservation_slots),'REVIEW_ALLOCATED');
  perform app.need(public.demo_view('student','parking.review',draft||'{"arrivalTime":"2026-10-24T02:07:00Z"}')->>'code'='INVALID_PARKING_WINDOW','GRID');
  perform app.need(public.demo_view('student','parking.review',draft||'{"departureTime":"2026-10-24T01:00:00Z"}')->>'code'='INVALID_PARKING_WINDOW','REVERSED');
  perform app.need(public.demo_view('operator','parking.review',draft)->>'code'='FORBIDDEN','OPERATOR_REVIEW');
  perform app.need(public.demo_view('student','parking.detail','{"reservationId":"park-booking-guest-01"}')->>'code'='BOOKING_NOT_FOUND','FOREIGN_TICKET');
  perform app.need(public.demo_command('student','parking.checkIn','{"reservationId":"park-booking-guest-01"}',gen_random_uuid())->>'code'='BOOKING_NOT_FOUND','FOREIGN_CHECKIN');

  -- A competing booking takes just one slot after the review.
  result:=public.demo_command('student','parking.reserve',draft||'{"vehicleId":"private-student-car-01","arrivalTime":"2026-10-24T02:30:00Z","departureTime":"2026-10-24T02:45:00Z"}',gen_random_uuid());
  other:=result#>>'{data,reservationId}';
  perform app.need(other is not null,result::text);
  result:=public.demo_command('student','parking.reserve',draft,gen_random_uuid());
  perform app.need(result->>'code'='PARKING_FULL','PARTIAL_INTERVAL_ACCEPTED');
  perform app.need(not exists(select from app.parking_reservations where vehicle_id='private-student-01'),'PARTIAL_BOOKING');
  perform app.need((select count(*)=1 from app.parking_reservation_slots where reservation_id=other),'COMPETING_HOLD_LOST');
  perform app.need(public.demo_command('student','parking.cancel',jsonb_build_object('reservationId',other),gen_random_uuid())->>'ok'='true','CANCEL_COMPETITOR');

  -- The original receipt and a fresh action on the same visit both avoid duplicates.
  key:=gen_random_uuid();
  original:=public.demo_command('student','parking.reserve',draft,key);
  booking:=original#>>'{data,reservationId}';
  perform app.need(booking is not null,original::text);
  perform app.need(public.demo_command('student','parking.reserve',draft,key)=original,'RESERVE_RETRY');
  perform app.need(public.demo_command('student','parking.reserve',draft||'{"hubId":"ktx-b"}',key)->>'code'='COMMAND_CONFLICT','KEY_CONFLICT');
  perform app.need((select count(*)=4 from app.parking_reservation_slots where reservation_id=booking),'MISSING_SLOTS');
  perform app.need(public.demo_command('student','parking.checkIn',jsonb_build_object('reservationId',booking,'vehicleId','wrong'),gen_random_uuid())->>'code'='ARRIVAL_MISMATCH','MISMATCH');
  free_before:=(select parking_free from app.hub_summary where id='ktx-a');
  update app.demo_state set demo_time='2026-10-24T02:14:59Z';
  result:=public.demo_command('student','parking.checkIn',jsonb_build_object('reservationId',booking),gen_random_uuid());
  perform app.need(result->>'ok'='true',result::text);
  perform app.need(public.demo_command('student','parking.checkIn',jsonb_build_object('reservationId',booking),gen_random_uuid())=result,'REPEAT_CHECKIN');
  perform app.need((select count(*)=1 from app.parking_sessions where reservation_id=booking),'DOUBLE_VISIT');
  perform app.need((select parking_free=free_before-1 from app.hub_summary where id='ktx-a'),'DOUBLE_OCCUPANCY');
  perform app.need(app.parking_slot_used('ktx-a','2026-10-24T02:15:00Z')=(select count(*) from app.parking_spaces where hub_id='ktx-a' and in_service),'DOUBLE_HOLD');
  perform app.need((select actual_arrival='2026-10-24T02:14:59Z' from app.parking_sessions where reservation_id=booking),'ROUNDED_ARRIVAL');
  update app.demo_state set demo_time='2026-10-24T03:01:00Z';
  perform public.demo_view('student','parking');
  perform app.need((select status='Checked In' from app.parking_reservations where reservation_id=booking),'EXPIRED_ACTIVE_VISIT');
  perform app.need(app.free_space('ktx-a','2026-10-24T03:01:00Z',true) is null,'OVERSTAY_CAPACITY_RELEASED');
  result:=public.demo_command('student','parking.checkOut',jsonb_build_object('reservationId',booking),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Completed',result::text);
  perform app.need(public.demo_command('student','parking.checkOut',jsonb_build_object('reservationId',booking),gen_random_uuid())=result,'REPEAT_CHECKOUT');
  perform app.need(not exists(select from app.parking_reservation_slots where reservation_id=booking),'LEFTOVER_HOLDS');

  -- Read reconciliation expires a due reservation and releases Scheduled charging.
  perform app.restore_demo();
  draft:=draft||'{"vehicleId":"private-student-car-01"}';
  result:=public.demo_command('student','parking.reserve',draft,gen_random_uuid());
  booking:=result#>>'{data,reservationId}';
  detail:=public.demo_view('student','parking.detail',jsonb_build_object('reservationId',booking))#>'{data}';
  result:=public.demo_command('student','charging.submit',jsonb_build_object('parkingReservationId',booking,'vehicleId','private-student-car-01',
    'hubId','ktx-a','targetBatteryPercent',80,'requestedStart','2026-10-24T02:00:00Z','requestedEnd','2026-10-24T03:00:00Z'),gen_random_uuid());
  request:=result#>>'{data,requestId}';
  perform app.need(result#>>'{data,status}'='Scheduled',result::text);
  result:=public.demo_command('student','parking.cancel',jsonb_build_object('reservationId',booking,'expectedSummary',detail->>'summaryVersion'),gen_random_uuid());
  perform app.need(result->>'code'='PARKING_SUMMARY_CHANGED','STALE_CONFIRMATION');
  update app.demo_state set demo_time='2026-10-24T02:15:00Z';
  result:=public.demo_command('student','parking.checkIn',jsonb_build_object('reservationId',booking),gen_random_uuid());
  perform app.need(result->>'code'='CHECK_IN_WINDOW_CLOSED','EXACT_DEADLINE_ADMITTED');
  perform app.need((select status='Expired' and expired_at=expires_at and expiry_reason='NoShow' from app.parking_reservations where reservation_id=booking),'EXPIRY_ROLLED_BACK_ON_REJECTION');
  perform app.need((select status='Cancelled' from app.charging_requests where request_id=request),'EXPIRED_CHARGING_LIVE');
  perform app.need(not exists(select from app.charging_allocations where request_id=request and released_at is null),'EXPIRED_POINT_HELD');
  perform app.need(not exists(select from app.parking_sessions where reservation_id=booking),'NO_SHOW_VISIT');
  perform app.need(not exists(select from app.parking_reservation_slots where reservation_id=booking),'EXPIRED_SLOTS_HELD');
  revision_before:=(select revision from app.demo_state);
  perform public.demo_view('student','parking');
  perform public.demo_view('student','parking');
  perform app.need((select revision=revision_before from app.demo_state),'EXPIRY_REPEATED');

  -- Cancellation cascades through the owner's Charging helper, with current summary.
  perform app.restore_demo();
  result:=public.demo_command('student','parking.reserve',draft,gen_random_uuid());
  booking:=result#>>'{data,reservationId}';
  result:=public.demo_command('student','charging.submit',jsonb_build_object('parkingReservationId',booking,'vehicleId','private-student-car-01',
    'hubId','ktx-a','targetBatteryPercent',80,'requestedStart','2026-10-24T02:07:00Z','requestedEnd','2026-10-24T03:00:00Z'),gen_random_uuid());
  request:=result#>>'{data,requestId}';
  perform app.need(result#>>'{data,status}'='Waiting',result::text);
  detail:=public.demo_view('student','parking.detail',jsonb_build_object('reservationId',booking))#>'{data}';
  result:=public.demo_command('student','parking.cancel',jsonb_build_object('reservationId',booking,'expectedSummary',detail->>'summaryVersion'),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Cancelled',result::text);
  perform app.need((select status='Cancelled' from app.charging_requests where request_id=request),'WAITING_NOT_CANCELLED');
  perform app.need(public.demo_command('student','parking.cancel',jsonb_build_object('reservationId',booking),gen_random_uuid())=result,'REPEAT_CANCEL');

  -- One-slot windows cap expiry and future check-in is rejected.
  perform app.restore_demo();
  draft:=draft||'{"arrivalTime":"2026-10-24T02:30:00Z","departureTime":"2026-10-24T02:45:00Z"}';
  result:=public.demo_command('student','parking.reserve',draft,gen_random_uuid());
  booking:=result#>>'{data,reservationId}';
  perform app.need((select expires_at=departure_time from app.parking_reservations where reservation_id=booking),'UNCAPPED_EXPIRY');
  perform app.need(public.demo_command('student','parking.checkIn',jsonb_build_object('reservationId',booking),gen_random_uuid())->>'code'='CHECK_IN_WINDOW_CLOSED','EARLY_ADMISSION');
  update app.demo_state set demo_time='2026-10-24T02:45:00Z';
  result:=public.demo_view('student','parking.detail',jsonb_build_object('reservationId',booking));
  perform app.need(result#>>'{data,status}'='Expired','READ_EXPIRY');

  -- Checkout refuses an unverified charging stop and releases all future holds on success.
  perform app.restore_demo();
  draft:=draft||'{"arrivalTime":"2026-10-24T02:00:00Z","departureTime":"2026-10-24T03:00:00Z"}';
  result:=public.demo_command('student','parking.reserve',draft,gen_random_uuid());
  booking:=result#>>'{data,reservationId}';
  perform public.demo_command('student','parking.checkIn',jsonb_build_object('reservationId',booking),gen_random_uuid());
  result:=public.demo_command('student','charging.submit',jsonb_build_object('parkingReservationId',booking,'vehicleId','private-student-car-01',
    'hubId','ktx-a','targetBatteryPercent',80,'requestedStart','2026-10-24T02:00:00Z','requestedEnd','2026-10-24T03:00:00Z'),gen_random_uuid());
  request:=result#>>'{data,requestId}';
  select point_id into other from app.charging_allocations where request_id=request and released_at is null;
  result:=public.demo_command('operator','charging.event',jsonb_build_object('requestId',request,'kind','START','eventId','parking-start',
    'vehicleId','private-student-car-01','pointId',other),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Charging',result::text);
  update app.charging_points set reconciliation_hold=true where point_id=other;
  result:=public.demo_command('student','charging.stop',jsonb_build_object('requestId',request,'choice','COMPLETE'),gen_random_uuid());
  perform app.need(result->>'code'='RECONCILIATION_REQUIRED','UNVERIFIED_STOP_ACCEPTED');
  result:=public.demo_command('student','parking.checkOut',jsonb_build_object('reservationId',booking),gen_random_uuid());
  perform app.need(result->>'code'='STOP_CHARGING_FIRST','ACTIVE_CHECKOUT');
  perform app.need((select count(*)=4 from app.parking_reservation_slots where reservation_id=booking),'PARTIAL_CHECKOUT');
  perform app.need((select status='Active' from app.parking_sessions where reservation_id=booking),'CLOSED_WITH_ACTIVE_CHARGING');
  update app.charging_points set reconciliation_hold=false where point_id=other;
  result:=public.demo_command('student','charging.stop',jsonb_build_object('requestId',request,'choice','COMPLETE'),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Completed',result::text);
  update app.demo_state set demo_time='2026-10-24T02:07:23Z';
  detail:=public.demo_view('student','parking.detail',jsonb_build_object('reservationId',booking))#>'{data}';
  result:=public.demo_command('student','parking.checkOut',jsonb_build_object('reservationId',booking,'expectedSummary',detail->>'summaryVersion'),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Completed',result::text);
  perform app.need((select actual_departure='2026-10-24T02:07:23Z' from app.parking_sessions where reservation_id=booking),'ROUNDED_DEPARTURE');
  perform app.need(not exists(select from app.parking_reservation_slots where reservation_id=booking),'EARLY_CHECKOUT_HOLDS');
  perform app.need(not exists(select from app.charging_allocations where request_id=request and released_at is null),'EARLY_CHECKOUT_CHARGER');

  -- A contradictory active session defers no-show cleanup and keeps capacity.
  perform app.restore_demo();
  draft:=draft||'{"arrivalTime":"2026-10-24T02:00:00Z","departureTime":"2026-10-24T03:00:00Z"}';
  result:=public.demo_command('student','parking.reserve',draft,gen_random_uuid());
  booking:=result#>>'{data,reservationId}';
  insert into app.parking_sessions values('inconsistent-visit',booking,'park-a-03','2026-10-24T02:01:00Z',null,'Active');
  update app.demo_state set demo_time='2026-10-24T02:15:00Z';
  perform public.demo_view('student','parking');
  perform app.need((select status='Confirmed' from app.parking_reservations where reservation_id=booking),'INCONSISTENCY_RELEASED');
  perform app.need((select count(*)=4 from app.parking_reservation_slots where reservation_id=booking),'INCONSISTENT_HOLDS_RELEASED');
  result:=public.demo_command('student','charging.submit',jsonb_build_object('parkingReservationId',booking,'vehicleId','private-student-car-01',
    'hubId','ktx-a','targetBatteryPercent',80,'requestedStart','2026-10-24T02:15:00Z','requestedEnd','2026-10-24T03:00:00Z'),gen_random_uuid());
  perform app.need(result->>'code'='PARKING_NOT_ELIGIBLE','OVERDUE_CHARGING_ACCEPTED');
end $$;
rollback;
