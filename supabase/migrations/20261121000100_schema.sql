create schema app;
revoke all on schema app from public, anon, authenticated;
alter default privileges in schema app revoke execute on functions from public;

create table app.profiles (
  user_id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  role text not null check (role in ('student','operator')),
  email text, phone text
);
create table app.hubs (
  id text primary key, name text not null, area text not null, freshness text not null,
  latitude double precision, longitude double precision, address text,
  status text not null default 'Operational' check (status in ('Operational','Maintenance','Offline'))
);
create table app.demo_state (
  singleton boolean primary key default true check (singleton),
  demo_time timestamptz not null, revision bigint not null default 0
);
create table app.parking_spaces (
  space_id text primary key, hub_id text not null references app.hubs, in_service boolean not null default true
);
create table app.vehicles (
  vehicle_id text primary key, kind text not null check (kind in ('SHARED','PRIVATE')), name text not null,
  vehicle_type text not null, charging_vehicle_type text not null check (charging_vehicle_type in ('MOTORCYCLE','CAR')),
  student_id text references app.profiles, current_hub_id text references app.hubs,
  parking_space_id text unique references app.parking_spaces,
  battery_level numeric not null check (battery_level between 0 and 100),
  status text not null check (status in ('AVAILABLE','RESERVED','IN_USE','UNDER_MAINTENANCE','REDISTRIBUTING','PRIVATE')),
  condition text not null default 'OPERATIONAL' check (condition in ('OPERATIONAL','FAULTED')),
  last_updated timestamptz,
  check ((kind = 'PRIVATE') = (student_id is not null))
);
create table app.rental_reservations (
  reservation_id text primary key, student_id text not null references app.profiles,
  vehicle_id text not null references app.vehicles, created_at timestamptz not null, expires_at timestamptz not null,
  status text not null check (status in ('CONFIRMED','PICKED_UP','CANCELLED','EXPIRED'))
);
create unique index rental_one_hold on app.rental_reservations(vehicle_id) where status = 'CONFIRMED';
create table app.rental_trips (
  trip_id text primary key, reservation_id text not null unique references app.rental_reservations,
  student_id text not null references app.profiles, vehicle_id text not null references app.vehicles,
  start_hub_id text not null references app.hubs, end_hub_id text references app.hubs,
  start_time timestamptz not null, end_time timestamptz,
  status text not null check (status in ('ACTIVE','COMPLETED'))
);
create unique index rental_one_trip on app.rental_trips(vehicle_id) where status = 'ACTIVE';
create table app.parking_reservations (
  reservation_id text primary key, student_id text not null references app.profiles,
  hub_id text not null references app.hubs, vehicle_id text not null references app.vehicles,
  arrival_time timestamptz not null, departure_time timestamptz not null,
  grace_minutes integer not null default 15, expires_at timestamptz not null, expired_at timestamptz, expiry_reason text,
  status text not null check (status in ('Confirmed','Checked In','Completed','Cancelled','Expired')),
  check (departure_time > arrival_time)
);
create table app.parking_reservation_slots (
  reservation_id text not null references app.parking_reservations on delete cascade,
  slot_start timestamptz not null, primary key (reservation_id, slot_start)
);
create index parking_slot_time on app.parking_reservation_slots(slot_start);
create table app.parking_sessions (
  session_id text primary key, reservation_id text not null unique references app.parking_reservations,
  parking_space_id text not null references app.parking_spaces,
  actual_arrival timestamptz not null, actual_departure timestamptz,
  status text not null check (status in ('Active','Closed'))
);
create unique index parking_one_visit on app.parking_sessions(parking_space_id) where status = 'Active';

create table app.charging_points (
  point_id text primary key, hub_id text not null references app.hubs,
  charging_vehicle_type text not null check (charging_vehicle_type in ('MOTORCYCLE','CAR')),
  status text not null check (status in ('Operational','Maintenance','Faulty','Unknown')),
  reconciliation_hold boolean not null default false,
  status_observed_at timestamptz not null, rated_power_kw numeric not null check (rated_power_kw > 0)
);
create table app.charging_requests (
  request_id text primary key, hub_id text not null references app.hubs, vehicle_id text not null references app.vehicles,
  student_id text not null references app.profiles, parking_reservation_id text references app.parking_reservations,
  charging_vehicle_type text not null check (charging_vehicle_type in ('MOTORCYCLE','CAR')),
  submitted_at timestamptz not null, accepted_at timestamptz not null,
  requested_start timestamptz not null, requested_end timestamptz not null check (requested_end > requested_start),
  current_battery_percent numeric not null check (current_battery_percent between 0 and 100),
  target_battery_percent numeric not null check (target_battery_percent > current_battery_percent and target_battery_percent <= 100),
  estimated_energy_kwh numeric not null, estimated_duration_minutes integer not null,
  status text not null check (status in ('Waiting','Scheduled','Charging','Suspended','Completed','Cancelled','Expired')),
  started_at timestamptz, ended_at timestamptz, final_battery_percent numeric check (final_battery_percent between 0 and 100),
  active_session_id text, cancel_reason text
);
create unique index charging_one_open_request on app.charging_requests(vehicle_id)
  where status in ('Waiting','Scheduled','Charging','Suspended');
create index charging_queue on app.charging_requests(hub_id, accepted_at, current_battery_percent, request_id)
  where status = 'Waiting';
create table app.charging_schedules (
  schedule_id text primary key, hub_id text not null unique references app.hubs,
  generated_at timestamptz not null, version integer not null
);
create table app.charging_allocations (
  allocation_id text primary key, schedule_id text not null references app.charging_schedules,
  request_id text not null references app.charging_requests, point_id text not null references app.charging_points,
  start_time timestamptz not null, end_time timestamptz not null check (end_time > start_time),
  released_at timestamptz
);
create unique index charging_one_point_commitment on app.charging_allocations(point_id) where released_at is null;
create unique index charging_one_request_commitment on app.charging_allocations(request_id) where released_at is null;
create table app.charging_sessions (
  session_id text primary key, request_id text not null unique references app.charging_requests,
  point_id text not null references app.charging_points, vehicle_id text not null references app.vehicles,
  started_at timestamptz not null, ended_at timestamptz, last_event_at timestamptz not null,
  check (ended_at is null or ended_at >= started_at)
);
alter table app.charging_requests add foreign key (active_session_id) references app.charging_sessions
  deferrable initially deferred;
create table app.notifications (
  notification_id uuid primary key default gen_random_uuid(), user_id text not null references app.profiles,
  request_id text references app.charging_requests, message text not null, created_at timestamptz not null
);
create table app.redistribution_orders (
  order_id text primary key, source_hub_id text not null references app.hubs,
  destination_hub_id text not null references app.hubs check (destination_hub_id <> source_hub_id),
  created_at timestamptz not null,
  status text not null check (status in ('Planned','Dispatched','Partial','AtRisk','Completed','Cancelled'))
);
create table app.redistribution_order_vehicles (
  order_id text not null references app.redistribution_orders, vehicle_id text not null references app.vehicles,
  arrived_at timestamptz, primary key (order_id, vehicle_id)
);
create table app.incident_tickets (
  incident_id text primary key, reporter_id text not null references app.profiles,
  vehicle_id text references app.vehicles, point_id text references app.charging_points,
  description text not null, status text not null check (status in ('Open','Investigating','Resolved','Closed')),
  created_at timestamptz not null, resolved_at timestamptz,
  check (num_nonnulls(vehicle_id, point_id) = 1)
);
create table app.resource_restrictions (
  incident_id text primary key references app.incident_tickets,
  vehicle_id text references app.vehicles, point_id text references app.charging_points, lifted_at timestamptz,
  check (num_nonnulls(vehicle_id, point_id) = 1)
);
create table app.telemetry_events (
  event_id text primary key, source text not null, resource_id text not null,
  kind text not null, observed_at timestamptz not null, payload jsonb not null
);
create table app.what_if_scenarios (
  scenario_id text primary key, name text not null, hub_id text not null references app.hubs,
  kind text not null check (kind in ('Charging surge','Vehicle surge','Point fault','Hub outage')),
  magnitude integer not null check (magnitude > 0),
  horizon_minutes integer not null check (horizon_minutes between 15 and 1440),
  created_at timestamptz not null
);
create table app.simulation_snapshots (
  snapshot_id text primary key, captured_at timestamptz not null, source_revision bigint not null, baseline jsonb not null
);
create table app.simulation_runs (
  run_id text primary key, scenario_id text not null references app.what_if_scenarios,
  snapshot_id text not null references app.simulation_snapshots,
  operator_id text not null references app.profiles, created_at timestamptz not null,
  finished_at timestamptz, status text not null check (status in ('Queued','Running','Completed','Failed')), error text
);
create table app.simulation_results (
  run_id text primary key references app.simulation_runs, metrics jsonb not null
);
create table app.simulation_recommendations (
  run_id text not null references app.simulation_runs, position integer not null, message text not null,
  primary key (run_id, position)
);
create table app.command_receipts (
  actor_id text not null references app.profiles, operation text not null, command_id uuid not null,
  input jsonb not null, result jsonb not null, primary key (actor_id, operation, command_id)
);
