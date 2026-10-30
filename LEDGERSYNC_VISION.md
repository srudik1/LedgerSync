# LedgerSync — Product Vision & Architecture Charter

**Status:** Governing product and architecture charter.  
**Priority:** Follow these principles when designing and implementing every subsequent feature.

## 1. Mission

LedgerSync is a universal platform that automatically ingests financial and operational events from different sources, converts them into the correct accounting documents, and posts them to the designated accounting systems.

**The end goal is maximally autonomous accounting without manual data entry or routine manual reconciliation.**

The user is involved only when confirmed rules are insufficient to make a safe decision.

## 2. Data Sources

The platform must support any number of independently connected sources:

- Bank accounts, including Monobank and other banks.
- CRM systems: deals, sales, payments, and refunds.
- Payment processors such as Stripe and PayPal.
- Business applications, ERP, and other systems.
- APIs, webhooks, and file ingestion as alternative input channels.

Every source must have an independent adapter. Adding a source must not require changes to the core accounting logic.

## 3. Accounting Destinations

LedgerSync must support independent accounting platforms, including QuickBooks Online, Xero, and others as required.

Each company may have its own accounting system, currency, chart of accounts, and posting rules. Adding a destination must not require rewriting source connectors.

## 4. Central Processing Pipeline

Every event passes through the following pipeline:

1. **Ingestion** — retrieve source events.
2. **Normalization** — convert them to a canonical internal event model.
3. **Routing** — select company, accounting platform, and destination account.
4. **Reconciliation** — locate pre-existing documents, duplicates, and linked records.
5. **Classification** — determine the accounting meaning of the event.
6. **Rule Engine** — select an approved posting rule and document type.
7. **Posting** — create or link the appropriate accounting document automatically.
8. **Verification** — validate resulting documents, links, and balances.
9. **Audit & Exceptions** — preserve a complete action history and handle exceptions.

Reconciliation is a control step, **not** the end objective.

## 5. Automatic Accounting Documents

The system should be able to create or link the accounting system's appropriate documents, including:

- Payments.
- Sales Receipts.
- Expenses.
- Bills and Bill Payments.
- Transfers.
- Journal Entries.
- Refunds and Credit Notes.
- Other relevant document types supported by the destination.

Select document types based on accounting substance, not the sign of an amount alone. Incoming funds may be customer payment, a loan, a refund, or a transfer between owned accounts.

## 6. Rules and Autonomy

Each company has its own versioned rules. Rules may consider source, bank account, payer/payee, customer/vendor, currency, amount, payment memo, CRM deal, Invoice, Bill, related source records, and history of previously confirmed cases.

**Apply unambiguous approved rules automatically, without requesting approval for every transaction.** Send novel, ambiguous, or risky cases for review. Do not request repeated approval for an already authorized class of routine transactions.

## 7. Routing Directory

Maintain a centralized routing catalog:

`Source → Source Account → Company → Accounting System → Destination Account`

Initial examples:

- Monobank FOP → QuickBooks VIVID → account **436**.
- Personal Monobank **7645** → QuickBooks VIVID → account **385**.

These mappings are specific to those sources and companies and must not be generalized to other clients.

## 8. Reliability and Security

Mandatory properties:

- Prevent duplicates on repeated ingestion.
- Verify existing accounting documents before posting.
- Preserve stable unique identifiers for each source event.
- Prevent duplicate writes under concurrent jobs and network failures.
- Audit all document modifications.
- Protect OAuth tokens and secrets in appropriate secret storage.
- Enforce independent company-level access boundaries.
- Keep a complete audit trail of actions and outcomes.
- Before retrying an uncertain accounting write, verify whether the prior attempt succeeded.

Test new rules on historical data and in staging before enabling production execution.

## 9. Architecture

Current infrastructure:

- **Cloudflare Workers** — connectors and autonomous processing.
- **Cloudflare D1** — events, routing, rules, statuses, and audit.
- **GitHub** — source control, tests, and automated deployments.
- **Official APIs and OAuth** — direct access to external systems.

Maintain independent, extendable modules:

- Source Connectors.
- Canonical Event Model.
- Entity & Account Mapping.
- Routing Engine.
- Reconciliation Engine.
- Accounting Rules Engine.
- Destination Connectors.
- Posting Orchestrator.
- Audit & Exception Management.

Each module should be independently extendable.

ChatGPT and Meridian may assist with configuration and diagnostics but **must not be required for autonomous LedgerSync execution**.

## 10. Unattended Operation

LedgerSync must autonomously ingest events on a schedule or through webhooks, classify them, post approved operations, verify results, safely recover from temporary failures, identify discrepancies, and report exceptions.

The user manages rules and exceptions, rather than each routine transaction.

## 11. Development Principles

1. Prioritize correct autonomous posting over reporting alone.
2. Prefer a universal core to one-off integrations.
3. Decouple sources and accounting destinations.
4. Preserve compatibility with other integrations.
5. Do not introduce infrastructure without demonstrated necessity.
6. Prefer official existing APIs and protocols.
7. Test in staging before production.
8. Do not post real accounting documents before the applicable rules and safety mechanisms are tested.
9. Automatically process operations covered by explicitly approved rules.
10. Never change the architectural objective merely to resolve a localized technical problem.

## 12. Initial Implementation

The first deployment is:

**Monobank → LedgerSync → QuickBooks VIVID**

It is a pilot of a universal platform, **not** an architectural limitation.

The first complete version must: ingest bank operations automatically; route to the proper company and account; avoid re-creating existing documents; post approved operations automatically; reconcile balances and results; send ambiguous cases to an exception queue; audit every action; and function without an open ChatGPT session or manual workflow trigger.

## 13. Success Criterion

LedgerSync succeeds when most routine source events become correct accounting entries without user involvement, and new sources, companies, and accounting destinations can be added without rewriting the core.

**LedgerSync is an autonomous accounting platform, not a bank-statement importer.**
