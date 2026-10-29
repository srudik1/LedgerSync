import { MonobankMcpError } from "../connectors/monobank-mcp.js";
import { importMonobankLast30Days } from "./monobank-import.js";

// Allow only finite, predefined categories in the database and logs.
const CATEGORIES = new Set([
  "access_denied", "rate_limited", "authentication_failed",
  "transport_failure", "upstream_error", "invalid_response",
  "timeout", "import_failed"
]);
const categoryFor = (error) =>
  error instanceof MonobankMcpError && CATEGORIES.has(error.category)
    ? error.category : "import_failed";

export async function runAuditedProductionCron(env) {
  if (env.LEDGERSYNC_ENV !== "production" || !env.DB) return;
  // The migration is also included as SQL for review. This idempotent
  // initialization makes the first cron execution self-contained.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cron_import_runs (
    run_id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT,
    status TEXT NOT NULL CHECK(status IN ('running','success','error')),
    accounts INTEGER,
    received INTEGER,
    inserted INTEGER,
    duplicates INTEGER,
    error_category TEXT
  )`).run();
  const runId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO cron_import_runs (run_id, status) VALUES (?, 'running')"
  ).bind(runId).run();
  try {
    const result = await importMonobankLast30Days(env);
    await env.DB.prepare(
      "UPDATE cron_import_runs SET finished_at=CURRENT_TIMESTAMP, status='success', accounts=?,received=?,inserted=?,duplicates=? WHERE run_id=?"
    ).bind(result.accounts,result.received,result.inserted,result.duplicates,runId).run();
    console.log("Production cron import completed", JSON.stringify({
      status:"success",accounts:result.accounts,received:result.received,
      inserted:result.inserted,duplicates:result.duplicates
    }));
  } catch (error) {
    const category = categoryFor(error);
    await env.DB.prepare(
      "UPDATE cron_import_runs SET finished_at=CURRENT_TIMESTAMP,status='error',error_category=? WHERE run_id=?"
    ).bind(category,runId).run();
    console.error("Production cron import failed",category);
  }
}
