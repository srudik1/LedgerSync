# Agent Instructions — LedgerSync

Before planning, coding, reviewing, or deploying changes in this repository, **read and follow [LEDGERSYNC_VISION.md](./LEDGERSYNC_VISION.md)**. Treat it as the governing product and architecture charter.

## Non-negotiable direction
- LedgerSync is a **universal, autonomous accounting integration platform**: multiple banks, CRMs, payment processors and other event sources route to multiple companies and accounting systems.
- The main outcome is **correct automatic posting of accounting documents** under approved rules. Importing transactions, reporting, and reconciliation alone are intermediate capabilities.
- Keep source connectors, canonical events, routing, rule evaluation, destination connectors, posting, audit, and exceptions modular and independent.
- Never hard-code Monobank → VIVID as the universal architecture; treat it as the first pilot.
- ChatGPT or Meridian must not be runtime dependencies of unattended posting.
- Preserve company isolation, explicit account routing, unique event keys, idempotent writes, retries with verification, versioned approvals, audit logs, and exception handling.

## Mandatory ChatGPT management interface
- Treat an authenticated LedgerSync API/MCP for direct ChatGPT management as a product requirement, not an optional add-on.
- ChatGPT is a **control plane**, never a dependency of autonomous ingestion, classification, posting, reconciliation, or scheduling.
- Design management operations for read-only inspection, versioned rule management, exception approval/rejection, controlled execution, reporting, permissions, and auditing.
- Enforce per-company isolation, role-based access, explicit approvals for sensitive writes, idempotent commands, and full audit records at the LedgerSync backend. ChatGPT prompts cannot override these controls.
- Keep the interface reusable by other clients; isolate the API/MCP adapter from the accounting engine.

## Change discipline
- Inspect current implementation and approved accounting rules before editing.
- Prefer official APIs and existing integrations; avoid unnecessary infrastructure.
- Validate new behavior with tests and staging before any production rollout.
- **Do not execute real QuickBooks/accounting writes without separately confirmed rules and safety gates.**
- No secrets in source control, logs, tests, or PRs.
- When any proposed change conflicts with the charter, explain the conflict and request a product-level decision rather than silently redirecting project goals.

This document governs development behavior; it does not itself authorize any production accounting transaction.
