# Payment Schedule frontend prototype

> Canonical invoice posting and milestone recovery rules are defined in
> `docs/contract-billing-business-rules.md` and supersede conflicting wording here.

Consolidation update: these requirements now run inside the unified contract
lifecycle. See [current ownership and integration rules](contract-lifecycle-prototype.md).
Earlier independent-sandbox and deferred-retainage statements are superseded by
that integration; the detailed document behavior below remains applicable.

## Purpose

Payment Schedule is an Estimate-level planning and history layer for tracked
Progress Invoices. It answers which milestones are planned, what percentage and
amount were planned when supplied, which Progress Invoices were created, and which
milestone each invoice fulfilled.

**Payment Schedule plans and records billing milestones. A Progress Invoice
executes billing. Allocated values guide invoice creation but never lock it.**

Every saved Progress Invoice has one linked Payment Schedule milestone, and each
milestone may have only one linked invoice. A contractor who wants multiple draws
for one phase creates multiple milestones. Partial milestone fulfillment,
milestone-level invoice rollups, and remaining-to-bill calculations within a
milestone are out of scope. Saving
an ad-hoc Progress Invoice creates the schedule and an actual milestone when no
plan exists. If planned milestones exist, the invoice can use one of them or add
a new milestone; the plan never restricts the invoice amount. The linked
milestone stores the invoice's actual amount, percentage, and date and uses the
same locking rules as every other invoiced milestone.

This is local frontend prototype state. It does not define APIs, persistence,
QuickBooks behavior, production allocation, or exact accounting rules.

## Estimate presentation

The Estimate editor includes a **Payment schedule** tab. Its table follows the
supplied Cinderblock references and uses:

`Milestone · Percentage · Amount · Date · Invoice`

Percentage and date are optional. A valid entry may contain only a milestone name.
For an unfulfilled milestone, the currency-precision milestone Amount is the
authoritative value for billing, allocation totals, and schedule validation.
The milestone also retains its precise percentage anchor so a future Contract
Value change can recalculate the planned Amount without using the rounded
percentage shown in the UI. Contract Value
includes accepted line-item scope and document-level Cost Plus, subtracts
accepted contract discount, and excludes tax, retainage, and payments. Percentage
and Amount are both directly editable in Manage milestones; there is no entry-mode
switch. Percentage input accepts at most three decimal places and calculates an
Amount rounded to currency precision. Editing Amount stores that exact currency
amount and derives a precise percentage anchor, while displaying the derived
percentage rounded to at most three decimal places. An Accepted Change Order
therefore recalculates future displayed amounts from the precise percentage anchor,
not its rounded display value. A fulfilled row keeps the actual
saved invoice amount, while its read-only percentage is recalculated as that
amount divided by the current Contract Value. The milestone retains its
planned percentage separately from actual fulfillment. Later contract changes
never rewrite the historical amount.

Creating from a milestone defaults gross allocation to the milestone percentage
of Gross Contract Scope and suggests the same percentage of applicable original
Contract Discount, capped at the remaining Discount Pool. Earlier invoice
discount variance is not redistributed. If the contractor overrides the
suggestion, the milestone actual is the resulting net contract billing and may
differ from its plan.

A planned row with no active invoice shows **Create invoice**. Saving a tracked
Draft associates that invoice with the milestone without fulfilling it. The row
uses a neutral gray background, the Tabler document-with-dollar icon, a clickable
`Invoice #...` link, and a small **Draft** badge; it does not show the green
checkmark or another Create invoice action. When the Draft becomes Open, the row
becomes Invoiced and uses the subtle green background and green check-circle. If
the Draft is deleted/canceled, or the latest eligible Open invoice is validly
canceled, the milestone returns to planned and Create invoice becomes
available again. One active invoice association per milestone is maintained.
The canceled invoice retains an immutable milestone name, percentage, and
planned-context snapshot in its own history. Canceled historical associations
do not appear in the live schedule, and later milestone renaming does not rewrite
the snapshot.

## Manage Payment Schedule

The card-header action is **Manage milestones** whenever a schedule exists. The
modal supports adding, editing, deleting, and reordering milestones. Each row
requires Milestone name and may contain an optional percentage or equivalent
dollar entry plus an optional Date. Percentage and Amount appear together and
remain editable. Percentage entry updates the projected Amount. Dollar entry derives the
percentage and continues to show the projected Amount. The data model stores the
currency-precision planned Amount and its precise percentage anchor. A newly added row may initially show the
**Milestone name** placeholder, but **Save changes** remains disabled while any
row has a blank or whitespace-only name. The editor never generates an `Invoice N`
name for a manually managed schedule row.

At $0 Contract Value, percentage entry remains available and every
percentage milestone projects $0. Dollar entry is disabled because the product
cannot derive a meaningful percentage from an amount divided by zero. When
Contract Value later becomes positive, stored percentages project normally and
dollar entry becomes available.

Once a milestone is linked to an invoice, its Percentage and Amount are
historical financial fields. They stay visible with a disabled treatment; the
amount uses the saved invoice value, percentage derives from that amount and the
current Contract Value. Planned date and actual invoice date are stored
separately and both remain visible; linking or posting an invoice never
overwrites the planned date. The planned percentage remains stored separately. The milestone name
and drag handle remain active. The delete action
is unavailable for linked milestones, while unfulfilled milestones remain fully
editable and deletable.

Renaming a milestone linked to a Draft invoice updates the Draft invoice without
a warning. Any issued invoice uses the same **Renaming milestone** confirmation,
which explains that paid invoices keep their original milestone name. After
**Rename**, an Open or Partially paid invoice adopts the new name; a Paid invoice
keeps its historical invoice milestone name while the schedule name changes.

The left drag handle is the only reorder control, including for linked milestones.
Rows can be dragged vertically
and dropped between other rows, with a subdued dragged-row treatment and a visible
drop-position indicator. Reordering moves
the complete milestone record, immediately updates the sequence numbers in the
modal, and becomes the saved Payment Schedule order without changing invoice
associations or historical invoice fields. Up and Down arrow buttons are not shown.

Percentages do not need to total 100 percent and may intentionally total less or
more. While editing, the modal shows the allocated percentage and amount. A total
above current Contract Value displays the excess as informational schedule
state. It does not disable **Save changes**, require correction, limit the user to
overage-reducing edits, or change invoice availability. Manual editing never
normalizes or redistributes entries automatically. Allocation and overage validation
sum milestone amounts rather than displayed percentages. Dollar entry retains enough
internal percentage precision to reproduce the entered amount at the current Contract Value. For
example, $10,001 against $100,000 stores 10.001%, not a rounded 10%.

The allocation total is planning context rather than contract progress or a
financial validity gate. Contract progress remains the authoritative presentation
of Gross Contract Scope consumption; invoice allocation rules determine what may
actually be billed.

Future Company Settings presets are percentage-only so they can apply across
contracts of different sizes. Applying a preset creates percentage-anchored rows
and their projected amounts. A contractor may then edit the Estimate-specific
schedule using either percentage or dollar entry. Presets are a documented
production requirement and are not part of this prototype.

## Invoice creation

The general **Create invoice** action preserves the first invoice-type decision
from the Progress Invoice prototype. Before any invoice has been created, it opens
**What do you want to invoice?** with **Standard invoice** and **Progress invoice**.
Payment Schedule is an optional planning layer and does not force the Estimate
into Progress Invoicing.

Choosing **Standard invoice** while a Payment Schedule exists opens a confirmation
titled **Create standard invoice?** with the body **Creating a standard invoice
will convert the full estimate and remove the payment schedule.** **Cancel**
returns to invoice-type selection without changing the schedule. **Create invoice**
removes the schedule and opens the existing Standard Invoice editor with the full
Estimate copied into it. Saving stays on the new invoice, marks the Estimate
**CONVERTED**, preserves its clickable `Linked to Invoice #...` relationship, and
keeps the Payment Schedule removed. The flow reuses the established Standard
Invoice editor and behavior. This early removal is an accepted visual shortcut in
the prototype. Production persistence removes the schedule only when the Standard
Invoice is successfully created; abandoning the unsaved editor preserves it.

Choosing **Progress invoice** opens the Progress Invoice scope dialog titled
**What would you like to invoice?**. **Standard invoice** is not repeated there.
When
one or more unfulfilled milestones exist, its first option is **Select milestone**,
followed by the existing rest-of-estimate/contract option when applicable,
**Percent or amount**, and **Select items**. Without an unfulfilled milestone, the
new option is omitted.

Selecting **Select milestone** on the first screen enables **Continue** without
expanding controls inline. The next screen is titled **Select milestone**. It uses
one standard **Milestone** dropdown containing only unfulfilled milestones that do
not already have an invoice. Directly beneath it, the same screen shows **Invoice
by** with **Percent or amount** and **Select items** radio choices. There is no
separate milestone invoice-method step.

Each dropdown option begins with the milestone's one-based sequence number from
the current Payment Schedule order, for example `1. Deposit` and `2. Rough-in`.
The closed dropdown retains the number. Filtering out fulfilled milestones does
not renumber the remaining options, and no percentage, amount, date, or other
metadata appears in the compact label. A saved drag-and-drop reorder updates both
the dropdown order and these sequence numbers.

**Percent or amount** is always selected when the milestone screen opens and after
every dropdown change, with `%` selected in the percent/dollar control. A milestone
with an allocated percentage prepopulates that percentage as an editable suggestion;
the user can change it or switch to dollars. A milestone with no allocated
percentage keeps the percentage input visible but blank and clears any value from
the previously selected milestone. **Continue** remains disabled until the input
contains a valid percentage/amount. Choosing **Select items** instead routes to the
existing **Select items to invoice** picker and its selection requirements.

Clicking a row's **Create invoice** skips **What would you like to invoice?** and
opens this same **Select milestone** screen with that milestone selected in the
dropdown. The user may change it. An allocated percentage is already selected and
prefilled; a name-only milestone opens with **Percent or amount** and `%` selected
but with a blank value. The
normal Estimate Create invoice path leaves milestone selection optional, so rest,
percentage/amount, and selected-item invoices remain available as ad-hoc tracked
invoices even when planned percentages nominally total 100. Actual invoice amounts
remain constrained by the accepted contract's remaining billable value.

## Ad-hoc invoice naming and save

When no existing milestone is selected, creation includes **Payment milestone**
with the explanation **Optional. Add a milestone name to describe what this
payment is for.** The optional **Milestone name** field uses **e.g. Deposit,
Rough-in complete, Final payment** as its placeholder. A blank value generates `Invoice 1`, `Invoice 2`,
and so on using the milestone’s actual position in the Payment Schedule, rather than the count of saved invoices.
The generated text is the invoice's milestone name. It is stored on the invoice
and shown consistently in the Payment Schedule, invoice editor, PDF-style
preview, and customer web preview, just like a selected or explicitly entered
milestone name.

The setup primary action is **Continue** only when another configuration step
follows. If a remaining contract discount requires **Apply discount?**, the
Payment milestone or selected-milestone step shows **Continue**. Otherwise it is
the final setup step and shows **Create invoice**, which immediately opens the
unsaved New Invoice editor. **Back** remains the secondary action. The editor's
own **Create invoice** action persists the completed invoice; repeating that
label across setup and editor is intentional because the actions complete
different stages.

Opening an invoice editor does not create or fulfill a schedule row. Closing an
unsaved invoice leaves the schedule unchanged. Saving remains on the newly saved
Draft invoice and then creates the neutral Draft invoice state:

- associates it with the selected milestone and replaces **Create invoice** with
  its `Invoice #...` link; or
- creates one new schedule row for an ad-hoc invoice using the entered/generated
  name and actual invoice percentage and amount.

If a contractor changes a planned 25 percent milestone to a provisional 20
percent invoice, the Draft row displays 20 percent and the saved amount. Posting
the invoice to Open changes the row to the fulfilled presentation without
changing that actual amount.

If the entered invoice amount exceeds the selected milestone's planned amount but
remains within the available contract balance, **Invoice exceeds milestone** shows
the planned and proposed milestone amounts and explains that the invoice becomes
the milestone's actual while other milestones keep their percentage anchors.
**Back** returns to creation. **Create invoice** opens the existing Progress
Invoice editor. When that invoice is first saved, its milestone adopts the actual
invoice percentage, amount, and invoice date.

The system never scales, redistributes, or otherwise rebalances future milestones
because an actual invoice differs from plan. Invoiced milestones keep their
actual invoice values. Future milestones keep their percentage anchors and
continue projecting against current Contract Value. The schedule may
therefore remain overallocated indefinitely; editing is still allowed and no
correction is required. Existing
contract-level invoice validation still rejects an invoice above the available
contract balance.

## Shared billing behavior

Payment Schedule consumes the same shared Progress Invoice creation dialog used by
the Progress Invoices prototype; it does not maintain separate percent/amount or
item-selection implementations. Milestone execution uses the established tracked
invoice concepts: percent/dollar entry, item selection, remaining-value limits, all contract lines in the editor,
read-only Qty context, line-level `% Complete`, `Apply remaining`, invoice totals,
and save-in-place Draft behavior. The schedule does not assign items during
planning and never redistributes historical billing.

Ordinary Payment Schedule scenarios do not show retainage UI or run retainage
calculations. The explicit combined **Retainage — On acceptance** scenario follows
`docs/retainage-prototype.md`: its milestone is fulfilled by the full gross
Progress Invoice amount, while retainage reduces only the invoice amount due.

The Contract Invoice form uses **The rest of this contract** and contract-wide
source data after Accepted Change Orders. Customer PDF-style and weblink output
remain React-rendered HTML/CSS and retain their established progress columns. No
real PDF, payment, acceptance, or external URL is created.

## Prototype scenarios

1. **No payment schedule** — empty schedule and Create schedule entry point.
2. **Scheduled milestones** — the default Draft Estimate, with optional
   percentages/dates, including a name-only milestone and planned percentages
   totaling 100 percent.
3. **Partially invoiced schedule** — a fulfilled Deposit linked to Invoice #100501
   plus future milestones.
4. **Schedule with Accepted CO** — Contract Value increases from $75,000
   to $85,000; the historical Deposit stays $18,750 while future percentage-based
   milestone amounts use $85,000.
5. **On acceptance · Create draft** — accepting the Estimate creates a Draft
   Progress Invoice for the current milestone 1.
6. **Retainage — On acceptance** — the explicit combined state bills a $20,000
   first milestone gross, withholds $2,000, makes $18,000 due, and fully consumes
   the $20,000 milestone.
7. **On acceptance · Reordered first milestone** — the reordered row in position
   one is used by the configured action.
8. **On acceptance · Existing draft conflict** — acceptance succeeds while the
   existing Draft guard prevents a duplicate invoice and leaves the first milestone
   unconsumed.

## On acceptance

The Payment Schedule editor has one **On acceptance** select below the milestone
rows and **Add milestone**, separated by a divider. Its choices are **Do nothing**
and **Create draft invoice for milestone 1**. This is one schedule setting;
milestones do not receive individual controls.

The section appears only while the Estimate is Draft or Pending. Once the Estimate
is Accepted, Partially Converted, Converted, or otherwise past acceptance, the
section is removed entirely and the modal proceeds directly from the milestone
table and Add milestone action to its normal footer.

The select does not repeat the milestone name or amount in supporting copy.
**Milestone 1** means whichever complete milestone record currently occupies row
one. Reordering immediately changes which milestone the acceptance action targets;
there is no stored reference to the row that previously occupied that position.
An automatic action cannot be saved when milestone 1 has no valid positive amount.

At Estimate acceptance, **Do nothing** creates no invoice. **Create draft invoice
for milestone 1** uses the existing Progress Invoice data and allocation behavior
to create a Draft for the full first-milestone amount, then marks that milestone
as **Draft invoice**. Opening the invoice changes it to **Invoiced** and remains an explicit status change in the invoice
editor. The date field is not a trigger. The one-Draft-per-contract guard is
reused: a conflict preserves acceptance, leaves the existing Draft unchanged,
does not consume the milestone, and shows an inline error.

Acceptance processing is idempotent. Revisiting accepted state cannot create a
second invoice or consume milestone 1 twice. Later schedule edits and
changes to **On acceptance** do not alter or regenerate the historical invoice.

## Complete Estimate layout

Payment schedule is a section within the complete Estimate editor. Shared Estimate details and Items components appear above it, followed by Payment schedule, Public note, Attachments, and Terms & Conditions. The original Estimate items remain original contract context even in the Accepted CO scenario. Launching the prototype scrolls only the main Estimate content area to Payment schedule; Details and Items remain above and can be reached by scrolling upward. The Details, Items, and Payment schedule tabs also scroll to their sections. Scenario and invoice behavior are unchanged.


## Milestone naming

Milestone name is required for every row created or edited through **Manage
milestones**. The schedule cannot be saved with a blank or whitespace-only name,
and the editor does not apply an automatic fallback.

The separate ad-hoc Progress Invoice path keeps its optional **Milestone name**.
When omitted, the saved ad-hoc row receives `Invoice X`, where X is its one-based
insertion position in the Payment Schedule rather than the invoice count. Entered
names are saved with surrounding whitespace trimmed. Naming does not change the
milestone ID, reorder rows, or create another milestone; later reordering does not
rename an existing ad-hoc milestone.

## Shared Estimate surface and billing context

Payment Schedule consumes the same `EstimateSurface`, `EstimateDetailsSection`,
`EstimateItemsSection`, and text-section components as the Progress Invoice
Estimate. It does not define a separate Estimate frame, header, tools rail,
Details layout, or item table. Its feature is inserted after Items in the shared
Estimate scroll area, before Public note, Attachments, and Terms & Conditions.
The launcher initially scrolls that area to Payment schedule.

The existing shared Contract summary appears inside Estimate Details when saved
invoices or Accepted CO context exists. Its Contract value uses the current
accepted contract; Total invoiced uses actual saved invoices from the existing
local billing state. Remaining, percentage, and bar are calculated by the shared
ContractSummary component. Planning, editing, or reordering milestones has no
financial effect, and Payment Schedule does not repeat these totals or progress.
With no saved invoices or CO context, the true uninvoiced
Estimate keeps the summary hidden.

The general Create invoice action uses the established plain-text Details footer
alongside Create PO, below the Contract summary when present. It opens the
invoice-type decision first, then the schedule-aware Progress Invoice scope dialog
when Progress invoice is chosen. Payment schedule has no general invoice
action in its card header. Each unfulfilled milestone retains its own Create
invoice link, which preselects that milestone. Saved invoice links, scenario
state, and existing schedule calculations continue to use local prototype state.
