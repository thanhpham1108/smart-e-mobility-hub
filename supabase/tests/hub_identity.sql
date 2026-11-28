begin;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000007',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select app.restore_demo();

do $$
declare hubs jsonb; profile jsonb; result jsonb; saved jsonb;
begin
  hubs:=public.demo_view('student','hubs')#>'{data,hubs}';
  perform app.need(exists(select from jsonb_array_elements(hubs) h
    where h->>'id'='ktx-a' and h->>'freshness'='Live' and h->>'lastObservedAt' is not null
      and h->'vehicleBatteries' @> '[{"vehicleId":"rental-car-a-01","vehicleType":"CAR","batteryLevel":86}]'),
    'HUB_STATUS_MUST_REPORT_ACTUAL_OBSERVATIONS_AND_VEHICLES');
  perform app.need(hubs @> '[{"id":"hcmut","freshness":"Stale"}]',
    'HUB_STATUS_MUST_KEEP_SEEDED_STALE_DATA_VISIBLE');
  perform app.need(not exists(select from jsonb_array_elements(hubs) h
    cross join lateral jsonb_array_elements(h->'vehicleBatteries') v
    where v->>'vehicleId' like 'private-%'),'HUB_STATUS_EXPOSES_PRIVATE_VEHICLES');

  profile:=public.demo_view('student','bootstrap')#>'{data}';
  result:=public.demo_command('student','identity.profile',
    '{"email":"bad address","phone":"123"}',gen_random_uuid());
  perform app.need(result->>'code'='INVALID_PROFILE','INVALID_CONTACT_ACCEPTED');
  perform app.need(public.demo_view('student','bootstrap')#>'{data}'=profile,'INVALID_PROFILE_CHANGED_STATE');

  result:=public.demo_command('student','identity.profile',
    '{"email":"student@example.test","phone":"+84 901 234 567","userId":"demo-operator","role":"operator"}',gen_random_uuid());
  saved:=public.demo_view('student','bootstrap')#>'{data}';
  perform app.need(result->>'ok'='true' and saved @> '{"userId":"demo-student","role":"student","email":"student@example.test","phone":"+84 901 234 567"}',
    'CONTACT_UPDATE_MUST_PRESERVE_PROFILE_IDENTITY');
  perform app.need(public.demo_view('operator','bootstrap')#>>'{data,email}' is distinct from 'student@example.test',
    'PROFILE_UPDATE_CROSSED_PORTALS');

  result:=public.demo_command('operator','demo.advance','{}',gen_random_uuid());
  perform app.need(result->>'ok'='true','ADVANCE_FAILED');
  hubs:=public.demo_view('student','hubs')#>'{data,hubs}';
  perform app.need(hubs @> '[{"id":"ktx-a","freshness":"Stale"}]','AGED_OBSERVATION_REPORTED_AS_LIVE');
end $$;
rollback;
