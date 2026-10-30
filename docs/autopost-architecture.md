# Automated Monobank to QuickBooks VIVID
Design only: no active QuickBooks mutations in this release.
Flow: D1 bank transaction -> confirm explicit FOP/QBO mapping -> read QuickBooks and reconcile existing documents -> versioned approved posting rule -> validate live invoice/bill/customer/vendor, currency and amounts -> claim unique D1 key -> QuickBooks write -> verify response by rereading QuickBooks -> audit and reconcile balances.
Actions: Payment (existing invoice), SalesReceipt (direct sale), BillPayment (existing bill), Expense (approved unbilled spending), Transfer (two mapped accounts). Loans, owner contributions, refunds, split/grouped settlements and uncertain counterparties must be manually approved.
Known mapping: FOP deposit account 436; personal Monobank 7645 maps to 385 and MUST NOT be imported as FOP.
QuickBooks VIVID is accessible from ChatGPT's Meridian connector, but this does not grant Cloudflare Worker an OAuth token. Server-side Intuit access remains to be authorized. Never commit tokens, never blindly retry writes; use idempotency claims plus QBO lookup after timeout.
Default is dry-run. No write execution, endpoint or enabled rule is provided by this design. Existing records must never be recreated.
