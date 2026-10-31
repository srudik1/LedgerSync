// Pure fail-closed plan: never calls QuickBooks.
export const ACTIONS = Object.freeze(["Payment","SalesReceipt","Expense","Transfer","BillPayment"]);
export function planPosting(tx,rules,existing=[]) {
 if(!tx||tx.source!=="monobank"||!tx.account_id||!tx.external_id||!Number.isSafeInteger(tx.amount_minor)||!tx.currency||!tx.occurred_at) throw Error("Invalid bank transaction");
 const bank_key=[tx.source,tx.account_id,tx.external_id].join(":");
 if(existing.some(x=>x.bank_key===bank_key))return {bank_key,status:"already_posted"};
 const eligible=rules.filter(r=>r.enabled===true&&Number.isInteger(r.approved_version)&&r.bank_account_id===tx.account_id&&r.currency===tx.currency&&(r.direction==="in"?tx.amount_minor>0:r.direction==="out"?tx.amount_minor<0:false)&&(r.exact_amount_minor===undefined||r.exact_amount_minor===tx.amount_minor)&&(r.description_equals===undefined||r.description_equals===tx.description));
 if(eligible.length!==1)return {bank_key,status:"review",reason:eligible.length?"multiple_rules":"no_approved_rule"};
 const r=eligible[0];
 if(!ACTIONS.includes(r.action)||!r.qbo_bank_account_id)return {bank_key,status:"review",reason:"incomplete_rule"};
 const required={Payment:["invoice_id"],SalesReceipt:["customer_id","item_id"],BillPayment:["bill_id"],Expense:["vendor_id"],Transfer:["destination_account_id"]}[r.action];
 if(required.some(k=>!r[k])||(r.action==="Transfer"&&r.destination_account_id===r.qbo_bank_account_id))return {bank_key,status:"review",reason:"missing_required_reference"};
 return {bank_key,status:"ready_for_preflight",action:r.action,rule_id:r.id,rule_version:r.approved_version,qbo_bank_account_id:r.qbo_bank_account_id,amount_minor:tx.amount_minor,currency:tx.currency};
}
