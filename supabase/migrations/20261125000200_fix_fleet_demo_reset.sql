-- Fleet observations without a Hub must also be cleared by the shared demo reset.
create or replace function app.restore_demo() returns void language plpgsql set search_path='' as $$
begin
  delete from app.fleet_observations where resource_id is not null;
  perform app.restore_demo_before_fleet_final();
end $$;
