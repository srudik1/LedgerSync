// Accounting-neutral staging: no bank transaction is sent to QuickBooks until explicitly mapped.
export async function ensureLedgerSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS bank_transactions (
    source TEXT NOT NULL,
    account_id TEXT NOT NULL,
    external_id TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    description TEXT,
    raw_json TEXT NOT NULL,
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (source, account_id, external_id)
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS accounting_exports (
    provider TEXT NOT NULL,
    source TEXT NOT NULL,
    account_id TEXT NOT NULL,
    external_id TEXT NOT NULL,
    destination_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (provider, source, account_id, external_id)
  )`).run();
}

export async function stageTransactions(db, transactions) {
  if (!Array.isArray(transactions)) throw new Error("Expected transactions array");
  if (transactions.length > 500) throw new Error("Batch exceeds 500 transactions");
  await ensureLedgerSchema(db);
  let inserted = 0;
  for (const tx of transactions) {
    if (!tx || !["monobank"].includes(tx.source) || !tx.accountId || !tx.id ||
        !Number.isSafeInteger(tx.amountMinor) || !tx.currency ||
        !tx.occurredAt || !Number.isFinite(Date.parse(tx.occurredAt))) {
      throw new Error("Invalid normalized bank transaction");
    }
    const result = await db.prepare(`INSERT OR IGNORE INTO bank_transactions
      (source,account_id,external_id,occurred_at,amount_minor,currency,description,raw_json)
      VALUES (?,?,?,?,?,?,?,?)`).bind(tx.source, String(tx.accountId), String(tx.id),
      tx.occurredAt, tx.amountMinor, String(tx.currency), tx.description ?? null,
      JSON.stringify(tx.raw ?? {})).run();
    inserted += result.meta?.changes ?? 0;
  }
  return { received: transactions.length, inserted, duplicates: transactions.length - inserted };
}
