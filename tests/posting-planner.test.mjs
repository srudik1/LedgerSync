import test from "node:test";import assert from "node:assert/strict";import {planPosting} from "../src/sync/posting-planner.js";
const tx={source:"monobank",account_id:"fop",external_id:"a",amount_minor:37500,currency:"UAH",occurred_at:"2026-10-28"};
const r={id:"rule",enabled:true,approved_version:1,bank_account_id:"fop",currency:"UAH",direction:"in",action:"SalesReceipt",qbo_bank_account_id:"436",customer_id:"778",item_id:"783"};
test("approved explicit rule only creates preflight plan",()=>assert.equal(planPosting(tx,[r]).status,"ready_for_preflight"));
test("prior link blocks duplicate",()=>assert.equal(planPosting(tx,[r],[{bank_key:"monobank:fop:a"}]).status,"already_posted"));
test("ambiguous rules require review",()=>assert.equal(planPosting(tx,[r,{...r,id:"second"}]).status,"review"));
test("unapproved rule requires review",()=>assert.equal(planPosting(tx,[{...r,approved_version:null}]).status,"review"));
test("missing customer reference requires review",()=>assert.equal(planPosting(tx,[{...r,customer_id:null}]).status,"review"));
test("wrong account requires review",()=>assert.equal(planPosting(tx,[{...r,bank_account_id:"other"}]).status,"review"));
