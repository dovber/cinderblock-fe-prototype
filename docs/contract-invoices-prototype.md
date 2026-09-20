# Contract-aware Progress Invoice presentation

> Canonical invoice posting and financial definitions are defined in
> `docs/contract-billing-business-rules.md` and supersede conflicting wording here.
> QuickBooks Online line mapping and post-sync safeguards are defined in
> `docs/quickbooks-online-sync-requirements.md`.

Consolidation update: these requirements now run inside the unified contract
lifecycle. See [current ownership and integration rules](contract-lifecycle-prototype.md).
Earlier independent-sandbox and deferred-retainage statements are superseded by
that integration; the detailed document behavior below remains applicable.

## Purpose and scope

This document defines the contract-aware presentation used for tracked Progress
billing when one or more Change Orders have been Accepted. Progress Invoicing was
already operating against the Contract before the first CO: the Accepted Estimate
established it, and each Accepted CO revises it. The first CO does not create a
new accounting model, migrate history, reset progress, or create another ledger.

**Contract Invoice** is retained only as the established product-facing name for
this automatically selected presentation variant. It bills the same Contract as
the Progress Invoice flow, using the same controller, editor, invoice ledger,
pools, reservations, and billing state. The accepted Contract consists of the
original Accepted Estimate plus every Accepted Change Order.

## Contract state

The prototype begins on the normal full-screen Estimate editor. The Estimate
shows prior invoice links, line-level Change Order indicators, Contract details,
and the shared Contract summary:

- `Gross contract scope` = accepted line scope plus document-level Cost Plus.
- `Contract value` = Gross Contract Scope less accepted contract discount.
- `Total invoiced` = posted Gross Contract Scope consumed less discount applied.
- `Remaining` = accepted Contract value minus Total invoiced.
- `Contract progress` = posted Gross Contract Scope consumed divided by Gross
  Contract Scope.

Only Accepted Change Orders affect Contract value. The Contract summary is the
authoritative overall billing state.

## Creation flow

When Payment Schedule has unfulfilled milestones, **Select milestone** appears
first in **What would you like to invoice?**. It provides the same editable planned
percentage suggestion and nested Percent/Amount or Select Items execution methods
as the Estimate-backed Progress Invoice flow. **The rest of this contract** remains
a separate top-level action. Ad-hoc creation uses the optional **Payment
milestone** step, and only saving the invoice creates or fulfills schedule history.
Payment Schedule never reserves Gross Contract Scope or changes the existing
billing eligibility rules. See
[Payment Schedule frontend prototype](payment-schedule-prototype.md).

The first Accepted Change Order enables this contract-aware presentation for all
future tracked invoice creation automatically; it does not switch financial
models. `Create invoice` opens the contract-aware creation flow. Since
all fixtures contain earlier progress billing, the first step offers:

- `The rest of this contract`, with `Remaining subtotal: $X`.
- `Percent or amount`, with the established `% / $` switcher. Percentage mode
  displays the remaining-subtotal dollar and percentage limits; dollar mode
  displays the remaining-subtotal dollar limit.
- `Select items`, followed by a source-grouped selector.

The method option remains **Select items**. Its item-selection screen is titled
**Select items to invoice**.

The item selector represents current accepted billing scope and groups it under
Estimate #1234 and each Accepted Change Order. It omits both an original line
removed by an Accepted CO and the corresponding negative CO adjustment because
neither can ever be selected for future billing. Those historical lines remain
present in the resulting editor and customer previews.

Positive current-scope lines with remaining value are selectable. Positive
current-scope lines that are fully invoiced may remain visible as disabled rows
with $0 remaining. Selected lines bill their full eligible remaining amount.
Percentage and amount inputs use a simple proportional mock allocation across
eligible remaining items.

## Editor and billing attribution

The resulting internal editor groups every contract line by its source document and uses:

`Item name · Qty · Contract Amount · Previously Billed · This Invoice · % Complete`

Source sections use the document IDs alone: `Estimate #1234`, followed by
`CO #1234-CO1`, `CO #1234-CO2`, and so on. Each source document owns a repeated,
compact column-header row before its line items. This establishes the hierarchy
as source document, then columns, then that document's lines while preserving
consistent column alignment across the contract.

The invoice editor shows line-level `% Complete` because it is where billing is
actively managed. Ordinary billable lines calculate it live as `(Previously Billed
+ This Invoice) / Contract Amount`. Superseded original Estimate lines retain their
historical completion while remaining non-billable; negative CO adjustment lines
show an em dash; positive CO scope uses billing attributed to that line. Historical
billing is never redistributed to force adjusted lines to 100 percent. Estimate and
Change Order document tables do not show line-level `% Complete`.

Above the line table, the editor shows a live projected Contract summary. Saved
Draft invoices reserve scope but remain excluded from posted billing totals:

- `Contract value` is the current accepted Estimate plus all Accepted CO deltas.
- `Previously billed` includes posted tracked billing that precedes the current
  invoice in the immutable contract billing sequence. Draft, Canceled, and later
  invoices are excluded.
- `This invoice` is the live gross scope allocated by the current invoice; its
  separate discount and totals continue to follow the shared invoice rules.
- `Remaining subtotal after invoice` is the gross, pre-discount source scope left
  after posted allocations, active reservations, and this invoice's allocation.
  It is not Contract Value less a gross invoice subtotal.
- `Contract progress` uses gross scope consumed, including document-level Cost Plus,
  divided by current Gross Contract Scope. Discount does not increase progress.

The shared Contract summary's net `Remaining` continues to mean Contract Value
less Total Invoiced. It is distinct from Remaining subtotal used to constrain
invoice creation. The Contract Discount Pool remains a separate allocation step
and is never subtracted from Remaining subtotal.

Editing `This invoice` updates the projected remaining subtotal, net summary
amounts after the selected discount, progress percentage, and progress bar
immediately. If projected net Total Invoiced exceeds Contract value, the summary
shows a positive `Over invoiced` amount, permits progress above 100%, and divides the
bar into green accepted-contract and red over-invoiced segments normalized against
projected invoicing.

Every editable, billable `This Invoice` field with a positive unused balance shows
`Apply remaining` beneath the input. It fills the current line to its authoritative
remaining billable amount through the same state path as manual entry and therefore
updates line completion, invoice totals, projected remaining, Contract progress, and
the progress bar immediately. Hide it for full-current amounts, fully billed lines,
superseded or negative adjustment lines, locked invoices, and customer previews; if
the user reduces an amount below the maximum, show it again.

Saving a new Contract Invoice keeps the user in the invoice flow. The same invoice
transitions from `New progress invoice` to its assigned `Invoice #1004xx` document
with `Draft` status, preserving dates, notes, line amounts, links, and projected
Contract progress. The saved invoice does not return to the Estimate automatically;
the user returns only by explicitly closing the invoice.

On the Estimate, each invoice relationship under `Linked to` uses the shared compact
chip containing only the link icon and `Invoice #...`. Status and amount remain on
the invoice document and are not repeated in the relationship reference.

Qty is informational. All relevant lines remain present, including lines with
$0 in This invoice. Previously billed excludes the current invoice.

Historical billing always remains on the line and source document where it
occurred. The prototype does not transfer or redistribute Previously billed when
an Accepted CO replaces scope. The original Standard cabinets line retains its
$1,000 historical billing, the CO removal uses an em dash because billing is not
applicable, and independent new CO scope begins with $0 Previously billed.

Superseded original Estimate lines remain visible, readable, and locked for
historical context. They are not struck through. A compact
`Modified by CO #...` treatment identifies the Accepted CO that made
the line non-billable. The app does not show additional “historical billing
retained” explanatory copy; the Previously billed value carries that meaning.

Negative CO adjustment lines retain their struck-through removal treatment and
remain locked and non-billable. Their `This invoice` value displays an em dash,
and their `Previously billed` value also displays an em dash because billing is
not applicable to a contract adjustment. They never receive copied or invented
Previously billed amounts. A reciprocal
`Originated from Estimate #1234` treatment identifies the source of the negative
adjustment. These neutral lineage treatments are references rather than warnings;
they remain nonfunctional where the sandbox does not already provide cross-document
navigation.

Across the internal editor, PDF-style preview, and customer weblink, `$0.00`
means an otherwise billable line has no prior or current billing. A positive
amount represents billing actually attributed to that line. An em dash means
billing is not applicable. Negative/removal CO adjustments therefore show an em
dash for both `Previously billed` and `This invoice`, while historical billing
remains visible only on the originating Estimate line where it occurred.

For positive lines, `% Complete` is cumulative billing actually attributed to
that line divided by its positive Contract amount. Individual adjusted lines do
not have to reach 100% when the authoritative Contract progress reaches 100%.

## Customer-facing previews

The PDF-style and customer weblink previews are React-rendered HTML and CSS.
They use the same invoice data and group rows by the original Estimate and each
Accepted CO. Both show:

`Item name · Qty · Contract amount · Previously billed · This invoice · % Complete`

`% Complete` is the billing progress of an individual positive contract line.
It remains based on billing attributed to that line. Negative adjustment lines
show an em dash, and the existing adjusted-line asterisk rule remains intact.

Customer-facing source headers use the document IDs alone: `Estimate #1234`,
`CO #1234-CO1`, `CO #1234-CO2`, and so on. A superseded original Estimate line
stays readable and retains its actual historical billing. Beneath its description,
subdued document text identifies `Removed by CO #...`. The matching negative CO
adjustment remains struck through and does not repeat an “Originated from” note
on customer-facing documents.

Each customer-facing source section repeats the same hierarchy: **source document
header → column headers → source line items**. There is no global column-header row
above the first source document. The repeated column headers use identical widths
and alignment across the Estimate and every Change Order section.

Contract Invoice creation inherits the applicable tax configuration and
line/component taxability from the underlying Accepted Estimate/contract through
the product's existing tax behavior. It does not introduce a Contract
Invoice-specific rate; the resolved tax facts are stored on the Draft.

Below the line table, both customer surfaces show the invoice Subtotal, Tax,
Total, and Balance Due first. A separate **Contract progress** block follows the
invoice totals and shows:

- `Gross contract scope` is the current accepted gross scope for progress presentation.
- `Billed so far` is cumulative gross scope consumed through the current invoice.
- `% Complete` is Billed so far divided by Gross Contract Scope.

The invoice totals remain the primary financial information for the current
invoice. The following Contract progress block provides secondary cumulative
contract context. Its `% Complete` describes overall accepted-contract billing,
while the table's `% Complete` describes one line. They intentionally can differ.

All contract lines are visible by default. $0-current rows are subdued. The
PDF-style preview uses grayscale. The weblink's `Show all contract items` toggle
defaults ON; turning it OFF shows only currently billed rows.

When overall Contract progress is 100%, an adjusted positive line may remain
below 100% because historical billing remains on removed original scope. Only
such lines receive an asterisk, for example `92.86%*`. When present, the table
shows:

`* This percentage is offset by billing previously applied to scope removed by a Change Order.`

Ordinary partially invoiced lines do not receive an asterisk. Negative/removal
adjustments display `% Complete = —`.

## Prototype scenarios

1. `Partially invoiced · Accepted CO` — one Accepted positive CO and $15,000 of
   historical billing against an $85,000 accepted contract.
2. `Multiple accepted COs` — grouped Estimate and two Accepted CO sources with
   the same historical billing attribution.
3. `Fully invoiced contract · Adjusted lines` — Contract progress is 100%, while
   Custom inset cabinets remains 92.86% and demonstrates the customer-facing
   asterisk and explanatory note.

If a future accepted deductive CO makes Total invoiced exceed Contract value,
the shared over-invoiced presentation remains the applicable contract-level
model. This prototype does not add reconciliation behavior.

## Shared lifecycle rules

- Draft allocations are reservations only. They reduce available scope but do not
  enter Total invoiced, Previously billed, or Contract progress until Open.
- Accepting a CO cancels any open tracked Draft, releases its reservations, retains
  it as read-only invoice history linked to the Estimate, and requires a fresh draw.
- A Standard invoice conversion is mutually exclusive with this flow and with
  Change Orders on the source Estimate.
- Canceling a posted invoice requires payments to be voided first, then releases
  its allocations and recalculates contract history.
- Retainage uses the existing optional contract-level percentage and release pool
  in retainage-enabled scenarios, including accepted CO scope.
