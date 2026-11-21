-- Anonymous Auth sessions can act only as the seeded, unlinked demo profiles.
create or replace function app.actor() returns app.profiles language plpgsql stable set search_path = '' as $$
declare p app.profiles;
begin
  if auth.uid() is not null and auth.jwt()->'is_anonymous' = 'true'::jsonb then
    select * into p from app.profiles where auth_user_id is null and user_id=case current_setting('smarthub.demo_role',true)
      when 'student' then 'demo-student' when 'operator' then 'demo-operator' end;
  else
    select * into p from app.profiles where auth_user_id=auth.uid();
  end if;
  if p.user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  return p;
end $$;

create function public.demo_view(p_role text,p_view text,p_filter jsonb default '{}'::jsonb)
returns jsonb language plpgsql set search_path = '' set smarthub.demo_role = '' as $$
begin
  if auth.uid() is null or auth.jwt()->'is_anonymous' is distinct from 'true'::jsonb then
    return jsonb_build_object('ok',false,'code','AUTH_REQUIRED');
  end if;
  perform set_config('smarthub.demo_role',p_role,true);
  return public.app_view(p_view,p_filter);
end $$;

create function public.demo_command(p_role text,p_operation text,p_input jsonb,p_command_id uuid)
returns jsonb language plpgsql set search_path = '' set smarthub.demo_role = '' as $$
begin
  if auth.uid() is null or auth.jwt()->'is_anonymous' is distinct from 'true'::jsonb then
    return jsonb_build_object('ok',false,'code','AUTH_REQUIRED');
  end if;
  perform set_config('smarthub.demo_role',p_role,true);
  return public.app_command(p_operation,p_input,p_command_id);
end $$;

revoke all on function public.demo_view(text,text,jsonb),public.demo_command(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.demo_view(text,text,jsonb),public.demo_command(text,text,jsonb,uuid) to authenticated;
