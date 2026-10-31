-- Apply separately after approval; this PR never changes Cloudflare Production.
CREATE TABLE IF NOT EXISTS intuit_oauth_states (state_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS intuit_connections (realm_id TEXT PRIMARY KEY, encrypted_tokens TEXT NOT NULL, access_expires_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, refresh_locked_until TEXT);
