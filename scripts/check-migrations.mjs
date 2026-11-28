import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrations = (await readdir("supabase/migrations")).filter(name => name.endsWith(".sql")).sort();
const versions = new Map();
for (const file of migrations) {
  const version = /^(\d{14})_/.exec(file)?.[1];
  if (!version) throw new Error(`Invalid Supabase migration filename: ${file}`);
  if (versions.has(version)) {
    throw new Error(`Supabase migration version ${version} is shared by ${versions.get(version)} and ${file}.`);
  }
  versions.set(version, file);
}

const db = await PGlite.create();
try {
  // Mimic Supabase PostgREST identity claims for PostgreSQL-level integration checks.
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable
    as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;`);
  for (const file of migrations) {
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
    console.log("Applied", file);
  }
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  await db.exec(await readFile("supabase/tests/mvp.sql", "utf8"));
  await db.exec(await readFile("supabase/tests/parking.sql", "utf8"));
  console.log("Passed: parking interval, lifecycle, ownership, expiry and cross-module regression checks.");
  console.log("Passed: seed, roles, demo access, parking + charging, retry, rental, partial transfer, incident, telemetry, simulation and reset.");
  await db.exec(await readFile("supabase/tests/fleet.sql", "utf8"));
  console.log("Passed: Fleet/Incident validation, atomic arrivals, risk recovery, restrictions, telemetry ordering/deduplication, occupancy reconciliation and reset.");
  await db.exec(await readFile("supabase/tests/rental.sql", "utf8"));
  console.log("Passed: Rental holds, pickup verification, simulated lock failures, return-slot revalidation and faulted returns.");
  await db.exec(await readFile("supabase/tests/hub_identity.sql", "utf8"));
  console.log("Passed: Hub telemetry freshness, shared vehicle readings and profile validation.");
  await db.exec(await readFile("supabase/tests/operator_request_activity.sql", "utf8"));
  console.log("Passed: shared Parking and Charging request activity, check-in, checkout and waitlist.");
  await db.exec(await readFile("supabase/tests/shared_availability.sql", "utf8"));
  console.log("Passed: cross-module Hub availability, parking holds, immutable snapshots and charging/fleet eligibility.");
} catch (error) {
  console.error(error.message);
  if (error.where) console.error(error.where);
  process.exitCode = 1;
} finally { await db.close(); }
