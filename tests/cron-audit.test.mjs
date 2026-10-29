import assert from "node:assert/strict";
import { runAuditedProductionCron } from "../src/sync/cron-audit.js";

function dbMock(failAt = "") {
  const rows = new Map();
  return {rows,prepare(sql) {
    return {
      bind(...args) { this.args=args; return this; },
      async run() {
        if (failAt && sql.includes(failAt)) throw new Error("BANK ACCOUNT 123 SECRET");
        if (sql.startsWith("INSERT OR IGNORE")) {
          const id=this.args[0];
          if(rows.has(id)) return {meta:{changes:0}};
          rows.set(id,{status:"running"}); return {meta:{changes:1}};
        }
        if (sql.startsWith("UPDATE cron_import_runs")) {
          const id=this.args.at(-1);
          rows.set(id,{status:sql.includes("status='success'")?"success":"error"});
        }
        return {meta:{changes:0}};
      }
    };
  }};
}
const envFor = db => ({DB:db,LEDGERSYNC_ENV:"production"});
const originalLog=console.log,originalError=console.error;
const logged=[];
console.log=(...a)=>logged.push(a.join(" "));
console.error=(...a)=>logged.push(a.join(" "));
try {
  const db=dbMock();
  let calls=0;
  const fn=async()=>{calls++;return {accounts:1,received:7,inserted:2,duplicates:5};};
  await runAuditedProductionCron(envFor(db),1000,fn);
  await runAuditedProductionCron(envFor(db),1000,fn);
  assert.equal(calls,1);
  assert.equal(db.rows.get("cron-1000").status,"success");
  await runAuditedProductionCron(envFor(db),2000,fn);
  assert.equal(calls,2);
  const failDb=dbMock("INSERT OR IGNORE");
  await assert.rejects(runAuditedProductionCron(envFor(failDb),3000,fn),/audit unavailable/);
  assert.equal(failDb.rows.size,0);
  const updDb=dbMock("UPDATE cron_import_runs");
  await assert.rejects(runAuditedProductionCron(envFor(updDb),4000,fn),/audit unavailable/);
  assert.equal(updDb.rows.get("cron-4000").status,"running");
  assert.ok(!logged.some(s=>s.includes("ACCOUNT 123 SECRET")));
  await assert.rejects(runAuditedProductionCron(envFor(db),-1,fn),/scheduled time/);
  console.log=originalLog; console.error=originalError;
  console.log("cron audit tests passed");
} finally { console.log=originalLog;console.error=originalError; }
