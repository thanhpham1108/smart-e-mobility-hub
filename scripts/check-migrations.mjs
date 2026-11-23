import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = await PGlite.create();
try {
  // Mimic Supabase PostgREST identity claims for PostgreSQL-level integration checks.
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable
    as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;`);
  for (const file of (await readdir("supabase/migrations")).sort().filter(name => name.endsWith(".sql"))) {
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
    console.log("Applied", file);
  }
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  await db.exec(await readFile("supabase/tests/mvp.sql", "utf8"));
  await db.exec(await readFile("supabase/tests/parking.sql", "utf8"));
  console.log("Passed: parking interval, lifecycle, ownership, expiry and cross-module regression checks.");
  console.log("Passed: seed, roles, demo access, parking + charging, retry, rental, partial transfer, incident, telemetry, simulation and reset.");
} catch (error) {
  console.error(error.message);
  if (error.where) console.error(error.where);
  process.exitCode = 1;
} finally { await db.close(); }
