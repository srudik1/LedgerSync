import test from "node:test";
import assert from "node:assert/strict";
import {intuitOAuth} from "../src/connectors/intuit-oauth.js";
import {protectTokens,revealTokens} from "../src/connectors/intuit-token-store.js";
const key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const env={INTUIT_CLIENT_ID:"sandbox-id",INTUIT_REDIRECT_URI:"https://ledger-sync-staging.srudik.workers.dev/oauth/intuit/callback",INTUIT_OAUTH_ADMIN_KEY:"private",INTUIT_CLIENT_SECRET:"fake-test-secret",INTUIT_TOKEN_ENCRYPTION_KEY:key,DB:{prepare:()=>({bind:()=>({run:async()=>({meta:{changes:1}})})})}};
test("authorization start requires authenticated POST",async()=>{
 const target="https://ledger-sync-staging.srudik.workers.dev/oauth/intuit/start";
 assert.equal((await intuitOAuth(new Request(target,{method:"POST"}),env,new URL(target))).status,404);
 assert.equal((await intuitOAuth(new Request(target),env,new URL(target))).status,405);
});
test("authorization URL uses official accounting scope and redirect",async()=>{
 const target="https://ledger-sync-staging.srudik.workers.dev/oauth/intuit/start";
 const response=await intuitOAuth(new Request(target,{method:"POST",headers:{Authorization:"Bearer private"}}),env,new URL(target));
 const link=new URL((await response.json()).authorization_url);
 assert.equal(link.hostname,"appcenter.intuit.com");
 assert.equal(link.searchParams.get("scope"),"com.intuit.quickbooks.accounting");
 assert.equal(link.searchParams.get("redirect_uri"),env.INTUIT_REDIRECT_URI);
 assert.ok(link.searchParams.get("state").length>=40);
});
test("encrypted secrets cannot be read under another company",async()=>{
 const value={access_token:"access",refresh_token:"refresh"};
 const stored=await protectTokens(env,"realm-A",value);
 assert.ok(!stored.includes("access"));
 assert.deepEqual(await revealTokens(env,"realm-A",stored),value);
 await assert.rejects(revealTokens(env,"realm-B",stored));
});
test("invalid callback without required parameters is rejected",async()=>{
 const target=env.INTUIT_REDIRECT_URI;
 const result=await intuitOAuth(new Request(target),env,new URL(target));
 assert.equal(result.status,400);
});

test("OAuth fails closed when client secret is absent",async()=>{const e={...env,INTUIT_CLIENT_SECRET:undefined};const target="https://ledger-sync-staging.srudik.workers.dev/oauth/intuit/start";const response=await intuitOAuth(new Request(target,{method:"POST",headers:{Authorization:"Bearer private"}}),e,new URL(target));assert.equal(response.status,503);});

test("connect link rejects missing ticket",async()=>{const target="https://ledger-sync-staging.srudik.workers.dev/oauth/intuit/connect";const result=await intuitOAuth(new Request(target),env,new URL(target));assert.equal(result.status,403);});
test("invitation creation requires admin authorization",async()=>{const target="https://ledger-sync-staging.srudik.workers.dev/oauth/intuit/invite";const result=await intuitOAuth(new Request(target,{method:"POST"}),env,new URL(target));assert.equal(result.status,404);});
