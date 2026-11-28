-- Extend the shared Hub read model with observations and bookable vehicle types.
alter function app.view_for_profile(app.profiles,text,jsonb) rename to view_before_hub_identity;
create function app.view_for_profile(p app.profiles,p_view text,p_filter jsonb default '{}')
returns jsonb language plpgsql volatile set search_path='' as $$
declare result jsonb; hubs jsonb; demo_now timestamptz;
begin
  result := app.view_before_hub_identity(p,p_view,p_filter);
  if p_view is distinct from 'hubs' or result->>'ok' is distinct from 'true' then return result; end if;
  demo_now := (result#>>'{data,demoTime}')::timestamptz;

  select app.list_json(jsonb_agg(entry.hub || jsonb_build_object(
    'freshness',case
      when observations.oldest is null then 'Unavailable'
      when entry.hub->>'freshness'='Stale'
        or observations.oldest<=demo_now-make_interval(mins=>policy.stale_minutes) then 'Stale'
      else 'Live' end,
    'lastObservedAt',observations.latest,
    'vehicleBatteries',fleet.vehicles,
    'parkingDiscrepancy',parking.discrepancy
  ) order by entry.position))
  into hubs
  from jsonb_array_elements(result#>'{data,hubs}') with ordinality as entry(hub, position)
  cross join app.fleet_policy policy
  cross join lateral (
    select min(status_observed_at) as oldest, max(status_observed_at) as latest
    from app.charging_points where hub_id=entry.hub->>'id'
  ) observations
  cross join lateral (
    select app.list_json(jsonb_agg(jsonb_build_object(
      'vehicleId',v.vehicle_id,'name',v.name,'vehicleType',v.vehicle_type,'batteryLevel',v.battery_level
    ) order by v.name,v.vehicle_id)) as vehicles
    from app.vehicles v
    where v.current_hub_id=entry.hub->>'id' and v.kind='SHARED'
      and v.status='AVAILABLE' and v.condition='OPERATIONAL'
      and entry.hub->>'status'='Operational'
      and not exists(select from app.charging_requests r where r.vehicle_id=v.vehicle_id
        and r.status in ('Waiting','Scheduled','Charging','Suspended'))
  ) fleet
  left join app.fleet_observations parking
    on parking.resource_type='parking' and parking.resource_id=entry.hub->>'id';

  return jsonb_set(result,'{data,hubs}',hubs);
end $$;

create or replace function public.demo_view(p_role text,p_view text,p_filter jsonb default '{}')
returns jsonb language sql volatile security definer set search_path='' as $$
  select app.view_for_profile(app.demo_actor(p_role),p_view,p_filter)
$$;

-- Validate contact details before the existing owner-scoped, idempotent update.
alter function app.command_for_profile(app.profiles,text,jsonb,uuid) rename to command_before_hub_identity;
create function app.command_for_profile(p app.profiles,p_operation text,p_input jsonb,p_command_id uuid)
returns jsonb language plpgsql set search_path='' as $$
declare email text := nullif(btrim(p_input->>'email'),''); phone text := nullif(btrim(p_input->>'phone'),'');
begin
  if p.user_id is not null and p_operation='identity.profile' and jsonb_typeof(p_input)='object' then
    if (p_input ? 'email' and jsonb_typeof(p_input->'email') not in ('string','null'))
      or (p_input ? 'phone' and jsonb_typeof(p_input->'phone') not in ('string','null'))
      or length(email)>160 or length(phone)>32
      or email !~ '^[^[:space:]@]+@[^[:space:]@.]+([.][^[:space:]@.]+)+$'
      or phone !~ '^[+0-9 ()-]+$'
      or length(regexp_replace(phone,'[^0-9]','','g')) not between 8 and 18
    then
      return jsonb_build_object('ok',false,'code','INVALID_PROFILE');
    end if;
  end if;
  return app.command_before_hub_identity(p,p_operation,p_input,p_command_id);
end $$;

create or replace function public.demo_command(p_role text,p_operation text,p_input jsonb,p_command_id uuid)
returns jsonb language sql security definer set search_path='' as $$
  select case when p_operation like 'simulation.%'
    then app.what_if_command(app.demo_actor(p_role),p_operation,p_input,p_command_id)
    else app.command_for_profile(app.demo_actor(p_role),p_operation,p_input,p_command_id)
  end
$$;

revoke all on function app.view_for_profile(app.profiles,text,jsonb), app.command_for_profile(app.profiles,text,jsonb,uuid)
  from public,anon,authenticated;
