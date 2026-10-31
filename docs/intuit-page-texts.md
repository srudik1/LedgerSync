# LedgerSync — approved pages for Steven Rudik

Approved by Steven Rudik for staging validation and publication on 31 October 2026. Production availability must be verified after deployment.

---

Proposed route: `/privacy`
## Privacy Policy

Last updated: 31 October 2026.


### Operator and scope

Steven Rudik operates LedgerSync as a private accounting integration pilot. This policy describes LedgerSync's handling of information from authorized connections. LedgerSync is independent of Intuit and does not process your information on Intuit's behalf.


### Information processed

Connected financial sources can provide account identifiers, transaction identifiers, dates, amounts, currencies, descriptions, and raw transaction details, including counterparty information contained in those records. QuickBooks connection setup processes a company identifier (realm ID), OAuth authorization data, and access and refresh tokens. Where a QuickBooks data integration is enabled, it may process accounting records needed for the authorized workflow. Operational records include processing results, errors, timestamps, mappings, and audit records.


### Purpose

Information is used to provide the authorized accounting workflow: importing and normalizing events, routing them to the intended company and account, checking existing records, reconciling results, managing approved rules and exceptions, and diagnosing failures. The current QuickBooks pilot does not enable automatic accounting writes.


### Storage and providers

LedgerSync uses Cloudflare Workers for execution and Cloudflare D1 for stored records. The OAuth implementation encrypts access and refresh tokens using AES-GCM before storing them in D1; encryption keys and application credentials are configured separately from the source code. Connected providers process authorization and API requests under their own terms. Cloudflare infrastructure is distributed; this policy does not promise storage or processing in a particular country.


### Sharing and AI

Data is used for the private pilot and its authorized service providers and connected systems. The current implementation has no advertising, data-sale, or model-training workflow. A planned ChatGPT management interface is not part of the current autonomous processing implementation. Any future AI integration that receives customer data requires a review of its data handling and an updated disclosure before activation.


### Retention and disconnection

The current pilot does not implement a scheduled automatic deletion period. Imported records, connection credentials, and audit records can remain stored until the operator removes them. You can revoke the QuickBooks connection using QuickBooks connected-app controls; this prevents further authorized API access but does not itself delete previously imported records. Contact the operator to request access, correction, deletion, or termination of processing. Retention required by applicable law must be considered when handling a deletion request.


### Contact and changes

For privacy, access, correction, deletion, or support requests, contact Steven Rudik at srudik@gmail.com. Material changes to this policy will be shared with private pilot participants before new data uses are enabled.

---

Proposed route: `/terms`
## End-user License Agreement

Last updated: 31 October 2026.


### Operator and pilot access

LedgerSync is operated by Steven Rudik. These terms apply to expressly authorized private pilot use. Merely viewing these pages does not create a paid subscription or authorize access to financial accounts.


### Permission to use

The operator grants authorized pilot participants a limited, non-exclusive permission to use LedgerSync for their own authorized business workflows, subject to the terms expressly agreed with the operator. You must have authority to connect each source and QuickBooks company and to provide the data used by the service.


### Current functionality and approvals

The platform is designed for independent source connectors, company and account routing, reconciliation, approved accounting rules, verification, and audit. The current QuickBooks pilot is limited to connection setup and read-only integration work. Accounting writes require separately approved rules and operational controls. Connecting an account is not approval for every possible accounting operation.


### Your responsibilities

Use only accounts and records you are authorized to access. Review company and account mappings, test results, exceptions, and accounting outcomes. Do not disclose credentials or attempt to bypass access controls. You remain responsible for accounting, tax, and business decisions and for obtaining professional advice where needed.


### Third-party services

Intuit, financial providers, and infrastructure providers operate independently under their own terms. LedgerSync is not an Intuit product and does not provide banking, lending, investment advice, or payment execution. API availability and provider changes can affect the pilot.


### Privacy and termination

The Privacy Policy explains the current data handling. You may stop using the pilot and revoke access using the connected provider's controls. Contact the operator separately about deletion of previously imported data. The operator may pause the pilot to address errors, security issues, or unauthorized use.


### Pilot limitations and support

The pilot may contain errors, require manual intervention, or be unavailable. No uninterrupted availability, accounting accuracy, or production-readiness guarantee is made. These terms do not exclude rights or obligations that cannot lawfully be excluded. No fees, governing law, courts, or liability cap are specified here; any such terms require separate agreement.


Contact Steven Rudik at srudik@gmail.com for support or to discuss these terms.

---

Proposed route: `/connect`
## Connect or reconnect QuickBooks

This is the connection entry point for the private LedgerSync pilot, operated by Steven Rudik.


- Contact Steven Rudik at srudik@gmail.com to arrange pilot access or request a connection link.

- The operator starts an authenticated connection request and provides a short-lived Intuit authorization link.

- Open that link, sign in directly with Intuit, select the correct QuickBooks company, and review the requested access before approving it.

- After Intuit returns you to LedgerSync, check the connection result. If the link expires, request a new one.


Reconnecting uses the same process. Opening this page does not connect an account or grant access. Never send your Intuit password, verification code, client secret, or access token to the operator or enter it on this page.


Review the Privacy Policy and End-user License Agreement before connecting. For connection support, email Steven Rudik at srudik@gmail.com.

---

Proposed route: `/disconnect`
## Disconnect QuickBooks

A QuickBooks company administrator can revoke LedgerSync access using the connected-app management controls in QuickBooks Online. Select the LedgerSync connection and confirm disconnection there.


If you need assistance, contact Steven Rudik at srudik@gmail.com. Specify the company to disconnect, but do not send passwords or tokens.


Opening this page does not revoke access and is not confirmation that disconnection succeeded. Verify the result in QuickBooks.


Revoking access does not automatically delete records already imported into LedgerSync. Ask the operator separately to review and delete retained data and connection credentials, subject to applicable record-keeping requirements. Disconnection does not delete or change accounting documents in QuickBooks.
