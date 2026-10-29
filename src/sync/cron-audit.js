import { MonobankMcpError } from "../connectors/monobank-mcp.js";
import { importMonobankLast30Days } from "./monobank-import.js";

// Fixed allowlist: never persist or log upstream error text, tokens or bank data.
const CATEGORIES = new Set([
  "access_denied", "rate_limited", "authentication_failed",
  "transport_failure", "upstream_error", "invalid_response",
  "timeout", "import_failed"
]);
const categoryFor = (error) =>
  error instanceof MonobankMcpError && CATEGORIES.has(error.category)
    ? error.category : "import_failed";

const SCHEMA = `CREATE TABLE IF NOT EXISTS cron_import_runs (
  run_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('running','success','error')),
  accounts INTEGER,
  received INTEGER,
  inserted INTEGER,
  duplicates INTEGER,
  error_category TEXT
)`;

export async function runAuditedProductionCron(env, scheduledTime, importFn = importMonobankLast30Days) {
  if (env.LEDGERSYNC_ENV !== "production" || !env.DB) return;
  // Stable for retries of the same scheduled event; distinct cron slots remain distinct.
  if (!Number.isSafeInteger(scheduledTime) || scheduledTime <= 0) {
    console.error("Production cron audit failed", "invalid_schedule");
    throw new Error("Invalid cron scheduled time");
  }
  const runId = "cron-" + String(scheduledTime);
  try {
    await env.DB.prepare(SCHEMA).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_cron_import_runs_started_at ON cron_import_runs(started_at DESC)"
    ).run();
    const claim = await env.DB.prepare(
      "INSERT OR IGNORE INTO cron_import_runs (run_id, status) VALUES (?, 'running')"
    ).bind(runId).run();
    if (claim.meta?.changes !== 1) return;
  } catch {
    // A D1 failure must not silently disappear; never reveal SQL errors.
    console.error("Production cron audit failed", "audit_db_unavailable");
    throw new Error("Production cron audit unavailable");
  }
  try {
    const result = await importFn(env);
    await env.DB.prepare(
      "UPDATE cron_import_runs SET finished_at=CURRENT_TIMESTAMP, status='success', accounts=?,received=?,inserted=?,duplicates=?,error_category=NULL WHERE run_id=?"
    ).bind(result.accounts,result.received,result.inserted,result.duplicates,runId).run();
    console.log("Production cron import completed", JSON.stringify({
      status:"success",accounts:result.accounts,received:result.received,
      inserted:result.inserted,duplicates:result.duplicates
    }));
  } catch (error) {
    const category = categoryFor(error);
    try {
      await env.DB.prepare(
        "UPDATE cron_import_runs SET finished_at=CURRENT_TIMESTAMP,status='error',error_category=? WHERE run_id=?"
      ).bind(category,runId).run();
    } catch {
      console.error("Production cron audit failed", "audit_db_unavailable");
      throw new Error("Production cron audit unavailable");
    }
    console.error("Production cron import failed", category);
  }
}
