# LedgerSync deployment

## Environments

| Environment | Git branch | Worker | D1 |
|---|---|---|---|
| staging | develop | ledger-sync-staging | ledger-sync-db-staging |
| production | main | ledger-sync | ledger-sync-db |

## Prerequisites

1. Create the staging D1 database in Cloudflare.
2. Obtain the **database IDs** for both D1 databases.
3. Add a `d1_databases` array to `wrangler.staging.jsonc` with `binding: "DB"`, `database_name: "ledger-sync-db-staging"`, and its actual `database_id`.
4. Add the corresponding production D1 binding to `wrangler.jsonc`, using `ledger-sync-db` and its actual ID.
5. In GitHub, configure environments named `staging` and `production` with secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Use a least-privilege Cloudflare API token with Workers edit and D1 access as needed.
6. Protect `main` with required pull-request review and optionally configure production environment approval.

## Deployment ownership

Cloudflare Git-connected Builds and GitHub Actions should **not both deploy the same Worker**. Select one deployment mechanism per environment. The workflows in this repository are templates and are not ready to deploy until database IDs and secrets are configured.

## Verification

Once deployed, request `GET /health` on each Worker and verify `database: connected`. Each environment must use its own D1 database and credentials. Never commit secrets or financial data.
