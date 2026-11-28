alter table app.vehicles add column photo_key text;

create function app.seed_demo_vehicle_photos()
returns void language plpgsql set search_path='' as $$
declare demo_now timestamptz;
begin
  select demo_time into demo_now from app.demo_state where singleton for update;
  if not found then return; end if;

  insert into app.parking_spaces (space_id, hub_id) values
    ('park-a-demo-ev', 'ktx-a'),
    ('park-b-demo-ev', 'ktx-b'),
    ('park-hcmut-ltk-demo-ev', 'hcmut-ltk')
  on conflict (space_id) do nothing;

  insert into app.vehicles
    (vehicle_id, kind, name, vehicle_type, charging_vehicle_type, current_hub_id,
     parking_space_id, battery_level, status, last_updated, photo_key)
  values
    ('rental-car-a-01', 'SHARED', 'Wuling Hongguang Mini EV', 'CAR', 'CAR', 'ktx-a',
     'park-a-demo-ev', 86, 'AVAILABLE', demo_now, 'campus-ev-hatchback'),
    ('rental-car-b-01', 'SHARED', 'VinFast VF 5', 'CAR', 'CAR', 'ktx-b',
     'park-b-demo-ev', 68, 'AVAILABLE', demo_now, 'campus-ev-crossover'),
    ('rental-car-ltk-01', 'SHARED', 'BYD Seal', 'CAR', 'CAR', 'hcmut-ltk',
     'park-hcmut-ltk-demo-ev', 74, 'AVAILABLE', demo_now, 'campus-ev-sedan')
  on conflict (vehicle_id) do nothing;

  update app.vehicles v set photo_key = photos.photo_key
  from (values
    ('rental-a-01', 'campus-e-bike'),
    ('rental-a-02', 'campus-e-scooter-a'),
    ('rental-b-01', 'campus-e-scooter-b'),
    ('private-student-01', 'student-e-scooter'),
    ('private-student-car-01', 'student-ev'),
    ('private-guest-01', 'guest-e-scooter'),
    ('private-guest-adjust-car', 'guest-adjust-ev')
  ) as photos(vehicle_id, photo_key)
  where v.vehicle_id = photos.vehicle_id and v.photo_key is null;

  update app.demo_state set revision = revision + 1 where singleton;
end $$;

alter function app.restore_demo() rename to restore_demo_before_vehicle_photos;
create function app.restore_demo()
returns void language plpgsql set search_path='' as $$
begin
  perform app.restore_demo_before_vehicle_photos();
  perform app.seed_demo_vehicle_photos();
end $$;

revoke all on function app.seed_demo_vehicle_photos(), app.restore_demo() from public, anon, authenticated;

select app.seed_demo_vehicle_photos();
