-- Compose Fleet observation guards and enriched views with the Parking lifecycle.
-- Both earlier migrations remain intact for databases that already applied them.
alter function app.free_space(text,timestamptz,boolean) rename to free_space_parking_final;
create function app.free_space(p_hub text,p_now timestamptz,p_keep boolean default false) returns text
language sql stable set search_path='' as $$
  select app.free_space_parking_final(p_hub,p_now,p_keep)
  where not exists(select from app.fleet_observations where resource_type='parking' and resource_id=p_hub and discrepancy is not null)
$$;
alter function app.parking_review(app.profiles,text,text,timestamptz,timestamptz,timestamptz) rename to parking_review_parking_final;
create function app.parking_review(p app.profiles,p_hub text,p_vehicle text,p_start timestamptz,p_end timestamptz,p_now timestamptz)
returns jsonb language plpgsql stable set search_path='' as $$
begin
  perform app.need(not exists(select from app.fleet_observations where resource_type='parking' and resource_id=p_hub and discrepancy is not null),'PARKING_RECONCILIATION_REQUIRED');
  return app.parking_review_parking_final(p,p_hub,p_vehicle,p_start,p_end,p_now);
end $$;


alter function app.view_for_profile(app.profiles,text,jsonb) rename to view_parking_final;
create function app.view_for_profile(p app.profiles,p_view text,p_filter jsonb default '{}') returns jsonb
language plpgsql volatile set search_path='' as $$
declare result jsonb; data jsonb; t app.demo_state; err text;
begin
  if p_view not in ('network','fleet','incidents','fleet.validate') then return app.view_parking_final(p,p_view,p_filter); end if;
  perform app.need(p.user_id is not null,'AUTH_REQUIRED');
  perform app.need(p.role='operator','FORBIDDEN');
  select * into t from app.demo_state where singleton for update;
  perform app.parking_expire(t.demo_time);
  select * into t from app.demo_state where singleton;
  if p_view='fleet.validate' then data:=app.fleet_proposal(p_filter,t.demo_time);
  else
    result:=app.view_parking_final(p,'fleet',p_filter);
    if result->>'ok'<>'true' then return result; end if;
    data:=result->'data';
    data:=data||jsonb_build_object(
      'hubs',app.list_json((select jsonb_agg(to_jsonb(h)||jsonb_build_object(
        'lastObservedAt',(select max(c.status_observed_at) from app.charging_points c where c.hub_id=h.id),
        'freshness',case when (select min(c.status_observed_at) from app.charging_points c where c.hub_id=h.id) > t.demo_time-make_interval(mins=>f.stale_minutes) then 'Live' else 'Stale' end,
        'parkingDiscrepancy',(select discrepancy from app.fleet_observations where resource_type='parking' and resource_id=h.id)) order by h.id)
        from app.hub_summary h cross join app.fleet_policy f)),
      'vehicles',app.list_json((select jsonb_agg(to_jsonb(v)||jsonb_build_object('chargingCommitted',exists(select from app.charging_requests c
        where c.vehicle_id=v.vehicle_id and c.status in ('Waiting','Scheduled','Charging','Suspended')),
        'activeRestrictionIds',app.list_json((select jsonb_agg(incident_id) from app.resource_restrictions r where r.vehicle_id=v.vehicle_id and lifted_at is null))) order by v.vehicle_id)
        from app.vehicles v where kind='SHARED')),
      'observations',app.list_json((select jsonb_agg(to_jsonb(x)) from app.fleet_observations x)),
      'policy',(select to_jsonb(x) from app.fleet_policy x),
      'incidentHistory',app.list_json((select jsonb_agg(to_jsonb(x) order by sequence_no) from app.incident_history x)),
      'transferHistory',app.list_json((select jsonb_agg(to_jsonb(x) order by sequence_no) from app.transfer_history x)),
      'telemetryEvents',app.list_json((select jsonb_agg(to_jsonb(x)) from (select e.*,r.result from app.telemetry_events e left join app.fleet_event_results r using(event_id) order by observed_at desc,event_id limit 25) x))
    )||app.charging_view();
  end if;
  return jsonb_build_object('ok',true,'data',data||jsonb_build_object('revision',t.revision,'demoTime',t.demo_time));
exception when raise_exception then return jsonb_build_object('ok',false,'code',sqlerrm);
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then return jsonb_build_object('ok',false,'code','INVALID_INPUT');
end $$;

-- SQL-language RPCs are rebound explicitly to the latest view implementation.
create or replace function public.demo_view(p_role text,p_view text,p_filter jsonb default '{}') returns jsonb
language sql volatile security definer set search_path='' as $$ select app.view_for_profile(app.demo_actor(p_role),p_view,p_filter) $$;
