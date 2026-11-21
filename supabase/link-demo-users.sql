-- Supabase SQL Editor, after an administrator creates and confirms the demo Auth users.
-- Edit only these email values when using custom accounts. Never add passwords here.
with accounts(user_id, auth_email) as (values
  ('demo-student', 'demo-student@example.com'),
  ('demo-operator', 'demo-operator@example.com'),
  ('demo-guest', 'demo-guest@example.com')
)
update app.profiles p
set auth_user_id = u.id
from accounts a join auth.users u on lower(u.email)=lower(a.auth_email) and u.email_confirmed_at is not null
where p.user_id=a.user_id and p.auth_user_id is distinct from u.id;

select user_id, role, auth_user_id is not null as linked
from app.profiles order by role, user_id;
