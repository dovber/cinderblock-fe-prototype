# Regular Estimate feature readiness audit

Date: September 17, 2026

## Assessment

**Ready for engineering handoff.** The working prototype, authoritative
requirements, and relevant implementation agree on the reviewed happy paths.
The previously identified requirements drift and invented 7% Progress Invoice
tax default are resolved. No material product-rule contradiction, incorrect
happy-path calculation/state transition, or missing handoff requirement remains.

## Audit assumptions

- **Create invoice** may complete setup and open an unsaved **New invoice**
  editor. The editor's own **Create invoice** action then persists the completed
  invoice. Reusing the label at those two boundaries is intentional.
- Inside setup, use **Continue** only when another configuration step follows;
  use **Create invoice** when setup is complete and the editor opens.
- Existing product sections outside prototype scope may remain visible and inert
  for structural fidelity, provided they have no affordances implying
  interaction. They are not broken navigation or handoff blockers.
- The Draft milestone **Invoiced** date presentation is not evaluated as a
  blocker in this pass.

## Resolved product decisions

### Standard Invoice lifecycle

Standard Invoice is present to demonstrate the choice between flexible Standard
Invoicing and tracked Progress Invoicing. Its complete existing lifecycle is out
of scope for this prototype. The static Draft treatment is intentional and does
not require a prototype Draft-to-Open flow.

### Standard conversion and Payment Schedule persistence

The prototype may visually remove the Payment Schedule when Standard Invoice is
confirmed. In production, removal must commit only when the Standard Invoice is
successfully created. Abandoning an unsaved invoice must preserve the schedule.
This is an implementation acceptance requirement rather than additional
prototype lifecycle work.

### Contract-derived Cost Plus

Cost Plus cannot be introduced, removed, or changed from a Progress Invoice or
Change Order. Both documents carry the accepted contract percentage, display it
read-only when applicable, and display the calculated fee. An economic adjustment
that resembles Cost Plus must be represented explicitly with Change Order line
items.

### Shared contract Discount Pool

The contract Discount Pool is the sum of the Estimate discount and discount
contributions from all Accepted Change Orders. Draft and Pending Change Orders do
not contribute. Contributions from multiple Accepted Change Orders accumulate
and reduce Contract Value.

Progress Invoices consume the combined pool. Draft reservations and posted
consumption reduce the available balance, canceled invoices restore it, and an
invoice cannot exceed what is currently available. A positive Change Order
discount increases the contractual pool; a negative Change Order discount
reduces it and increases Contract change, but may never make the resulting pool
negative.

### Contract-derived tax

Progress, Contract, retainage, and other contract-derived invoice flows inherit
the applicable Accepted Estimate/contract tax configuration and component
taxability through the product's existing tax behavior. They do not establish a
flow-specific default rate. The invoice Draft stores the resolved tax facts.

## Implementation guidance

Use these as acceptance criteria when building the production feature:

- keep Standard Invoice's existing lifecycle outside the new contract-billing
  implementation;
- persist Standard conversion and Payment Schedule removal atomically with a
  successful Standard Invoice create operation;
- source Cost Plus from accepted contract terms and reject invoice or Change
  Order attempts to override it;
- calculate total Discount Pool contributions from the Estimate and Accepted
  Change Orders only;
- subtract every active Draft reservation and posted invoice application when
  calculating available discount;
- accept signed Change Order discount adjustments while rejecting any negative
  adjustment that would take the resulting contractual pool below $0; and
- continue rejecting a Progress Invoice discount greater than the available pool.

Mixed line and Cost Plus taxability follow the underlying contract configuration
and the platform's existing tax engine; this feature does not define another tax
source or expand tax-system scope.

## Re-audit evidence

- Live happy paths verified Standard vs Progress type CTAs, Payment milestone
  copy and conditional CTA, Apply discount? blank-as-zero behavior, 0% inherited
  tax in the New invoice editor, and Change Order Add item population without a
  carried-line lock indicator.
- Financial/model coverage passes 83 tests, including signed CO discounts,
  discount-pool floor, inherited 0% and nonzero tax, retainage tax inheritance,
  milestone linkage, reservations, posting, and contract revisions.
- TypeScript build and ESLint both pass.
