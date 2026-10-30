# Intuit OAuth implementation plan

Use the official QuickBooks Online Accounting API via Intuit OAuth 2.0 authorization-code flow. A dedicated LedgerSync worker callback must validate a one-time expiring state and redirect URI, exchange the code server-side, and store rotating access/refresh credentials encrypted per realmId. Enforce tenant boundaries and secure an authenticated connection-start operation. Support multiple independent companies, token refresh locking, and audit without exposing secrets. Do not use Meridian tokens.

Staging must use sandbox credentials, dedicated D1 migrations, secrets stored outside Git, automated tests, and CI. There must be no QuickBooks accounting writes in this feature. A user-facing authorization button is only valid after Intuit client credentials, redirect configuration, secure bootstrap, and deployment are verified.
