-- Share the existing view and command logic between account and demo entry points.
create function app.command_for_profile(p app.profiles,p_operation text,p_input jsonb,p_command_id uuid)
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
end $$;

create function app.view_for_profile(p app.profiles,p_view text,p_filter jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare t app.demo_state; data jsonb; h text:=p_filter->>'hubId'; err text;
begin
  perform app.need(p.user_id is not null,'AUTH_REQUIRED');
  select * into t from app.demo_state where singleton;
  perform app.need(t.singleton,'DEMO_NOT_INITIALIZED');
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

-- Resolve a demo actor from the signed anonymous-session claim and a seeded profile.
create function app.demo_actor(p_role text)
returns app.profiles language sql stable set search_path = '' as $$
  select p.* from app.profiles p
    where auth.uid() is not null
      and auth.jwt()->'is_anonymous' = 'true'::jsonb
      and p.auth_user_id is null
      and p.user_id = case p_role when 'student' then 'demo-student' when 'operator' then 'demo-operator' end
$$;

create or replace function public.app_view(p_view text,p_filter jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  return app.view_for_profile(app.actor(),p_view,p_filter);
exception when raise_exception then
  return jsonb_build_object('ok',false,'code',sqlerrm);
end $$;

create or replace function public.app_command(p_operation text,p_input jsonb,p_command_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return app.command_for_profile(app.actor(),p_operation,p_input,p_command_id);
exception when raise_exception then
  return jsonb_build_object('ok',false,'code',sqlerrm);
end $$;

create function public.demo_view(p_role text,p_view text,p_filter jsonb default '{}'::jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select app.view_for_profile(app.demo_actor(p_role),p_view,p_filter)
$$;

create function public.demo_command(p_role text,p_operation text,p_input jsonb,p_command_id uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select app.command_for_profile(app.demo_actor(p_role),p_operation,p_input,p_command_id)
$$;

revoke all on function app.demo_actor(text),app.view_for_profile(app.profiles,text,jsonb),
  app.command_for_profile(app.profiles,text,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.demo_view(text,text,jsonb),public.demo_command(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.demo_view(text,text,jsonb),public.demo_command(text,text,jsonb,uuid) to authenticated;
