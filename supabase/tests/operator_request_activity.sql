begin;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000008',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select app.restore_demo();

do $$
declare result jsonb; ops jsonb; student jsonb; booking text; request text; draft jsonb;
begin
  draft:='{"hubId":"metro","vehicleId":"private-student-car-01","arrivalTime":"2026-10-24T02:00:00Z","departureTime":"2026-10-24T03:00:00Z"}';
  result:=public.demo_command('student','parking.reserve',draft,gen_random_uuid());
  perform app.need(result->>'ok'='true','PARKING_ACTIVITY_BOOKING_FAILED');
  booking:=result#>>'{data,reservationId}';
  ops:=public.demo_view('operator','charging')#>'{data}';
  perform app.need(exists(select from jsonb_array_elements(ops->'parkingBookings') b
    where b->>'reservationId'=booking and b->>'hubId'='metro' and b->>'vehicleName'='Demo electric car'
      and b->>'status'='Confirmed' and b->>'createdAt' is not null),'OPERATOR_MISSING_BOOKING');
  perform app.need(not exists(select from jsonb_array_elements(ops->'chargingRequests') r
    where r->>'parking_reservation_id'=booking),'PARKING_BOOKING_CREATED_CHARGING_REQUEST');
  perform app.need(public.demo_view('student','charging')->>'code'='FORBIDDEN','OPERATOR_ACTIVITY_EXPOSED_TO_STUDENT');

  result:=public.demo_command('student','charging.submit',jsonb_build_object(
    'hubId','metro','vehicleId','private-student-car-01','parkingReservationId',booking,
    'requestedStart','2026-10-24T02:00:00Z','requestedEnd','2026-10-24T03:00:00Z','targetBatteryPercent',75),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Scheduled','CHARGING_ACTIVITY_NOT_SCHEDULED');
  request:=result#>>'{data,requestId}';
  ops:=public.demo_view('operator','charging')#>'{data}';
  student:=public.demo_view('student','parking')#>'{data}';
  perform app.need(ops->'chargingRequests' @> jsonb_build_array(jsonb_build_object(
    'request_id',request,'parking_reservation_id',booking,'parkingStatus','Confirmed','status','Scheduled'))
    and student->'chargingRequests' @> jsonb_build_array(jsonb_build_object('request_id',request,'status','Scheduled')),
    'OPERATOR_AND_STUDENT_SEE_DIFFERENT_REQUEST');

  result:=public.demo_command('student','parking.checkIn',jsonb_build_object('reservationId',booking),gen_random_uuid());
  perform app.need(result->>'ok'='true','CHECK_IN_FOR_ACTIVITY_FAILED');
  ops:=public.demo_view('operator','charging')#>'{data}';
  perform app.need(ops->'parkingBookings' @> jsonb_build_array(jsonb_build_object('reservationId',booking,'status','Checked In'))
    and ops->'chargingRequests' @> jsonb_build_array(jsonb_build_object('request_id',request,'parkingStatus','Checked In')),
    'CHECK_IN_NOT_REFLECTED_IN_OPERATOR');

  result:=public.demo_command('student','parking.checkOut',jsonb_build_object('reservationId',booking),gen_random_uuid());
  perform app.need(result->>'ok'='true','CHECK_OUT_FOR_ACTIVITY_FAILED');
  ops:=public.demo_view('operator','charging')#>'{data}';
  perform app.need(ops->'parkingBookings' @> jsonb_build_array(jsonb_build_object('reservationId',booking,'status','Completed'))
    and ops->'chargingRequests' @> jsonb_build_array(jsonb_build_object('request_id',request,'status','Cancelled')),
    'CHECK_OUT_NOT_REFLECTED_IN_OPERATOR');

  update app.charging_points set status='Maintenance' where hub_id='metro' and charging_vehicle_type='MOTORCYCLE';
  result:=public.demo_command('student','parking.reserve',draft||'{"vehicleId":"private-student-01"}',gen_random_uuid());
  perform app.need(result->>'ok'='true','WAITLIST_BOOKING_FAILED');
  booking:=result#>>'{data,reservationId}';
  result:=public.demo_command('student','charging.submit',jsonb_build_object(
    'hubId','metro','vehicleId','private-student-01','parkingReservationId',booking,
    'requestedStart','2026-10-24T02:00:00Z','requestedEnd','2026-10-24T03:00:00Z','targetBatteryPercent',75),gen_random_uuid());
  perform app.need(result#>>'{data,status}'='Waiting','FULL_HUB_NOT_WAITLISTED');
  request:=result#>>'{data,requestId}';
  ops:=public.demo_view('operator','charging')#>'{data}';
  perform app.need(ops->'chargingRequests' @> jsonb_build_array(jsonb_build_object(
    'request_id',request,'status','Waiting','queue_position',1,'full',true)),'OPERATOR_MISSING_WAITLIST_POSITION');
end $$;
rollback;
