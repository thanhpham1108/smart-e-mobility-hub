-- Restore the deterministic sample dataset when it has not already been seeded.
select app.restore_demo() where not exists (select from app.demo_state);
