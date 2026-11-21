create function app.restore_demo() returns void language plpgsql set search_path = '' as $$
begin
  update app.charging_requests set active_session_id=null where active_session_id is not null;
  delete from app.command_receipts;
  delete from app.simulation_recommendations;
  delete from app.simulation_results;
  delete from app.simulation_runs;
  delete from app.simulation_snapshots;
  delete from app.what_if_scenarios;
  delete from app.telemetry_events;
  delete from app.resource_restrictions;
  delete from app.incident_tickets;
  delete from app.redistribution_order_vehicles;
  delete from app.redistribution_orders;
  delete from app.notifications;
  delete from app.charging_allocations;
  delete from app.charging_sessions;
  delete from app.charging_requests;
  delete from app.charging_schedules;
  delete from app.charging_points;
  delete from app.parking_reservation_slots;
  delete from app.parking_sessions;
  delete from app.parking_reservations;
  delete from app.rental_trips;
  delete from app.rental_reservations;
  delete from app.vehicles;
  delete from app.parking_spaces;
  delete from app.hubs;
  insert into app.demo_state(singleton,demo_time) values (true, '2026-10-24T02:00:00Z')
    on conflict(singleton) do update set demo_time=excluded.demo_time, revision=app.demo_state.revision+1;

  insert into app.profiles (user_id, name, role) values
    ('demo-student', 'Demo Student', 'student'),
    ('demo-guest', 'Demo Guest', 'student'),
    ('demo-operator', 'Demo Operator', 'operator') on conflict(user_id) do nothing;
  insert into app.hubs (id, name, area, freshness, latitude, longitude, address) values
    ('ktx-a', 'KTX Khu A', 'Student residences', 'Live', 10.8783, 106.8061, 'KTX Khu A'),
    ('ktx-b', 'KTX Khu B', 'Residential', 'Live', 10.8821, 106.7819, 'KTX Khu B'),
    ('metro', 'Ga Metro ĐHQG', 'Transit gateway', 'Live', 10.8752, 106.8036, 'Ga Metro ĐHQG'),
    ('hcmut', 'Trường ĐH Bách khoa — Dĩ An', 'University · Dĩ An campus', 'Stale', 10.8808, 106.8057, 'Trường ĐH Bách khoa — Dĩ An'),
    ('hcmut-ltk', 'Trường ĐH Bách khoa — Lý Thường Kiệt', 'University · Lý Thường Kiệt campus', 'Live', 10.7732, 106.6583, 'Trường ĐH Bách khoa — Lý Thường Kiệt');
  insert into app.parking_spaces (space_id, hub_id, in_service) values
    ('park-a-01', 'ktx-a', true),
    ('park-a-02', 'ktx-a', true),
    ('park-a-03', 'ktx-a', true),
    ('park-b-01', 'ktx-b', true),
    ('park-metro-01', 'metro', true),
    ('park-hcmut-01', 'hcmut', true),
    ('park-hcmut-ltk-01', 'hcmut-ltk', true),
    ('park-a-04', 'ktx-a', true),
    ('park-b-02', 'ktx-b', true),
    ('park-hcmut-02', 'hcmut', true);
  insert into app.vehicles (vehicle_id, kind, name, vehicle_type, charging_vehicle_type, student_id, current_hub_id, parking_space_id, battery_level, status, condition, last_updated) values
    ('rental-a-01', 'SHARED', 'Campus e-bike', 'ELECTRIC_BICYCLE', 'MOTORCYCLE', null, 'ktx-a', 'park-a-01', 82, 'AVAILABLE', 'OPERATIONAL', '2026-10-24T02:00:00.000Z'),
    ('private-student-01', 'PRIVATE', 'Demo private EV', 'MOTORCYCLE', 'MOTORCYCLE', 'demo-student', null, null, 25, 'PRIVATE', 'OPERATIONAL', '2026-10-24T02:00:00.000Z'),
    ('private-student-car-01', 'PRIVATE', 'Demo electric car', 'CAR', 'CAR', 'demo-student', null, null, 40, 'PRIVATE', 'OPERATIONAL', '2026-10-24T02:00:00.000Z'),
    ('private-guest-01', 'PRIVATE', 'Guest private EV', 'MOTORCYCLE', 'MOTORCYCLE', 'demo-guest', null, null, 56, 'PRIVATE', 'OPERATIONAL', '2026-10-24T02:00:00.000Z'),
    ('rental-a-02', 'SHARED', 'Campus e-scooter A', 'ELECTRIC_MOTORCYCLE', 'MOTORCYCLE', null, 'ktx-a', 'park-a-04', 72, 'AVAILABLE', 'OPERATIONAL', '2026-10-24T02:00:00.000Z'),
    ('rental-b-01', 'SHARED', 'Campus e-scooter B', 'ELECTRIC_MOTORCYCLE', 'MOTORCYCLE', null, 'ktx-b', 'park-b-01', 72, 'AVAILABLE', 'OPERATIONAL', '2026-10-24T02:00:00.000Z');
  insert into app.parking_reservations (reservation_id, student_id, hub_id, vehicle_id, arrival_time, departure_time, expires_at, status) values
    ('park-booking-guest-01', 'demo-guest', 'ktx-a', 'private-guest-01', '2026-10-24T01:45:00.000Z', '2026-10-24T02:30:00.000Z', '2026-10-24T02:00:00.000Z', 'Checked In');
  insert into app.parking_reservation_slots (reservation_id, slot_start) values
    ('park-booking-guest-01', '2026-10-24T01:45:00.000Z'),
    ('park-booking-guest-01', '2026-10-24T02:00:00.000Z'),
    ('park-booking-guest-01', '2026-10-24T02:15:00.000Z');
  insert into app.parking_sessions (session_id, reservation_id, parking_space_id, actual_arrival, status) values
    ('park-session-guest-01', 'park-booking-guest-01', 'park-a-02', '2026-10-24T01:47:00.000Z', 'Active');
  insert into app.charging_points (point_id, hub_id, charging_vehicle_type, status, status_observed_at, rated_power_kw) values
    ('charge-a-01', 'ktx-a', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-02', 'ktx-a', 'MOTORCYCLE', 'Faulty', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-03', 'ktx-a', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-04', 'ktx-a', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-05', 'ktx-a', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-06', 'ktx-a', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-07', 'ktx-a', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-08', 'ktx-a', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-09', 'ktx-a', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-10', 'ktx-a', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-11', 'ktx-a', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-a-12', 'ktx-a', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-01', 'ktx-b', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-02', 'ktx-b', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-03', 'ktx-b', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-04', 'ktx-b', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-05', 'ktx-b', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-06', 'ktx-b', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-07', 'ktx-b', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-08', 'ktx-b', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-09', 'ktx-b', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-10', 'ktx-b', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-11', 'ktx-b', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-b-12', 'ktx-b', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-01', 'metro', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-02', 'metro', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-03', 'metro', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-04', 'metro', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-05', 'metro', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-06', 'metro', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-07', 'metro', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-08', 'metro', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-09', 'metro', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-10', 'metro', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-11', 'metro', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-metro-12', 'metro', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-01', 'hcmut', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-02', 'hcmut', 'MOTORCYCLE', 'Maintenance', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-03', 'hcmut', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-04', 'hcmut', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-05', 'hcmut', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-06', 'hcmut', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-07', 'hcmut', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-08', 'hcmut', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-09', 'hcmut', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-10', 'hcmut', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-11', 'hcmut', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-12', 'hcmut', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-01', 'hcmut-ltk', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-02', 'hcmut-ltk', 'MOTORCYCLE', 'Faulty', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-03', 'hcmut-ltk', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-04', 'hcmut-ltk', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-05', 'hcmut-ltk', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-06', 'hcmut-ltk', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-07', 'hcmut-ltk', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-08', 'hcmut-ltk', 'MOTORCYCLE', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-09', 'hcmut-ltk', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-10', 'hcmut-ltk', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-11', 'hcmut-ltk', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7),
    ('charge-hcmut-ltk-12', 'hcmut-ltk', 'CAR', 'Operational', '2026-10-24T02:00:00.000Z', 7);
  insert into app.charging_requests (request_id, hub_id, vehicle_id, student_id, parking_reservation_id, charging_vehicle_type, submitted_at, accepted_at, requested_start, requested_end, current_battery_percent, target_battery_percent, estimated_energy_kwh, estimated_duration_minutes, status, started_at, ended_at, final_battery_percent) values
    ('charge-request-demo-history', 'ktx-a', 'rental-a-01', 'demo-operator', null, 'MOTORCYCLE', '2026-10-23T01:55:00.000Z', '2026-10-23T01:55:00.000Z', '2026-10-23T02:00:00.000Z', '2026-10-23T02:45:00.000Z', 76, 79, 1.2, 11, 'Completed', '2026-10-23T02:00:00.000Z', '2026-10-23T02:32:00.000Z', 79),
    ('charge-request-demo-morning', 'ktx-a', 'rental-a-01', 'demo-operator', null, 'MOTORCYCLE', '2026-10-24T00:55:00.000Z', '2026-10-24T00:55:00.000Z', '2026-10-24T01:00:00.000Z', '2026-10-24T01:45:00.000Z', 79, 82, 1.2, 11, 'Completed', '2026-10-24T01:00:00.000Z', '2026-10-24T01:32:00.000Z', 82),
    ('charge-request-guest-01', 'ktx-a', 'private-guest-01', 'demo-guest', 'park-booking-guest-01', 'MOTORCYCLE', '2026-10-24T01:47:00.000Z', '2026-10-24T01:47:00.000Z', '2026-10-24T01:50:00.000Z', '2026-10-24T02:30:00.000Z', 56, 60, 1.6, 14, 'Charging', '2026-10-24T01:50:00.000Z', null, null);
  insert into app.charging_schedules (schedule_id, hub_id, generated_at, version) values
    ('charge-schedule-a-01', 'ktx-a', '2026-10-24T01:50:00.000Z', 1);
  insert into app.charging_allocations (allocation_id, schedule_id, request_id, point_id, start_time, end_time) values
    ('charge-allocation-guest-01', 'charge-schedule-a-01', 'charge-request-guest-01', 'charge-a-01', '2026-10-24T01:50:00.000Z', '2026-10-24T02:30:00.000Z');
  insert into app.charging_sessions (session_id, request_id, point_id, vehicle_id, started_at, ended_at, last_event_at) values
    ('charge-session-demo-history', 'charge-request-demo-history', 'charge-a-01', 'rental-a-01', '2026-10-23T02:00:00.000Z', '2026-10-23T02:32:00.000Z', '2026-10-23T02:32:00.000Z'),
    ('charge-session-demo-morning', 'charge-request-demo-morning', 'charge-a-01', 'rental-a-01', '2026-10-24T01:00:00.000Z', '2026-10-24T01:32:00.000Z', '2026-10-24T01:32:00.000Z'),
    ('charge-session-guest-01', 'charge-request-guest-01', 'charge-a-01', 'private-guest-01', '2026-10-24T01:50:00.000Z', null, '2026-10-24T01:50:00.000Z');
  update app.charging_requests r set active_session_id=s.session_id from app.charging_sessions s where s.request_id=r.request_id;
end;
$$;
