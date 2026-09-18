# Contract Billing PMM + GC readiness assessment

Updated September 16, 2026 after the approved requirements review. This report
assesses product-flow completeness rather than prototype polish or intentionally
inert controls. The canonical rules remain in
`docs/contract-billing-business-rules.md`.

## Current assessment

| Flow | Ease of use | Production readiness | Requirements quality |
| --- | ---: | ---: | ---: |
| Progress / Contract Invoice | 8.5 / 10 | 8 / 10 | 9 / 10 |
| Change Order | 8 / 10 | 7.5 / 10 | 8.5 / 10 |
| Payment Schedule | 8.5 / 10 | 8 / 10 | 9 / 10 |

The product model is ready for an implementation vertical slice. The previous
high-risk ambiguities now have one rule: users may change the current end of the
financial chronology, while later dependent financial state locks earlier
documents. Draft reservation, Open posting, accepted contract revisions, and
schedule presentation now use that rule consistently.

## Progress / Contract Invoice

The happy path is clear: choose scope, save a Draft, review it, and post it by
changing status to Open. Drafts reserve line and discount capacity without
affecting Previously Billed, Contract Progress, or Total Invoiced. Open is the
posting event. The latest active unpaid tracked invoice may be financially
edited or canceled; a later active tracked invoice or accepted contract
revision locks it. Payment operations remain independent of that financial lock.

The requirements are strong enough for development because they distinguish:

- immutable billing chronology from mutable dates;
- customer-facing Previously Billed from authoritative allocation availability;
- gross scope consumption from discounts, tax, retainage, and payments;
- financial locks from ordinary nonfinancial document behavior;
- prototype behavior from backend revision, concurrency, tax, and audit controls.

The remaining production work is technical definition rather than product-flow
discovery: persist a deterministic invoice sequence, define the exact server
command preconditions, document fixed-decimal rounding, and map existing payment
permissions to the new financial lock. These belong in API and acceptance-test
design before broad implementation.

## Change Order

The main GC flow is coherent: select zero or more removals, add new scope, save or
send, accept, then bill the revised contract through a new tracked invoice. Named
$0, additive, deductive, mixed, and net-zero changes are supported. Multiple open
COs may affect different source lines, while line-scoped reservations prevent two
open COs from modifying the same source.

Acceptance creates a new contract revision. It atomically cancels any tracked
Draft and locks Open invoices from the preceding revision. Every Accepted CO is
financially immutable; corrections use another CO. Accepted COs cannot be
declined or canceled.

Before production build-out, engineering and design should specify the stale-link
customer page, the exact audit events for sent/accepted/superseded revisions, and
the conflict response when parallel CO acceptance or line reservation loses a
race. The desired outcomes are decided; the remaining gap is contract-level API
shape and error recovery copy.

## Payment Schedule

The schedule is an advisory planning layer on Gross Contract Scope. Percentage is
canonical even when a user enters dollars, future contract changes reproject
unfulfilled milestones, and invoice allocation remains the authority for what
can be billed. Overallocated schedules remain editable and do not trigger a
variance subsystem or automatic rebalancing.

The milestone lifecycle is now explicit:

- **Planned:** no active invoice; Create invoice may be available.
- **Draft invoice:** neutral styling, document-dollar icon, linked invoice ID and
  Draft badge; the milestone is occupied but not fulfilled.
- **Invoiced:** Open is posted, so the existing green/checkmark treatment applies.

Canceling or deleting a Draft returns the milestone to Planned. Validly canceling
or canceling the latest eligible Open invoice does the same while history remains
auditable. At $0 Gross Contract Scope, percentage milestones remain valid and
project $0; dollar entry is disabled until scope becomes positive.

The remaining production choices are limited: decimal precision for stored
percentages, display rounding, and the transaction boundary that changes a
milestone from Draft invoice to Invoiced as its invoice posts.

## Recommended build sequence

1. Implement the contract revision and deterministic invoice sequence primitives.
2. Build Draft reservation and Draft-to-Open posting as one vertical slice.
3. Add latest-active invoice edit/cancel guards while retaining payment
   operations.
4. Add CO acceptance as an atomic contract-revision transaction, including Draft
   cancellation and prior-Open locking.
5. Add revision-specific Estimate/CO acceptance links and stale-link rejection.
6. Layer Payment Schedule presentation and associations over the same invoice
   lifecycle.
7. Run golden calculation and concurrency tests for discount, tax, retainage,
   over-invoicing, parallel COs, and stale financial writes.

The prototype is close enough to start building. The critical product decisions
are settled; production readiness now depends on encoding them as server-side
invariants and transaction tests rather than inferring them from UI state.
