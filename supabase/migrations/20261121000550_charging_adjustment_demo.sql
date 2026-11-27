create function app.seed_charging_adjustment_demo()
returns void language plpgsql set search_path = '' as $$
declare
  demo_now timestamptz;
  parking_start timestamptz;
  parking_end timestamptz;
  schedule_key text;
begin
  select demo_time into demo_now from app.demo_state where singleton for update;
  if demo_now is null
    or exists (select from app.charging_requests where request_id = 'charge-request-demo-adjust')
    or not exists (select from app.hubs where id = 'ktx-a' and status = 'Operational')
    or not exists (select from app.charging_points p where p.point_id = 'charge-a-10' and app.point_available(p))
    or not exists (select from app.charging_points p where p.hub_id = 'ktx-a'
      and p.charging_vehicle_type = 'CAR' and p.point_id <> 'charge-a-10' and app.point_available(p))
    or exists (select from app.charging_requests where hub_id = 'ktx-a' and charging_vehicle_type = 'CAR'
      and status = 'Waiting' and requested_start <= demo_now and requested_end > demo_now)
  then
    return;
  end if;

  parking_start := date_bin(interval '15 minutes', demo_now, timestamptz '2000-01-01 UTC');
  parking_end := parking_start + interval '1 hour';

  insert into app.parking_spaces (space_id, hub_id)
  values ('park-a-demo-adjust', 'ktx-a');

  insert into app.vehicles (vehicle_id, kind, name, vehicle_type, charging_vehicle_type, student_id, battery_level, status, last_updated)
  values ('private-guest-adjust-car', 'PRIVATE', 'Demo adjustment car', 'CAR', 'CAR', 'demo-guest', 40, 'PRIVATE', demo_now);

  insert into app.parking_reservations (reservation_id, student_id, hub_id, vehicle_id, arrival_time, departure_time, expires_at, status)
  values ('park-booking-demo-adjust', 'demo-guest', 'ktx-a', 'private-guest-adjust-car',
    parking_start, parking_end, parking_start + interval '15 minutes', 'Checked In');

  insert into app.parking_reservation_slots (reservation_id, slot_start)
  select 'park-booking-demo-adjust', slot_start
  from generate_series(parking_start, parking_end - interval '15 minutes', interval '15 minutes') as slot_start;

  insert into app.parking_sessions (session_id, reservation_id, parking_space_id, actual_arrival, status)
  values ('park-session-demo-adjust', 'park-booking-demo-adjust', 'park-a-demo-adjust', demo_now, 'Active');

  insert into app.charging_requests (request_id, hub_id, vehicle_id, student_id, parking_reservation_id, charging_vehicle_type,
    submitted_at, accepted_at, requested_start, requested_end, current_battery_percent, target_battery_percent,
    estimated_energy_kwh, estimated_duration_minutes, status)
  values ('charge-request-demo-adjust', 'ktx-a', 'private-guest-adjust-car', 'demo-guest', 'park-booking-demo-adjust', 'CAR',
    demo_now, clock_timestamp(), demo_now, parking_end, 40, 60, 8, 69, 'Scheduled');

  schedule_key := app.touch_schedule('ktx-a', demo_now);
  insert into app.charging_allocations (allocation_id, schedule_id, request_id, point_id, start_time, end_time)
  values ('charge-allocation-demo-adjust', schedule_key, 'charge-request-demo-adjust', 'charge-a-10', demo_now, parking_end);

  update app.demo_state set revision = revision + 1 where singleton;
end $$;

alter function app.restore_demo() rename to restore_demo_base;

create function app.restore_demo()
returns void language plpgsql set search_path = '' as $$
begin
  perform app.restore_demo_base();
  perform app.seed_charging_adjustment_demo();
end $$;

select app.seed_charging_adjustment_demo();
