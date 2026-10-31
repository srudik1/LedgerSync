import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const origin = "https://ledger-sync.srudik.workers.dev";
test("public information never reads company data and never reflects URL parameters", async () => {
  const env = new Proxy({}, { get() { throw Error("Public pages must not access bindings"); } });
  for (const path of ["launch", "privacy", "terms", "connect", "disconnect"]) {
    const response = await worker.fetch(new Request(`${origin}/${path}?realmId=PRIVATE_COMPANY&code=SECRET_CODE`), env);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("Content-Type"), /text\/html/);
    assert.match(response.headers.get("Content-Security-Policy"), /form-action 'none'/);
    const html = await response.text();
    assert.match(html, /Steven Rudik/);
    assert.doesNotMatch(html, /PRIVATE_COMPANY|SECRET_CODE|<script|<form/);
  }
});
test("opening or posting to connection information cannot authorize or revoke access", async () => {
  const env = new Proxy({}, { get() { throw Error("No access to OAuth state or credentials"); } });
  for (const path of ["connect", "disconnect"]) {
    const head = await worker.fetch(new Request(`${origin}/${path}`, { method: "HEAD" }), env);
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    const post = await worker.fetch(new Request(`${origin}/${path}`, { method: "POST" }), env);
    assert.equal(post.status, 405);
  }
});
test("existing health, service status, and OAuth routing remain intact", async () => {
  let queries = 0;
  const env = { DB: { prepare(sql) { assert.equal(sql, "SELECT 1 AS connected"); queries++; return { first: async () => ({ connected: 1 }) }; } } };
  const health = await worker.fetch(new Request(`${origin}/health`), env);
  assert.equal((await health.json()).database, "connected");
  assert.equal(queries, 1);
  const root = await worker.fetch(new Request(origin), {});
  assert.equal((await root.json()).status, "running");
  const oauth = await worker.fetch(new Request(`${origin}/oauth/intuit/start`), {});
  assert.equal(oauth.status, 503);
  assert.equal((await oauth.json()).error, "oauth_unconfigured");
});
