import { callMonobankMcp, MonobankMcpError } from "./connectors/monobank-mcp.js";
import { importMonobankLast30Days } from "./sync/monobank-import.js";


// Temporary staging-only scheduled test. A D1 primary-key claim makes repeated cron
// invocations no-ops. It records aggregate counters, never transactions or secrets.
async function runStagingOnce(env) {
  if (env.LEDGERSYNC_ENV !== "staging" || !env.LEDGERSYNC_ONESHOT_ID || !env.DB) return;
  const id = env.LEDGERSYNC_ONESHOT_ID;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS staging_one_shot_runs (run_id TEXT PRIMARY KEY, status TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, finished_at TEXT, accounts INTEGER, received INTEGER, inserted INTEGER, duplicates INTEGER, error_category TEXT)"
  ).run();
  const claim = await env.DB.prepare(
    "INSERT OR IGNORE INTO staging_one_shot_runs (run_id,status) VALUES (?,'running')"
  ).bind(id).run();
  if (claim.meta.changes !== 1) return;
  try {
    const result = await importMonobankLast30Days(env);
    await env.DB.prepare(
      "UPDATE staging_one_shot_runs SET status='success',finished_at=CURRENT_TIMESTAMP,accounts=?,received=?,inserted=?,duplicates=? WHERE run_id=?"
    ).bind(result.accounts,result.received,result.inserted,result.duplicates,id).run();
    console.log("Staging one-shot import finished", JSON.stringify({run_id:id,...result}));
  } catch (error) {
    const category = error instanceof MonobankMcpError ? error.category : "import_failed";
    await env.DB.prepare(
      "UPDATE staging_one_shot_runs SET status='error',finished_at=CURRENT_TIMESTAMP,error_category=? WHERE run_id=?"
    ).bind(category,id).run();
    console.error("Staging one-shot import failed",JSON.stringify({run_id:id,category}));
  }
}

export default {
  async scheduled(event, env, ctx) {
    if (env.LEDGERSYNC_ENV === "staging" && env.LEDGERSYNC_ONESHOT_ID) {
      ctx.waitUntil(runStagingOnce(env));
      return;
    }
    if (env.LEDGERSYNC_ENV !== "production") return;
    ctx.waitUntil(importMonobankLast30Days(env).then(result => {
      console.log("Monobank import:", JSON.stringify(result));
    }).catch(error => {
      console.error("Monobank import failed:", error instanceof MonobankMcpError ? error.category : error.message);
    }));
  },
  async fetch(request, env) {
    const url = new URL(request.url);

    // Authenticated manual import, used for one-off verification and recovery.
    // The key is stored as a Worker secret, never as a URL parameter.
    if (url.pathname === "/internal/monobank/sync") {
      if (request.method !== "POST") return new Response(null, { status: 405 });
      const expected = env.MONOBANK_DIAGNOSTIC_KEY;
      const provided = request.headers.get("X-LedgerSync-Diagnostic-Key");
      if (!expected || !provided || provided !== expected) {
        return new Response(null, { status: 404 });
      }
      if (!["staging", "production"].includes(env.LEDGERSYNC_ENV)) {
        return new Response(null, { status: 503 });
      }
      try {
        const result = await importMonobankLast30Days(env);
        console.log("Monobank manual import:", JSON.stringify(result));
        return Response.json(result, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        console.error("Monobank manual import failed:",
          error instanceof MonobankMcpError ? error.category : error.message);
        return Response.json({
          status: "error",
          reason: error instanceof MonobankMcpError ? error.category : "import_failed"
        }, { status: 502, headers: { "Cache-Control": "no-store" } });
      }
    }

    // Diagnostic is disabled until a dedicated secret is configured.
    // Do not expose bank connectivity checks as an unauthenticated public endpoint.
    if (url.pathname === "/internal/monobank/check") {
      if (request.method !== "POST") return new Response(null, { status: 405 });
      const expected = env.MONOBANK_DIAGNOSTIC_KEY;
      const provided = request.headers.get("X-LedgerSync-Diagnostic-Key");
      if (!expected || !provided || provided !== expected) {
        return new Response(null, { status: 404 });
      }
      try {
        await callMonobankMcp(env, "initialize", {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "LedgerSync", version: "0.1.0" }
        });
        return Response.json({ service: "LedgerSync", monobank_mcp: "connected" },
          { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        console.error("Monobank MCP connectivity check:", error instanceof MonobankMcpError ? error.category : "transport_failure");
        return Response.json({ service: "LedgerSync", monobank_mcp: "unavailable", reason: error instanceof MonobankMcpError ? error.category : "transport_failure" },
          { status: 502, headers: { "Cache-Control": "no-store" } });
      }
    }

    if (url.pathname === "/health" && request.method === "GET") {
      try {
        if (!env.DB) throw new Error("Missing D1 binding: DB");
        const row = await env.DB.prepare("SELECT 1 AS connected").first();
        if (row?.connected !== 1) throw new Error("D1 query failed");
        return Response.json({
          service: "LedgerSync",
          status: "ok",
          database: "connected",
          timestamp: new Date().toISOString()
        }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        console.error("Health check failed:", error);
        return Response.json({
          service: "LedgerSync",
          status: "error",
          database: "disconnected"
        }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
    }

    return Response.json({ service: "LedgerSync", status: "running", endpoints: ["/health"] });
  }
};
