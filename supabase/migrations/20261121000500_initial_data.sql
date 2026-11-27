-- Initialize an empty hosted demo before the frontend is published.
select app.restore_demo() where not exists (select from app.demo_state);

-- Link pre-provisioned, confirmed demo accounts when they exist.
with accounts(user_id,auth_email) as (values
  ('demo-student','demo-student@example.com'),
  ('demo-operator','demo-operator@example.com'),
  ('demo-guest','demo-guest@example.com')
)
update app.profiles p set auth_user_id=u.id
from accounts a join auth.users u on lower(u.email)=lower(a.auth_email) and u.email_confirmed_at is not null
where p.user_id=a.user_id and p.auth_user_id is null;
