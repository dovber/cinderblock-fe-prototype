# Contract billing business rules

Updated September 16, 2026. These decisions are authoritative for Regular
Estimate, Progress/Contract Invoice, Change Order, Payment Schedule, Standard
Invoice conversion, and Retainage behavior. They supersede conflicting wording
in the feature-specific prototype documents.

The normative formulas, persisted allocation records, ledger event matrix,
accounting treatment, and deterministic fixtures are in
[`contract-billing-financial-spec.md`](contract-billing-financial-spec.md).
Future QuickBooks Online document mapping, sync ownership, concurrency, and
conflict handling are defined separately in
[`quickbooks-online-sync-requirements.md`](quickbooks-online-sync-requirements.md).

## Canonical Contract and Progress billing model

Progress Invoicing always operates against a Contract. Accepting an Estimate
establishes that Contract. Before any Accepted Change Order exists, the Contract
is the Accepted Estimate. Each Accepted Change Order revises that same Contract,
so the current Contract is the Accepted Estimate plus all Accepted Change Orders.
There is no Estimate-level Progress accounting model that later becomes a
Contract-level model.

The first Accepted Change Order does not create a new billing model or ledger,
migrate or reset billing history, remap Estimate lines to Change Order lines, or
recreate contract pools and reservations. Existing invoice allocations, source
history, Discount Pool, Cost Plus state, Tax Credit Balance, Retainage state,
Payment Schedule, and Draft reservations continue against the same Contract.
Acceptance creates a new contract revision and applies the existing revision and
Draft-collision rules.

The Contract aggregates accepted source lines without flattening their lineage.
Every accepted Estimate or Change Order source line retains its source identity,
accepted quantity and value, posted and reserved allocations, and remaining
billable allocation. A Change Order may add, remove, replace, or otherwise modify
scope without a one-to-one mapping to an Estimate line. Historical billing is
never redistributed merely to make revised source lines appear complete.

## Invoice lifecycle and posting

The canonical lifecycle is:

`Draft → Open → Partially Paid → Paid`

`Open` is the posting and recognition event. Delivery to the customer and
external accounting synchronization are separate concerns.

A saved Draft reserves contract-line capacity and its selected discount amount.
It contributes nothing to Total Invoiced, Previously Billed, Contract Progress,
or recognized retainage. Opening the invoice converts those reservations into
posted allocations. Open, Partially Paid, and Paid are posting states. An Open
invoice cannot return to Draft.

Only the latest tracked Open invoice in the contract's deterministic billing
sequence remains financially editable, and only while it has no applied
payments. Saving a subsequent tracked Draft locks every preceding Open invoice.
Deleting or canceling that Draft may make the preceding Open invoice editable
again when no other subsequent active tracked invoice exists. The eligible Open
invoice continues to contain every applicable contract line; setting This
Invoice to zero removes that line's current allocation. Saving recalculates line
availability, Gross Scope Invoiced, Contract Progress, Total Invoiced, discount
consumption, retainage, tax, and invoice totals. The invoice remains Open.

**Previously Billed** is posted tracked billing from invoices preceding the
current invoice in the persisted billing sequence. Later invoices never become
Previously Billed on an earlier document. Production persists immutable ordering
information and does not derive chronology solely from mutable invoice dates or
timestamps. Customer-facing Previously Billed is historical presentation, not
the availability ledger. Availability separately accounts for all posted
allocations, active Draft reservations, current accepted scope, and applicable
Change Order supersession.

Each saved tracked invoice persists the accepted Contract revision and
source-line financial snapshot used to create it. Later Contract revisions affect
only future invoices and current Contract summaries. Reopening, editing,
exporting, or sharing an earlier invoice must not add later source lines or change
its recorded Contract Amounts, quantities, allocations, tax facts, Cost Plus
facts, or other financial values.

Financial edits are audited with sufficient before/after detail. Current invoice
state is authoritative for customer rendering. No separate customer-facing
revision object or parallel invoice version workflow is created.
When the customer may already have seen the invoice, saving an Open-invoice edit
requires confirmation that **The customer may be unaware of these changes.** The
system does not automatically notify the customer or create a replacement
revision. The current invoice remains authoritative, and the contractor may use
the existing send/share behavior when they want to deliver the update.

Once any payment exists, financial editing is locked. If an invoice edit and a
payment application race, the first successful commit wins; the second fails
cleanly and requires current state to be reloaded.

In the prototype, a saved Draft becomes Open by clicking its status badge and
selecting **Open**. Payment Schedule automation may create a Draft, but it does not
bypass this explicit status transition.

Only the latest active tracked invoice may be financially edited or canceled,
subject to the normal payment restrictions. Cancellation preserves
history and its number, reverses posted line allocations and retainage
recognition, restores applied discount, and updates contract and milestone
projections. A preceding invoice cannot be canceled after a later active tracked
invoice depends on it, even when the preceding invoice is unpaid. Removing the
later Draft may restore eligibility when no other downstream dependency exists.

The financial lock does not lock payment activity. Payments may still be
applied, voided, refunded, or unapplied under ordinary payment rules. Those
operations affect payment and Accounts Receivable state; they do not reverse the
invoice's contract allocations or make an earlier invoice financially editable
or cancelable again.

## Financial definitions

**Gross Contract Scope** is accepted line-item scope plus applicable Cost Plus,
before discount, tax, retainage, or payments.

**Contract Value** is Gross Contract Scope less accepted contract discount. Tax
is excluded. Contract Value may equal zero and may never be negative. Estimate
acceptance and Change Order acceptance must reject a financial state that would
make the complete accepted Contract Value negative; a negative individual Change
Order remains valid when the resulting contract stays at or above zero.

**Terminology:** Contract Value is the overall current accepted contract-level
value. Contract Amount is reserved for the original accepted gross amount of one
specific contract line as displayed in Progress/Contract Invoice tables. Contract
Amount is not an alternate name for Contract Value.

**Contract Progress** is posted Gross Contract Scope Invoiced divided by Gross
Contract Scope. Cost Plus contributes; discount, tax, retainage, and payments do
not. The displayed bar caps at 100 percent. Any over-invoiced amount is displayed
separately.

**Total Invoiced** is posted Gross Contract Scope Invoiced less discount actually
applied to posted invoices. Tax is excluded. Retainage and payments do not reduce
it.

**Not yet invoiced subtotal**, also displayed as **Remaining subtotal** in the
Progress Invoice creation flow, is the current Contract's remaining gross scope:
`max(0, Gross Contract Scope − posted Gross Contract Scope Invoiced)`. It includes
associated Cost Plus scope and is before discount, tax, retainage, and payments.
Active Draft reservations reduce the amount available to a new Progress Invoice.
The value is reconciled from the source allocation ledger, including accepted
supersession and deductive scope; it is not a naive sum of positive-looking line
balances and does not require or create Estimate-to-Change-Order line mappings.
Actual selection is constrained by both this Contract-level availability and each
eligible source line's remaining allocation. Historical allocations remain on
their original lines even when revised scope means an individual current line
does not reach 100 percent at Contract completion.

Remaining subtotal is distinct from the Contract summary's net **Remaining**
amount. Contract summary Remaining is `Contract Value − Total Invoiced` and may
reflect applied or unapplied discount. The Progress Invoice creation prompt must
not subtract the Contract Discount Pool from Remaining subtotal. Scope selection
answers how much underlying gross Contract scope remains available; the separate
Discount Pool step answers how much contractual discount remains available to
apply.

## Contract billing state

Contract billing state belongs to the current Contract, not to an
individual Estimate or Change Order source document:

- **Accepted** — the Contract is accepted and has no posted tracked Progress
  billing.
- **Partially Billed** — posted tracked Progress billing exists and the
  current Contract has remaining uninvoiced gross scope.
- **Billed** — posted tracked Progress billing exists and the current Contract
  has no remaining uninvoiced gross scope under the existing completion and
  over-invoicing rules.

A Draft reserves scope but does not by itself move the Contract out of Accepted,
because Draft allocations are not posted billing. Accepting positive Change Order
scope after a Contract was Billed returns the Contract to Partially Billed
when prior posted billing exists and the revised Contract has remaining scope.
The original Estimate and every Accepted Change Order display that same Contract
Billing state wherever Contract billing status is the applicable
document-status presentation. A Change Order is never independently marked
Billed based only on its own source lines.

Change Order approval lifecycle state remains separate: Draft, Pending, Accepted,
Declined, and Canceled continue to describe the CO's approval history, even when a
surface presents the Contract's billing status. Standard Invoice and Progress
Invoice flows share **Billed** as the completed Contract status, even though the
Standard Invoice remains a separate full-scope copy/conversion path and does not
participate in tracked Contract Progress.

### Contract Progress consistency scenarios

- An Accepted $100,000 Estimate immediately establishes a $100,000 Contract; no
  parallel Estimate Progress model exists.
- With $40,000 posted, the Contract is Partially Billed and has $60,000 Not yet
  invoiced subtotal before active Draft reservations.
- With the full $100,000 posted, the Contract is Billed and Not yet invoiced
  subtotal is $0.
- If a +$10,000 CO is then Accepted, the current Contract is $110,000, prior
  $100,000 billing remains on its original source scope, Not yet invoiced subtotal
  is $10,000, and the Contract returns to Partially Billed.
- If a +$20,000 CO is Accepted while $40,000 of a $100,000 Contract is posted,
  the current Contract is $120,000, the $40,000 history is unchanged, the new CO
  lines become additional source scope, and the Contract remains Partially
  Billed.
- A deductive CO changes current accepted source scope without redistributing
  historical allocations. Existing over-invoicing, Tax Credit, and correction
  rules govern when revised scope falls below posted billing; no line mapping is
  introduced.
- A Contract discount never reduces Not yet invoiced subtotal or Remaining
  subtotal. Discount availability and consumption remain in the separate Discount
  Pool.
- An active Draft reserves Contract and source-line availability, but remains
  excluded from posted billing, Contract Progress, and billing status.

## Discount pool

The Accepted Estimate discount and discount adjustments from Accepted Change
Orders create one finite contract-level Discount Pool. Draft, Pending, Declined,
and Canceled Change Orders do not modify it. Invoice creation first selects gross
scope, then asks for the discount to apply. The recommendation is:

`Original Accepted Discount × (current gross scope selected ÷ original Gross Contract Scope)`

The recommendation is capped at the remaining pool. It never redistributes a
previously unused recommendation across remaining scope. The user can choose any
amount from zero through the available pool.

A Draft reserves its selected discount. Opening consumes it. Deleting or
canceling a Draft releases it; canceling a posted invoice restores it.
The contractor does not have to exhaust the pool. Billing 100 percent of gross
scope while leaving discount unused may make Total Invoiced exceed Contract
Value; that is reported as over-invoiced. When the user opens the invoice that
consumes the final remaining gross scope while discount remains available, show
a warning with the unused amount. The normative predicate is `Current Invoice
Gross Allocation = Remaining Gross Contract Allocation`; net invoiced totals are
not used. The warning does not block opening the invoice.

A Change Order does not automatically resize an existing discount, but it may
explicitly adjust the contractual discount in either direction. A positive CO
discount increases the Discount Pool and reduces the Change Order's Contract
change. A negative CO discount reduces the Discount Pool and increases the
Change Order's Contract change by the same amount, all else equal. The combined
Accepted Estimate and Accepted Change Order Discount Pool may never be less than
$0; a CO adjustment that would cross that floor is invalid. Once the Change
Order is accepted, its signed adjustment becomes part of the contractual pool
used for subsequent Progress Invoices. Adjustments from multiple Accepted Change
Orders accumulate.

Progress Invoices only allocate and consume the combined pool; an invoice-level
discount does not modify the underlying contractual discount. A Draft reserves
its selected nonnegative amount and an invoice cannot apply less than $0 or more
than the available pool. Available discount is the contractual pool less discount
reserved or consumed by active invoices.

## Cost Plus, tax, and retainage

Cost Plus is a document-level Estimate term calculated from customer-facing
selling Price. Internal Cost is irrelevant: `Cost Plus Amount = Selling Price ×
Cost Plus %`. The amount is explicit contract scope with lineage to the priced
line that generated it. Progress Invoices and Change Orders inherit the accepted
percentage as read-only. Every Change Order addition and full-negative removal
participates, so removing scope also removes its associated Cost Plus scope.

The applicable Cost Plus percentage originates with accepted contract scope. A
Progress Invoice or Change Order may display the percentage and calculated fee,
but the percentage is read-only on both documents. Neither document can
introduce, remove, or modify the rate. A contractor who needs an economic
adjustment uses explicit Change Order line items. An invoice consumes existing
Cost Plus scope in the same proportion as its associated base scope. It never
calculates Cost Plus again over an invoice subtotal or over Cost Plus scope.
Production tracks Cost Plus Contract Scope, Draft Reserved, Posted, and Remaining
while preserving source lineage. Cost Plus taxability is an independent contract
setting and is not inferred from the underlying line's taxability.

Tax is outside Gross Contract Scope and Contract Value. Progress, Contract,
retainage, and other contract-derived invoice flows inherit the applicable tax
configuration and per-component taxability from the underlying Accepted
Estimate/contract through the product's existing tax behavior. They do not
select or invent an independent tax rate. A Change Order does not establish tax.
The invoice Draft resolves that inherited configuration, calculates tax, and
stores the resulting tax facts; it is not rerated merely because the Draft is
opened. Historical invoices preserve their original tax. These requirements do
not redefine the platform's existing tax engine. A tracked-invoice editor
displays the resolved tax configuration as inherited, read-only information; it
must not offer an independent rate override.

When an Accepted deductive Change Order removes scope that was previously
invoiced with tax, the actual historical tax attributed to that removed scope
creates a **Tax Credit Balance**. The balance is separate from contract value,
contract progress, Total Invoiced, discount, and retainage. It offsets only tax
calculated on future normal invoices and never reduces principal or general
Accounts Receivable. A Draft reserves the amount it intends to apply; edits
recalculate the reservation, deletion or cancellation releases it, and Draft →
Open consumes it. Excess remains visible for manual settlement. V1 does not
create an automatic refund or credit memo. Production persists historical
invoice-to-source allocation facts and Generated, Reserved, Consumed, and
Released Tax Credit ledger events.

### Golden Cost Plus examples

- **Full line:** $10,000 at 10% produces $1,000 Cost Plus
  and $11,000 Gross Contract Scope.
- **Partial billing:** the same line billed at 40% consumes $4,000 underlying
  scope and $400 Cost Plus, for $4,400 Gross Contract Scope consumed.
- **Deductive CO:** removing the full eligible $10,000 line removes the related
  $1,000 fee, for an $11,000 reduction in Gross Contract Scope before discount.
- **Additive CO:** a new $5,000 line at the inherited 10% rate adds $500 Cost
  Plus and $5,500 Gross Contract Scope.

### Golden tax examples

The following examples use an 8% tax rate and round the document result to cents.
Discount is allocated proportionally across taxable and non-taxable billed value
before tax is calculated.

- **Fully taxable:** $10,000 taxable billed value produces $800 tax.
- **Non-taxable:** $10,000 non-taxable billed value produces $0 tax.
- **Mixed:** $6,000 taxable plus $4,000 non-taxable produces $480 tax.
- **Partial taxable line:** billing 40% of a $10,000 taxable line produces a
  $4,000 taxable base and $320 tax.
- **Discount:** on the mixed $10,000 invoice above, a $1,000 discount allocates
  $600 to taxable value and $400 to non-taxable value. Taxable value becomes
  $5,400 and tax is $432.
- **Taxable Cost Plus:** $4,000 taxable underlying scope plus independently
  taxable $400 Cost Plus creates a $4,400 taxable base and $352 tax. If Cost Plus
  is configured nontaxable, the taxable base remains $4,000 and tax is $320.
- **Rounding:** $100.01 at 8.25% produces $8.250825 and rounds to $8.25 under the
  fixed-decimal policy.
- **Transaction change:** reducing taxable billed value from $5,000 to $4,000
  recalculates tax from $400 to $320. Tax remains outside Gross Contract Scope,
  Contract Value, Contract Progress, and Total Invoiced.

Retainage is withholding. It does not reduce Gross Contract Scope, Contract
Progress, or Total Invoiced. It affects amount due and Accounts Receivable and
recalculates when an editable invoice changes. Retainage applies to principal
after discount and before tax. Tax is not retained, and a retainage release
invoice does not create a second tax event.

## Estimate and Change Order locking

An Accepted Estimate can have financial terms edited only when there are no saved
invoices, including Drafts, and no saved Change Orders, including Drafts. Editing
removes Accepted and requires reacceptance. Any saved invoice or Change Order
locks the original Estimate's financial lines. Deleting the only Draft Change
Order restores eligibility if no other invoice or Change Order exists.

An Accepted Change Order is financially immutable. Corrections use another
Change Order; Accepted never returns to Pending and is never reaccepted. Draft
and Pending financial edits remain revision-specific, invalidate older customer
acceptance links, and require the current revision to be accepted. An Accepted
CO cannot become Declined or Canceled.

Multiple Draft and Pending Change Orders may exist on one contract. Reservation
and conflict protection are line-scoped: the same accepted contract line cannot
participate in more than one Draft or Pending CO at a time. The backend enforces
this rule atomically. Unrelated lines remain available for parallel COs. Declined,
Canceled, and deleted COs release open reservations; normal accepted lineage and
removal eligibility rules then apply.

CO numbering is assigned atomically at contract level using
`{EstimateID}-CO1`, `{EstimateID}-CO2`, and so on. Concurrent creation cannot
produce duplicate identifiers, and numbers assigned to saved historical
documents are not reused. Parallel acceptance of independent COs is idempotent
and transaction-safe.

Change Orders follow Estimate zero-value rules. A named $0 line and a complete
$0 Change Order are valid. The product does not introduce separate schedule,
responsibility, administrative, or non-financial Change Order document types.

Customer acceptance of a Change Order cannot be blocked by an internal invoice
Draft. Acceptance atomically accepts the Change Order, cancels the Draft,
releases its line and discount reservations, and preserves the canceled Draft in
history. No special v1 alert is required.

Accepting a Change Order establishes a new accepted contract revision. Existing
tracked Open invoices based on the preceding revision remain valid for payment
activity but become financially locked. Newly accepted or modified CO scope must
be billed through a new tracked invoice created against the new revision; it may
not be added retroactively to an older Open invoice.

Estimate acceptance and pre-acceptance Change Order acceptance are bound to the
exact saved document revision presented through the customer link. A financial
edit before acceptance saves a new revision, invalidates the previous link,
creates a current link, and requires acceptance of that revision. Accepted
Change Orders are immutable. At acceptance time the backend validates that
the submitted revision is still the current acceptable revision; a stale link
cannot accept a newer document. History preserves sent, accepted, superseded,
and invalidated revisions with acceptance actor and timestamp. The customer page
for a stale link explains that the document was updated and directs the customer
to the latest link.

Over-invoicing caused by a deductive Change Order is informational in v1. The
system does not automatically recover principal, create a refund or negative
invoice, or rebalance, and does not block Change Order acceptance. The separate
Tax Credit Balance still applies to historical tax on removed scope.

## Payment Schedule

The Payment Schedule is an advisory, percentage-driven planning layer based on
**Contract Value**: accepted line-item scope plus document-level Cost Plus,
after accepted contract discount and before tax, retainage, and payments. It does not reserve
contract scope. Eligible pre-lock Estimate edits preserve the schedule and
recalculate amounts. Estimate acceptance does not lock schedule editing.

For example, $100,000 in accepted line scope plus $10,000 Cost Plus, a $5,000
discount, $7,000 tax, and 10% retainage produces a $105,000 Payment Schedule
basis. A 20% milestone projects $21,000. Invoice tax and retainage may
make the invoice total and Amount Due differ from that projection.

Creating an invoice from a milestone defaults gross allocation to `Milestone % ×
Gross Contract Scope` and suggests `Milestone % × applicable original Contract
Discount`, capped at the remaining Discount Pool. Therefore gross allocation
minus suggested discount equals the milestone's percentage of Contract Value.
The suggestion is optional, and earlier discount variance is not redistributed.
The saved milestone actual is the resulting net contract billing after the
discount actually chosen.

A milestone exposes editable Percentage and Amount fields together; there is no
entry-mode switch. Percentage entry accepts at most three decimal places and
produces a currency-rounded milestone Amount. Amount entry stores the exact
currency amount and derives a precise percentage anchor, while the UI displays
that percentage rounded to at most three decimal places. The milestone Amount is
authoritative for billing, schedule totals, and validation; calculations never
reconstruct it from the rounded display percentage. If Contract Value changes,
an unfulfilled milestone uses its precise percentage anchor to recalculate and
store its projected amount. Company Settings presets, when implemented, store percentages
only. Selecting a milestone for a Progress Invoice always defaults invoice entry
to Percent and prepopulates the canonical milestone percentage.

Each milestone may be associated with only one invoice. Splitting a phase into
multiple draws requires multiple milestones. When an actual invoice differs from
the planned milestone, other milestones retain their percentage anchors. The
system does not rebalance future milestones.

A milestone has one of three conceptual states. **Planned** has no active invoice
and may offer Create invoice. **Draft invoice** has one associated tracked Draft,
shows its linked invoice and provisional amount with neutral treatment, and does
not offer another Create invoice. It is not fulfilled. **Invoiced** begins when
the associated Draft becomes Open and uses the fulfilled treatment. The
milestone preserves its stable ID, name association, and planned percentage while
separately showing actual net contract billing by the associated invoice.
Editing the eligible latest unpaid Open invoice updates that actual. Deleting or
canceling a Draft returns the milestone to Planned. Validly canceling
the latest eligible Open invoice also returns it to Planned. The live schedule
shows only the current active association. Each invoice preserves an immutable
snapshot of its milestone name, percentage, and relevant planned context; later
schedule edits do not rewrite canceled invoice history.

Each milestone stores its optional planned date separately from the linked
invoice date. Creating or posting an invoice never overwrites the planned date.

When Contract Value is zero, percentage milestones remain valid and
project $0. Dollar entry is unavailable because no percentage can be derived
from an amount divided by zero. If accepted scope later becomes positive, the
stored percentages begin projecting amounts normally.

Historical actuals plus future projections may exceed current Gross Contract
Scope because of invoice variance, a deductive Change Order, contract changes,
or user configuration. This is valid advisory schedule state. It does not block
schedule editing, require correction, restrict edits to overage-reducing changes,
or trigger automatic rebalancing. Actual invoice allocation rules remain the
authority for what can be billed.

## Standard Invoice conversion

The prototype demonstrates Standard Invoice as an alternative to tracked
Progress Invoicing, but the complete existing Standard Invoice lifecycle is out
of prototype scope. The prototype is not required to reproduce Draft-to-Open for
Standard Invoices.

Conversion takes effect only after the Standard Invoice Draft saves successfully.
While an active Standard Invoice exists, the Estimate is Billed and tracked
invoicing, Change Orders, and the applicable Payment Schedule path are disabled.
An Estimate may have at most one active Standard Invoice relationship. This is a
domain invariant, not only an invoice-creation UI restriction. It applies when a
Standard Invoice is created from an Estimate and whenever an existing Invoice is
linked or relinked to an Estimate as its Standard Invoice, including through an
API, import, or future automation path. Every such operation must reject the
relationship when the Estimate already has an active Standard Invoice or tracked
Progress Invoice history.

Linking an existing Invoice to an otherwise eligible Estimate as its Standard
Invoice establishes the same relationship, Billed status, conversion lock, and
existing Payment Schedule transaction behavior as direct Standard Invoice
creation. The relationship must be established atomically so the Invoice link,
Estimate status, lock, and schedule state cannot diverge. Merely sharing a
customer or job does not establish the Standard Invoice relationship or change
the Estimate's billing state.

Deleting the Draft or canceling the invoice removes the conversion lock,
subject to the normal constraints. History and the consumed invoice number stay.
The prototype may visually remove a Payment Schedule when the user confirms the
Standard Invoice path. Production persistence must remove the schedule only in
the successful Standard Invoice create/save transaction; abandoning an unsaved
invoice must preserve it.

## Tracked-invoice cancellation and recovery

Deleting or canceling an eligible tracked Draft releases every reservation made
by that Draft: base scope, associated Cost Plus scope, contract discount,
retainage capacity, and Tax Credit. Its Payment Schedule milestone association is
removed from the live schedule so the milestone returns to Planned and can be
used again; document history is preserved wherever ordinary Cinderblock Draft
cancellation preserves it.

Only the latest eligible active tracked Open invoice may be canceled. Cancellation
uses Cinderblock's existing invoice payment prerequisites and cancellation UX,
reverses the invoice's posted scope and its discount, retainage, and Tax Credit
consumption, and restores its milestone to Planned. It does not rewrite the
invoice's immutable milestone snapshot or reuse its invoice number. A later active
tracked invoice or accepted contract revision makes an earlier Open invoice
financially ineligible for cancellation. Payment reversal and invoice cancellation
remain the platform's separate existing operations unless that platform behavior
already defines otherwise.

These features reuse established Cinderblock confirmation, reason, payment, and
recovery presentation. The prototype need not reproduce those platform surfaces
unless a contract-billing-specific state creates a new unresolved UX question.

## Concurrency, arithmetic, and integrations

The backend permits one active tracked Draft per contract across all users. No
durable reservation exists before save. Draft creation, line and discount
reservation, and the active-Draft check are one atomic operation. The first save
wins and a conflicting client must refresh. Draft edits use optimistic versions;
a stale save is rejected rather than overwriting newer state.

Every contract has one durable monotonic revision, database row version, or
opaque token with equivalent semantics. It changes after every accepted financial
mutation relevant to billing and is never reconstructed by summing child-document
versions. Every contract-affecting financial write validates the expected token
inside the same transaction as the mutation. This includes invoice Draft save and posting,
Open-invoice edits and cancellation, CO reservation/save/acceptance/revision,
Estimate revision/acceptance, discount allocation, and other contract allocation
mutations. Stale operations fail cleanly without partial commit. Independent CO
acceptances serialize safely and idempotently so neither valid change is lost.

Save failures and stale-write conflicts follow existing Cinderblock application
error and retry conventions. A failed write must leave the user's unsaved editor
state intact, explain that the write did not succeed, and allow the established
retry or refresh path. Contract Billing does not define a parallel frontend
failure framework; its atomicity, optimistic-version, idempotency, and stale-write
rules remain backend requirements.

Invoice cancellation references the application's existing payment lifecycle;
Contract Billing does not define another payment state machine. Payment reversal
and invoice cancellation remain separate existing operations unless the platform
already specifies otherwise. Only the latest eligible active tracked Open
invoice may be financially edited or canceled.

Chronology locks apply to financial and contract-allocation changes. Existing
Cinderblock behavior continues for ordinary nonfinancial fields and actions when
they do not change allocations, discount consumption, retainage recognition, tax,
contract progress, Total Invoiced, or amounts owed. A financially locked document
is not automatically read-only in every respect.

Unsaved-change navigation follows the existing Cinderblock editor convention.
Contract Billing does not define a feature-specific discard prompt. If the
platform has no applicable convention, that is a platform-level UX decision,
not a Progress Billing financial-rule defect.

Monetary calculations must use deterministic fixed-decimal arithmetic with a
documented rounding and remainder-allocation strategy. Displayed components and
totals must reconcile exactly. Production monetary calculations must not use
binary floating-point arithmetic.

Launch acceptance tests cover partial line and quantity billing; Cost Plus and
tax interactions; recommended, varied, exhausted, and unused discounts;
retainage; additive, deductive, and $0 Change Orders; zero and rejected-negative
Contract Value; cancellation and reversal; milestone dollar-to-percentage
derivation and recalculation; overallocated schedules; multiple posted invoices
against one line; latest-Open editing and preceding-invoice locking; and the
invoice/payment, CO-reservation, numbering, and parallel-acceptance races.

Local Cinderblock state is authoritative. QuickBooks failures never roll back a
valid local operation; QBO correction and reconciliation belong in a separate
integration requirements document. See
[`quickbooks-online-sync-requirements.md`](quickbooks-online-sync-requirements.md).

Existing Financial-area access and the corresponding Estimate, Change Order,
Invoice, payment, and retainage permissions govern these features. No Contract
Billing-specific RBAC matrix is introduced. Any new action that cannot map to an
existing permission is a platform permission decision to resolve before
production delivery.
