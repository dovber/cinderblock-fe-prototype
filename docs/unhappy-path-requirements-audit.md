# Contract Billing unhappy-path requirements audit

Updated September 17, 2026 after the product-decision review.

This audit does not assign a numerical readiness score. The frontend prototype
validates consequential interactions and user-visible states; the authoritative
requirements and production tests own exhaustive backend integrity. A documented
rule is not a prototype gap merely because the prototype does not execute it.

## A. Should be demonstrated in the prototype

| Unhappy path | Prototype disposition |
| --- | --- |
| CO acceptance would make Contract Value negative | Demonstrated: acceptance is rejected without clamping, the CO remains unaccepted, and a clear error is shown. |
| Empty or otherwise meaningless CO acceptance; dirty CO status transition | Demonstrated: acceptance requires a meaningful saved revision, and dirty financial edits must be saved first. |
| CO discount adjustment would reduce the Discount Pool below $0 | Demonstrated with inline rejection; invoice discount allocation remains separately bounded from $0 through the available pool. |
| CO acceptance collides with an active tracked Draft | Demonstrated: the CO is accepted, the Draft is canceled, reservations and milestone association are released, history remains visible, and the contractor is notified. |
| On-acceptance invoice automation collides with an existing Draft | Demonstrated with the existing Draft preserved and an explanatory conflict state. |
| Invalid invoice setup or editor values | Demonstrated for amount/percentage boundaries, unavailable scope, invoice and due dates, discount availability, and retainage capacity. |
| Fully invoiced, non-billable, locked, and over-invoiced contract states | Demonstrated through focused scenarios and explicit eligibility/summary treatment. |
| Final invoice leaves contractual discount unused | Demonstrated as a warning rather than silently reallocating the discount. |
| Payment Schedule projection or invoice actual creates an overage | Demonstrated as advisory state without forced rebalance or blocking. |
| Customer opens a superseded Estimate/CO acceptance link | Candidate for a focused demonstration because it is customer-facing. The required state and recovery direction are already explicit; no additional prototype was authorized in this pass. |

## B. Requirements and production tests only

| Rule family | Required production coverage |
| --- | --- |
| Atomic reservations and posting | One active tracked Draft; atomic scope, Cost Plus, discount, retainage, and Tax Credit reservations; all-or-nothing posting and release. |
| Revision and concurrency safety | Contract revision checks, optimistic versions, stale-write rejection, parallel CO creation/acceptance, line-reservation races, and no lost updates. |
| Idempotency and numbering | Idempotent acceptance/posting, durable monotonic document numbering, and no reuse of historical numbers. |
| Accounting invariants | Fixed-decimal arithmetic, deterministic rounding/remainder allocation, immutable source lineage and invoice snapshots, and reconciling ledgers. |
| Tax and Tax Credit accounting | Inherited tax configuration, persisted component taxability and historical attribution, and Generated/Reserved/Consumed/Released Tax Credit events. |
| Cancellation transaction integrity | Complete release/reversal of scope, Cost Plus, discount, retainage, Tax Credit, and milestone association with chronology preconditions. |
| Integration isolation | A valid local operation is not rolled back by QuickBooks or another downstream integration failure. |
| Server enforcement of user-visible guards | The backend repeats the meaningful-saved-CO, nonnegative Contract Value, discount-floor, scope, chronology, and capacity validations shown by the UI. |

## C. Existing platform behavior

| Concern | Reused Cinderblock behavior |
| --- | --- |
| Draft deletion and eligible Open cancellation presentation | Existing invoice confirmation, reason, payment prerequisite, history, and recovery UX; Contract Billing adds the documented financial release/reversal effects. |
| Save/network failures and stale-write conflicts | Existing application error and retry treatment, with unsaved editor state preserved after a failed write. |
| Unsaved-change navigation | Existing editor discard/navigation convention. |
| Permissions | Existing Financial-area permissions and corresponding Estimate, Change Order, Invoice, payment, and retainage access rules. |
| Payment lifecycle | Existing payment, reversal, and invoice-cancellation behavior; Contract Billing does not define another payment state machine. |
| Standard Invoice lifecycle after handoff | Existing Standard Invoice editor, save, status, send, payment, and cancellation behavior. |

## D. Product decision required

No contract-billing-specific product decision is currently unresolved. Two
conditional platform questions remain for implementation discovery:

- If Cinderblock has no applicable unsaved-change convention, define one at the
  platform level.
- If a new action cannot map to the current Financial-area permission model,
  resolve that permission at the platform level before production delivery.

These are not current Progress Billing defects and do not justify inventing
prototype-only behavior.

## Reassessed findings

### Engineering blockers

None identified after the approved calculation and CO-acceptance fixes. Production
engineering must still implement and test the category B safeguards before launch.

### Requirement gaps

None material remain in the audited areas. Cancellation/recovery effects, inherited
read-only tax, saved-revision CO acceptance, failed-write state preservation, and
permission reuse are explicit in the authoritative requirements.

### Prototype UX gaps

No approved must-fix gap remains. A superseded customer acceptance-link state is
the only additional category A candidate; its behavior is already specified, so
it can be added later if product/design review would benefit from seeing it.

### Existing platform behavior

Engineering should confirm the referenced cancellation, payment, error/retry,
dirty-navigation, and permission conventions during implementation discovery and
reuse them rather than creating feature-specific alternatives.

### Optional enhancements

Confirmation dialogs, consequence summaries, or mandatory reasons for contractual
status actions remain optional design recommendations. They are not requirements
or blockers without a separate product decision or an applicable Cinderblock
convention.
