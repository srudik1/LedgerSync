-- Production LedgerSync bank-to-QBO routing. Additive and idempotent; no QBO writes.
CREATE TABLE IF NOT EXISTS bank_account_mappings (
  source TEXT NOT NULL,
  source_account_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  qbo_company_id TEXT NOT NULL,
  qbo_company_name TEXT NOT NULL,
  qbo_account_id TEXT NOT NULL,
  qbo_account_name TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source, source_account_id),
  UNIQUE (qbo_company_id, qbo_account_id)
);
CREATE TABLE IF NOT EXISTS bank_account_mapping_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_account_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO bank_account_mappings
(source,source_account_id,currency,qbo_company_id,qbo_company_name,qbo_account_id,qbo_account_name,verified_at,enabled)
VALUES ('monobank','HXHcDt4LqMaZ6S6ibPaiUA','UAH','9444b5ce-7c15-4221-a3f5-4352a4990dfd','VIVID','436','BANKS:MONO BANK:S. Rudik 3613 "FOP"','2026-10-28T00:00:00Z',1)
ON CONFLICT(source,source_account_id) DO NOTHING;
INSERT INTO bank_account_mapping_audit(source,source_account_id,action,details)
SELECT 'monobank','HXHcDt4LqMaZ6S6ibPaiUA','initial_mapping','Verified IBAN suffix 3613, currency UAH, QBO VIVID account 436'
WHERE NOT EXISTS (SELECT 1 FROM bank_account_mapping_audit WHERE source='monobank' AND source_account_id='HXHcDt4LqMaZ6S6ibPaiUA' AND action='initial_mapping');
