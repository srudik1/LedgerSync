# LedgerSync Intuit pages — operator review

Operator confirmed by the user: **Steven Rudik**, acting personally.

Support/privacy email: **srudik@gmail.com**, read from the Intuit account profile after the user authorized use of that profile email.

These changes are drafts for review on a feature branch. They do not publish pages, deploy production, change credentials, or submit the Intuit questionnaire.

## Proposed production form values after publication and verification

| Intuit field | Proposed value |
| --- | --- |
| Host domain | ledger-sync.srudik.workers.dev |
| Launch URL | https://ledger-sync.srudik.workers.dev/launch |
| Connect/Reconnect URL | https://ledger-sync.srudik.workers.dev/connect |
| Disconnect URL | https://ledger-sync.srudik.workers.dev/disconnect |
| End-user license agreement URL | https://ledger-sync.srudik.workers.dev/terms |
| Privacy policy URL | https://ledger-sync.srudik.workers.dev/privacy |

These URLs are planned routes, not a claim that the current production deployment serves the pages.

## Deliberate limits

- Connect and disconnect pages provide accurate instructions for the operator-managed private pilot; they do not implement new authentication or revoke credentials.
- The existing authenticated OAuth start and callback are unchanged. No administrator secret is placed in a browser form or URL.
- The existing root JSON response, health endpoint, Monobank logic, cron, and accounting write restrictions are preserved.
- Policies describe stored raw bank events, encrypted OAuth tokens, operational records, the lack of automatic retention deletion, and manual deletion requests.
- No legal entity, registration number, unconfirmed contact details, jurisdiction, fixed hosting country, retention deadline, certifications, or unimplemented access-control features are invented.
- The planned ChatGPT control plane is identified as planned, rather than an active data recipient.
- No assertion that the application has passed Intuit security review or live sandbox connect/disconnect testing is made.

## Before publication or form submission

1. The operator must review the proposed privacy practices and license terms. The user-selected Intuit profile email, srudik@gmail.com, is now included for public support and privacy requests.
2. Validate the change in staging as required by AGENTS.md, without enabling accounting writes. Then approve publication and verify all production routes.
3. Remove draft/proposed wording from final approved terms before treating the policies as final. The contact method is confirmed.
4. Only then use the verified public URLs in Intuit. Complete remaining compliance questions based on actual deployed capabilities and user-confirmed organizational facts.
5. Show completed form values to the user before final submission, as requested.
