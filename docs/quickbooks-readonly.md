# VIVID QuickBooks read-only reconciliation contract

Current connector: Meridian QBO (ChatGPT connected app), company VIVID. The connector is available to the ChatGPT session, **not** as a Cloudflare Worker binding, OAuth refresh token or server-to-server endpoint.

## Safety boundary
- Do not add connector session tokens, Intuit tokens or bank credentials to GitHub, D1, logs or Worker variables.
- QuickBooks import requires a separately authorized service-to-service read-only credential or an explicitly configured authenticated bridge; **not configured**.
- All QuickBooks operations must use GET/SELECT/report/CDC only; no write endpoints.
- Bank-to-QBO account mappings must be approved per FOP account and currency, never guessed from amount.
- Reconciliation is a pure function in `src/sync/reconcile.js`; it makes no QuickBooks API calls or D1 writes.
- All amounts are signed integer minor units. Normalize QBO dates/amounts before calling. Keep the source QBO type, ID, company and transaction currency for auditing.
- Matching uses exact mapped QBO bank account, currency, signed amount, and date tolerance (default one day).
- Ambiguous duplicates must stay unresolved. Grouped QuickBooks transactions, transfers, split settlements and other many-to-one cases need separate matching rules and review.
- Never use a successful reconciliation as approval to create/update/delete any QBO transaction.

## Next integration requirement
Provision a read-only QuickBooks service connection accessible **to the LedgerSync Worker**. The current ChatGPT Meridian connection cannot be silently reused by the deployed Worker. Until then, the pipeline is intentionally in dry-run/offline-read-only mode.
