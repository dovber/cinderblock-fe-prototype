# Change Orders product requirements

> Canonical contract-value, discount, acceptance collision, locking, and
> over-invoicing rules are defined in `docs/contract-billing-business-rules.md`
> and supersede conflicting wording here.
> QuickBooks Online document mapping and post-sync safeguards are defined in
> `docs/quickbooks-online-sync-requirements.md`.

Consolidation update: these requirements now run inside the unified contract
lifecycle. See [current ownership and integration rules](contract-lifecycle-prototype.md).
Earlier independent-sandbox and deferred-retainage statements are superseded by
that integration; the detailed document behavior below remains applicable.

Status: development handoff aligned to the approved contract-workflow decision record, September 14, 2026.

## Product model

A Change Order is an Estimate-style contract document containing independent positive and negative adjustments. The original Accepted Estimate remains the historical contract source. Every saved CO receives the next contract-level CO number and remains in Contract details.

There is no replacement pairing or billing-inheritance relationship. A removed line and any newly added line are independent adjustments. Partial quantity changes use remove-and-re-add: remove the original quantity, then add an ordinary new line at the corrected quantity.

Only Accepted COs modify Contract value:

`Contract value = Accepted Estimate total + sum of Accepted CO deltas`

Draft, Pending, Declined, and Canceled COs do not change accepted Contract value.

## Creation and eligibility

- `Create change order` is available from accepted contract context even when unrelated Draft or Pending COs exist.
- An active Standard Invoice conversion disables CO creation for its Estimate.
  Deleting its Draft or canceling it removes the conversion lock, subject
  to normal history and conflict rules.
- Multiple Draft and Pending COs may exist on the same contract. Exclusivity is line-scoped: a contract line may participate in only one Draft or Pending CO at a time.
- Creation may start from the original Estimate or an Accepted CO. The source document stays visible behind `Select items to remove`.
- Source selection is optional. Addition-only, removal-only, mixed, and real net-zero COs are valid.
- A source line selected by another Draft/Pending CO remains visible in later selectors but is disabled with **This item already has an open Change Order.** The open CO remains reachable from that explanation. A line removed by an Accepted CO remains visible and unavailable under the normal lineage rules. Declined, Canceled, and deleted COs release their source-line reservations.
- A new CO opens with any selected removal lines followed by an in-table **Add item** prompt. It has no status, Contract summary, or Contract details until saved. The prompt is not a synthetic line item and contributes no value.

## Adjustment representation

Selected source scope becomes a carried-over negative-quantity reversal line inside the normal Estimate table:

- Price remains positive.
- Qty becomes negative.
- Amount is `Price x negative Qty`.
- Item name is struck through and the row is subdued.
- The row can be removed from an editable CO.
- The row has no lock icon. Lock indicators are reserved for fields locked by an explicit product rule, not fields that happen to be non-interactive in the prototype.

New scope uses ordinary editable rows. Before an editable addition exists, the next row is a clearly clickable **Add item** prompt. In the prototype, selecting it immediately replaces the prompt with a realistically populated mock item that remains fully editable. Once at least one added item exists, **+ Add item** remains below the table on the left, aligned like the invoice line-item action; selecting it adds another realistically populated editable mock item. The subtotal, discount, and Contract change summary remains aligned on the right. New scope has no data relationship to any removed line.

Cost and Markup are not part of the Change Order editing or presentation model.
The line-item table contains Item name, Price, Qty, and Amount. All Change Order
numeric inputs that permit contract adjustments preserve signed values through
entry, save, reload, formatting, and downstream totals. A negative Price or Qty
produces a signed line Amount, and signed CO discount adjustments remain signed;
the editor does not strip, normalize, or clamp a leading minus sign.
Change Order line and document financial calculations use customer-facing Price multiplied by
Qty; internal Estimate Cost and Markup values are neither inherited into the CO
interface nor shown in CO summaries.

The CO subtotal, Cost Plus, discount, and Contract change total use the ordinary Estimate totals pattern. A Change Order is not a tax authority and does not set or calculate tax. Change Orders follow Estimate zero-value rules: an individual line and the complete CO may total $0. Save and Send remain disabled only while the document has no meaningful adjustment. A selected removal, a named added line including a $0 line, an explicit discount, or an offsetting set of real adjustments makes the document meaningful. The unselected **Add item** prompt does not.

Change Order details include optional **PO Number** and **Customer Reference**
fields. Both values belong to the individual CO, use the existing Cinderblock
document-field treatment, and persist through Draft, Pending, and Accepted states.
A new CO initializes both fields blank regardless of the originating Estimate or
Change Order; neither value is inherited or written back to another document.

## Lifecycle and status

| State | Contract effect | Editor behavior | Destructive action |
| --- | --- | --- | --- |
| New / unsaved | None | Editable; no badge or lineage row | Close discards |
| Draft | Proposed only | Editable until a later tracked-invoice dependency locks it under the existing rules | Delete with confirmation |
| Pending | Proposed only | Awaiting acceptance; source lines remain reserved | Delete with confirmation |
| Accepted | Delta included | Financially immutable; corrections require another Change Order | Delete blocked |
| Declined | None | Historical | Delete allowed |
| Canceled | None | Historical | Delete allowed |

`Save Change Order` is the only primary action on a new, unsaved CO. It creates Draft and keeps the saved CO open. Only the saved Draft exposes `Send Change Order`; sending creates Pending and never implicitly saves a new CO. Draft and Pending status badges expose `Pending`, `Accept`, `Decline`, and `Cancel`. Selecting `Pending` on a Draft performs the same Draft-to-Pending transition as sending the saved Change Order. Accepted does not expose Decline or Cancel. Decline records that a proposed CO was rejected; Cancel records that it was withdrawn or abandoned before acceptance. Acceptance uses the same manual/customer-signature model as Estimates and records actor, timestamp, document version, and audit event.

Manual acceptance operates only on the current saved CO revision. Dirty editor
changes must be saved before any status transition and cannot silently become the
accepted contract revision. An empty CO, the untouched **Add item** prompt, and a
$0 CO with no meaningful contract adjustment cannot be accepted. A named $0 line,
a selected removal, an explicit discount adjustment, or offsetting real
adjustments remain meaningful under the zero-value rules.

An Accepted Estimate may be financially edited only while no saved tracked
invoice and no saved Change Order exists. A financial edit removes Accepted and
requires the Estimate to be accepted again; the product does not create a
parallel pending revision. Once any saved invoice or CO exists, further contract
financial changes use a new Change Order. An Accepted CO is financially
immutable and never returns to Pending for reacceptance. Corrections always use
another Change Order. Notes and attachments remain governed by
existing nonfinancial behavior and are audited.

The Change Order lifecycle uses Draft, Pending, Accepted, Declined, and Canceled only. It does not use Void or Voided. Only Accepted COs contribute their delta to the accepted Contract value. Draft or Pending COs may become Declined or Canceled and remain in history; an Accepted CO cannot simply be changed to Declined or Canceled.

The resulting Contract Value may equal $0 but may never be negative. A negative
individual CO remains valid when the complete accepted contract stays at or above
zero. Acceptance is blocked when the proposed CO would make Contract Value
negative. The UI must clearly explain that acceptance would make Contract Value
less than $0.00; it must not clamp, rewrite, or partially accept the CO, and its
status and accepted contract state remain unchanged.

## CO acceptance and invoice collision

Progress Invoicing is Contract-based before and after the first Accepted CO. The
Accepted Estimate established the Contract; accepting a CO revises that same
Contract without migrating billing history, resetting progress, creating another
ledger, or mapping CO lines to Estimate lines. The contractor continues to use
`Create invoice`. The system may automatically use the established Contract
Invoice presentation—Contract wording and Estimate/CO source groupings—while the
underlying tracked billing model remains unchanged.

If an invoice Draft exists when a CO is Accepted:

1. Cancel the Draft as a system action.
2. Release its line and discount reservations.
3. Keep it visible read-only in the invoice table with its Estimate link, original values, cancellation reason, and timestamp.
4. Notify the contractor that the contract changed and a new invoice must be started.
5. Recalculate available scope against the accepted contract.

Acceptance creates a new accepted contract revision and financially locks every
tracked Open invoice based on the preceding revision. Those invoices remain
available for normal payment activity but cannot consume newly accepted or
modified CO scope. New CO scope is billed through a new tracked invoice against
the new revision.

Existing tracked invoices remain historical snapshots of the accepted Contract
revision used to create them. Accepting a Change Order must not add its lines to
an earlier invoice or change that invoice's saved Contract Amounts, quantities,
allocations, discount, tax, Cost Plus, retainage, or other financial facts. The
revised Contract applies to invoices created after acceptance and to current
Contract summaries only.

Customer acceptance is revision-specific for Estimates and for Change Orders
before acceptance. The customer link identifies one saved revision. A later
pre-acceptance financial edit
invalidates that link for acceptance and creates a new revision and link. The
backend rejects acceptance from a stale link even when the old page is still
open. Preserve sent, accepted, superseded, and invalidated revision history with
the acceptance actor and timestamp; a user-facing version manager is not needed.

Progress and Contract Invoices cannot be duplicated. Duplicate remains available for Standard invoices only.

## Contract surfaces

Estimate and Change Order document item tables do not show line-level `% Complete`.
Tracked Progress/Contract Invoice editors and customer invoice outputs retain the
column because that is where billing progress is managed. Editable billable invoice
amounts show `Apply remaining` only while a positive line balance is still available;
the action is absent from locked or non-billable lines and customer documents.

### Sidebar and editor settings

Change Order sidebar and editor settings follow the current Estimate settings
rules. Use the same settings groups, controls, defaults, visibility behavior, and
applicability rules as the Estimate editor. Do not introduce separate
Change Order-specific settings behavior.

### Contract summary

The shared Contract summary appears on the Estimate and every saved CO:

- Contract value
- Total invoiced
- Remaining, or Over invoiced
- Contract progress
- Progress bar

Total invoiced includes posted Open/Partially Paid/Paid tracked allocations, less
discount actually applied, and excludes Draft and Canceled invoices. A Draft
invoice may show `$X reserved by a draft` as secondary context without changing
Total invoiced or progress.

A Draft/Pending CO shows its proposed signed delta beneath Contract value, but the primary metrics continue using accepted Contract value until acceptance.

When Total Invoiced exceeds accepted Contract Value, replace Remaining with Over
invoiced. Contract Progress is calculated independently as posted Gross Contract
Scope consumed divided by current Gross Contract Scope and may exceed 100 percent
after a deductive CO. Its displayed bar caps at 100 percent while the over-invoiced
amount remains visible. These states are informational only.

### Contract details

Contract details explains lineage and is reused on the Estimate and saved COs:

- `Original contract: Estimate #1234`
- `Change Order 1: CO #1234-CO1`
- additional sequential CO rows
- emphasized `Current contract`

The active document row has a subtle highlight and is not linked to itself. Other document IDs are regular-weight blue links. Accepted status is hidden; Draft, Pending, Declined, and Canceled statuses remain visible. CO amounts are signed contract deltas with a `Contract change: +/-$X` tooltip. Current contract includes Accepted deltas only.

`Linked to` is reserved for invoices linked to the specific Estimate or CO. Each
relationship chip shows only the link icon and `Invoice #...`; it does not repeat
invoice status or amount. Contract lineage never appears there.

## Estimate and accepted-CO actions

An Accepted Estimate in this prototype uses three equal plain-text actions: `Create invoice`, `Create change order`, and `Create PO`. Multiple Draft and Pending Change Orders may coexist when their source lines do not conflict.

An Accepted CO exposes the same contract-action row. Its `Create invoice` action
opens the contract-aware presentation of the same tracked Progress flow. Its
`Create change order` action starts the next CO from the current accepted CO
context. Saved non-Accepted COs do not show this row.

CO approval lifecycle state remains Draft, Pending, Accepted, Declined, or
Canceled. Contract billing state is separate and belongs to the current
Contract. Wherever billing status is the applicable presentation, the original
Estimate and every Accepted CO reflect the same Contract state: Accepted before
posted tracked billing, Partially Billed while posted billing exists and
current Contract scope remains, and Billed when posted tracked billing exists
and the current Contract is fully invoiced. A CO is not independently Billed based only on its own lines. If an
Accepted CO adds scope to a previously Billed Contract, the Contract and those
surfaces return to Partially Billed without rewriting historical billing.

## Fee, tax, discount, and tiers

- Cost Plus is a document-level Estimate term based on customer-facing selling Price; internal Cost is irrelevant. The accepted percentage is inherited read-only by Change Orders and applies to all addition and full-negative removal lines. Each resulting Cost Plus scope record retains lineage to its underlying base line, and its taxability is independently configurable.
- Cost Plus is a High Rise feature.
- Change Orders do not define an invoice tax rate. Progress, Contract, retainage, and other contract-derived invoice flows inherit the applicable tax configuration and per-component taxability from the underlying Accepted Estimate/contract through the product's existing tax behavior. The invoice Draft stores the resolved tax facts; Change Orders do not create an independent tax source or tax engine.
- If accepted removed scope was previously invoiced with tax, its actual historical
  persisted base and taxable Cost Plus tax attribution creates a Tax Credit
  Balance that applies only against calculated tax on future invoices. It does
  not change the CO delta or contract metrics and does
  not create an automatic refund or credit memo.
- The Accepted Estimate and Accepted Change Orders share one contractual discount pool. CO scope changes do not automatically recalculate it, but a CO may explicitly adjust the contractual discount in either direction: a positive CO discount adds to the pool and reduces Contract change, while a negative CO discount removes existing discount and increases Contract change. The resulting pool can never be less than $0. Once the CO is accepted, its signed discount adjustment becomes part of the pool used for subsequent Progress Invoices. Invoice-level discount allocation only consumes the available pool; it does not modify the underlying contractual discount, cannot be negative, and cannot exceed the available balance.
- Change Orders, Progress Invoices, and Contract Invoices are available in all tiers. Retainage is deferred and High Rise only.

## Deletion

Draft, Pending, Declined, and Canceled COs may be deleted from the overflow menu after confirmation. Deletion removes the CO from Contract details and releases its line-level source reservations. Accepted CO deletion is blocked.

Estimate deletion is a recoverable soft-delete cascade. Payments must be voided first and linked invoices canceled so allocations release. The confirmation lists the Estimate, COs, invoices, and allocations affected before the cascade runs.

## Prototype scenarios

- No Change Orders
- Draft CO
- Pending CO, including a reserved Draft invoice for acceptance-collision review
- Accepted CO
- Multiple accepted COs
- Partially invoiced / no COs
- Partially invoiced / Accepted CO
- Over invoiced after Accepted deductive CO

The Pending scenario demonstrates that the invoice Draft contributes only a
reservation. Accepting the CO cancels that Draft, retains it read-only, releases
its reservation, and enables the contract-aware source-grouped presentation for
future tracked invoice entry without changing accounting models.

## Deferred

- Retainage UI and workflow; only a contract-level zero-default parameter is needed in the future data model.
- Mobile.
- Reporting, search, and export.
- Stored-material billing.
- Automated credits, refunds, or over-invoice reconciliation.
- Backend/API/QBO implementation details beyond existing product policy.

## Acceptance checks

1. Create addition-only, removal-only, mixed, real net-zero, and named $0 COs.
2. Confirm no replacement action, grouping, or relationship exists.
3. Save a meaningful new CO and remain on its Draft document with Contract details.
4. Confirm a CO containing only the **Add item** prompt cannot save or send, while a populated named $0 line can.
5. Accept a Pending CO with a Draft invoice and verify cancellation, reservation
   release, read-only invoice history, notification, and continued tracked billing
   through the contract-aware source-grouped presentation.
6. Verify every Accepted CO is financially read-only and that a correction starts a new Change Order.
7. Verify deletion eligibility for every non-Accepted status and the Accepted block.
8. Verify Contract value, Total invoiced, Draft reservation, Remaining/Over invoiced, progress text, and progress bar agree on Estimate and saved CO views.
9. Save two Draft/Pending COs against different source lines. Confirm both may remain open, while each reserved line is visible but disabled in the other CO selector. Decline, cancel, or delete one and confirm its line becomes selectable again.
