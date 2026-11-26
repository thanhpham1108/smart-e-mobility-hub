// Disposable local integration preview. No hosted Supabase calls or persisted data.
// Run: node scripts/fleet-preview.mjs (requires the existing PGlite dev dependency).
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = resolve(import.meta.dirname, "..");
const db = await PGlite.create();
await db.exec(`create role anon; create role authenticated; create schema auth;
  create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;`);
for (const file of (await readdir(resolve(root, "supabase/migrations"))).sort().filter(f => f.endsWith(".sql")))
  await db.exec(await readFile(resolve(root, "supabase/migrations", file), "utf8"));
await db.exec(await readFile(resolve(root, "supabase/seed.sql"), "utf8"));
await db.exec(`select set_config('request.jwt.claims','{"is_anonymous":true}',false);
  select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000044',false);`);
const mockClient = `function createClient() { return {
  auth: { async getSession() { return {data:{session:{user:{is_anonymous:true}}}}; } },
  async rpc(name,args) { const response=await fetch('/__local_rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})}); return response.json(); }
}; }`;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/__local_rpc" && req.method === "POST") {
      // Block cross-origin websites from issuing requests to this local demo.
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) { res.writeHead(403).end(); return; }
      let body = "";
      for await (const part of req) { body += part; if (body.length > 20000) throw new Error("Request too large"); }
      const { name, args } = JSON.parse(body);
      let query;
      if (name === "demo_view") query = await db.query("select public.demo_view($1,$2,$3::jsonb) as result", [args.p_role,args.p_view,JSON.stringify(args.p_filter)]);
      else if (name === "demo_command") query = await db.query("select public.demo_command($1,$2,$3::jsonb,$4::uuid) as result", [args.p_role,args.p_operation,JSON.stringify(args.p_input),args.p_command_id]);
      else { res.writeHead(400).end(); return; }
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ data: query.rows[0].result }));
      return;
    }
    const path = resolve(root, "." + decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    if (!path.startsWith(root + sep) || ![".html", ".js", ".css", ".svg", ".png", ".ico"].includes(extname(path))) { res.writeHead(404).end(); return; }
    let content = await readFile(path);
    if (path === resolve(root, "src/app/backend.js")) content = content.toString().replace(/^import \{ createClient \}[^\n]+/, mockClient);
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" }).end(content);
  } catch (error) { console.error(error.message); res.writeHead(500).end("Local preview error"); }
});
server.listen(4173, "127.0.0.1", () => console.log("Disposable Fleet preview: http://127.0.0.1:4173/#/operator/network"));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(async () => { await db.close(); process.exit(); }));
