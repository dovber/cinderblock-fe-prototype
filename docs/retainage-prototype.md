# Retainage frontend prototype

> Canonical posting, Gross Contract Scope, Total Invoiced, cancellation, and
> retainage-recognition rules are defined in
> `docs/contract-billing-business-rules.md` and supersede conflicting wording here.

Consolidation update: these requirements now run inside the unified contract
lifecycle. See [current ownership and integration rules](contract-lifecycle-prototype.md).
Earlier independent-sandbox and deferred-retainage statements are superseded by
that integration; the detailed document behavior below remains applicable.

## Purpose and scope

Retainage is an optional Estimate-level default for tracked Progress Invoices in
dedicated, explicitly prefixed Retainage prototype scenarios.
It withholds part of an invoice's currently due amount while preserving the full
gross billing against accepted contract scope. This is local mock state only.

The prototype intentionally excludes per-line retainage or release rules,
labor/material policies, jurisdiction rules, automatic threshold reductions,
Change Order-specific settings, and a top-level application navigation area.

The **Estimate Prototypes** landing page includes a focused **Estimate w/
Retainage** entry beside **Regular Estimate**. It opens the shared implementation
with a two-option scenario selector: **No invoice** and **With invoices**. Change
Order, Payment Schedule, PO, and header utility actions are hidden. **What do you
want to invoice?** uses the normal structure: disabled **Standard invoice**,
**Progress invoice**, and—only while held funds are eligible—final **Retainage
release**. Item selection remains available within the Progress invoice flow.

## Estimate default

Only a Retainage scenario adds **Retainage** to Estimate Details, with an optional percentage and the text
**Withhold this percentage from progress invoices until retainage is released.**
Blank means no retainage. A changed value applies only to future invoices; saved
invoice rates and historical withheld/released amounts never recalculate.

Ordinary Progress Invoice, Payment Schedule, Change Order, and Contract Invoice
scenarios contain no retainage field, totals, actions, state, or calculations.

## Progress Invoice calculation

Draft Progress Invoices copy the current Estimate default and allow a 0–100
percent override. The override affects only that invoice. Standard Invoice copying
does not use retainage.

Cost Plus, when applicable, is inherited from accepted contract scope and remains
read-only on the invoice. Line items and Contract progress remain gross. Invoice totals calculate in this
order:

1. progress-billed base and explicitly allocated Cost Plus contract scope;
2. allocated contract discount;
3. tax against the discounted taxable principal;
4. retainage percentage against discounted principal only, excluding tax;
5. **Total due** after subtracting retainage.

Retainage does not establish a separate tax rate or taxability rule. The
underlying Progress/Contract Invoice inherits the Accepted Estimate/contract tax
configuration and component taxability through existing product behavior, just
like the same invoice without retainage. Retainage release remains a release of
previously withheld principal and does not create a second tax event.

The line table does not add a retainage column. **This Invoice**, line completion,
Balance to Finish, Payment Schedule fulfillment, and Contract progress all use the
full gross line billing.

## Payment Schedule

Historical fixtures retain their milestone data for calculation tests, but the
focused retainage entry does not expose Payment Schedule management. Progress
Invoice creation continues to reuse the shared invoice implementation.

A milestone is fulfilled by its full $25,000 gross Progress Invoice. With 10
percent retainage, $2,500 enters the contract-level Retainage balance and $22,500
is due, while the milestone is fully invoiced for $25,000. Retainage is never a
fifth milestone and is excluded from the milestone's Contract Value basis.

## Retainage block and contract history

Only the dedicated Retainage prototype shows the expanded **Retainage** block.
It lists every release invoice and presents **Total retained**, **Released**,
**Held**, and **Available to release** evenly across the summary, separately from
Contract value and Total invoiced. A Draft release invoice displays its status
beside the invoice number; there is no separate Draft-reserved summary metric:

The configured Retainage percentage remains visible on the Estimate before any
Retainage is withheld. The tracking block stays hidden while Total retained is
$0 and no release Invoice history exists. It appears once the first posted
Progress Invoice with Retainage makes Total retained greater than $0, and remains
available whenever retained balance or release history exists.

`retainage held = total retained − retainage released`

Total retained is the cumulative retainage actually withheld across posted
Progress Invoices. It is not calculated from the full contract value and does
not decrease when retainage is released. Released increases when a Retainage
release Draft becomes Open. A Draft reserves release capacity but does not count
as Released or reduce Held. Available to release is Held less the internally
reserved Draft amount.

A retainage release makes previously billed money due and never increases Total
invoiced, line completion, or Payment Schedule consumption. The balance is held
once for the whole Estimate contract; there are no line, milestone, Progress
Invoice, or Change Order release pools. A fully invoiced contract can therefore
show 100 percent Contract progress, four of four milestones invoiced, and
retainage still held.

## Release flow and draft lock

When held retainage is greater than zero, **Release retainage** opens a dialog
showing held retainage and an amount prefilled to the full available balance.
Partial releases are allowed. The amount must be greater than zero and cannot
exceed held retainage. **Create invoice** opens an unsaved **New retainage
invoice** in the regular Invoice editor foundation. Creating the Draft reserves
the selected amount. Retainage is counted as released only when the Draft becomes
Open. At most one active retainage-release Draft may exist. When it exists, the
Retainage block opens that Draft instead of starting another release.

The release invoice intentionally contains no contract or retainage-by-line table.
It keeps the regular Invoice shell, Details, Public note, Payments, Attachments,
Terms & Conditions, editor settings, and save behavior. Invoice details inherit
the Customer, Job, Estimate link, and Salesperson and include editable Invoice
date, Due date, PO number, and Customer reference fields while the invoice is a
Draft. The specialized **Retainage release** section replaces the normal editable
item table and shows the Retainage held at Draft creation plus an editable Amount
to release. The unsaved creation state has no totals block because Amount to
release is the Invoice amount and there are no other financial adjustments. It
has no product/service line, subtotal billed, or tax row.

The amount controls remain available while the invoice is a Draft. After the
Invoice is saved, its normal A/R summary shows **Total**, actual **Amount paid**
when applicable, and **Balance due**, without a separate **Retainage released**
row. Later locked statuses keep that normal summary without presenting the
creation controls as editable invoice content.

After save, the editor stays on the normal numbered Invoice in Draft status with
the context **Retainage release · Job #1004 Kitchen Installation**. The release
appears in the Retainage block and linked-invoice history. For prototype
accounting, the amount becomes released when the Draft changes to Open. Canceling
the Draft restores its reserved capacity. Amount paid reflects actual payments applied to the
Invoice, and Balance equals the Invoice total less those payments.

The normal PDF-style and customer web previews remain available. They use the
standard Invoice identity, customer and date details, payment call to action,
notes, terms, and payment history. Their single financial content row is
**Retainage release**, followed by the linked **Estimate #...** as secondary text
and the release amount. Customer totals begin with **Total**, then show actual
**Amount Paid** when applicable and **Balance Due**. They do not repeat a
**Retainage released** totals row or show internal accounting helper copy.

Progress Invoice Drafts and retainage-release Drafts share one lock. Either Draft
prevents creation of another Progress Invoice or release invoice against the same
contract. Release history is additive; the prototype never overwrites withheld
history with one mutable balance.

## QuickBooks Online integration requirements

This section specifies future backend and integration behavior only. The frontend
prototype must not add QBO API calls, sync controls, account selectors, mapping
screens, setup errors, or other QBO UI for these requirements.

### Accounting representation

Cinderblock keeps Retainage as a totals-level Progress Invoice adjustment and a
Retainage release as a dedicated Invoice for previously withheld money. QBO may
represent both through one company-level Product/Service item named
**Retainage**, mapped to the appropriate **Retainage Receivable** account. The
same mapped item must be reused for every retainage rate, Progress Invoice,
Retainage release, and accepted Change Order. Do not create rate-specific or
release-specific Retainage items.

The line sign defines the transaction:

- a negative Retainage line records retainage withheld on a Progress Invoice;
- a positive Retainage line records retainage made due on a release Invoice.

This QBO accounting representation must not be exposed as a product/service line
in Cinderblock's internal or customer-facing Invoice item table.

### Progress Invoice sync

A Progress Invoice must sync its contract/work lines at their actual billed
quantities, rates, and gross amounts. The integration then appends one negative
Retainage line for the actual retainage stored on that Invoice. It must not reduce
or proportionally allocate retainage across service, material, Change Order, or
milestone lines.

For example, $10,000 of billed work with $1,000 retained syncs conceptually as:

```text
Work lines     +$10,000
Retainage       -$1,000
Invoice total   $9,000
```

An Invoice-level override controls the stored and synced amount. A 0 percent
override produces no Retainage line; a 5 percent override syncs the actual stored
5 percent amount even if the Estimate default is 10 percent. Historical invoices
must never be recalculated from the Estimate's current Retainage setting.

### Retainage release sync

A Retainage release Invoice must sync only one positive Retainage item line using
the release amount persisted on that Invoice:

```text
Retainage      +$1,000
Invoice total   $1,000
```

The integration must not resend contract work, Estimate lines, Change Order
lines, Payment Schedule milestones, or original quantities. Those values were
already billed on the original Progress Invoice. The positive line reverses the
earlier withholding effect and creates Accounts Receivable; it is not new revenue
or new contract work. A partial release likewise uses its own stored amount and
must not derive it from line items, current Retainage percentage, Contract
progress, Payment Schedule, or earlier Invoice totals.

### Mapping and sync validation

If an Invoice contains Retainage and the company-level QBO Retainage mapping is
missing, sync must block or fail using the existing integration setup/error
pattern. It must not silently omit Retainage or map it to a normal revenue item.
The conceptual setup message is **Set up QuickBooks retainage before syncing this
invoice.**

QBO tax configuration for the Retainage item must preserve the Cinderblock
Invoice total and avoid an unintended second tax event. The backend must use the
persisted Cinderblock amounts rather than independently recalculating Retainage in
QBO.

Backend implementation must verify current QBO API capabilities at implementation
time and must not assume QBO provides a native invoice-level retainage field. The
safe requirements model remains gross work lines plus one negative Retainage item
for Progress Invoices, and one positive Retainage item only for release Invoices.

### Cinderblock invariants

QBO representation must not change Cinderblock's product model:

- Amount paid includes only actual payment transactions applied to the Invoice;
  withheld Retainage is never a payment.
- Contract progress and Total invoiced remain based on gross contract billing.
  A release Invoice does not increase either value.
- Payment Schedule progress remains unchanged. A release does not create,
  consume, reopen, or modify a milestone.
- Contract line billing, Previously Billed, This Invoice, Balance to Finish,
  Estimate items, and Change Order items are not consumed again by a release.
- Accepted Change Order work syncs as ordinary billed contract lines. Retainage
  still uses the same single mapped item and contract-level accounting model.

## Scenarios

- **Retainage — Not yet invoiced** — a $100,000 Estimate with a 10 percent default,
  four planned milestones, and no Progress Invoices or held Retainage.
- **Retainage — Progress invoice** — Deposit is fully invoiced for $25,000 gross,
  $2,500 is withheld, $22,500 is due, and $75,000 remains to invoice.
- **Retainage — Accumulated** — three milestone Progress Invoices total $75,000
  gross, with $7,500 withheld and held.
- **Retainage — Partial release** — gross billing remains $75,000 while $2,500 has
  been released and $5,000 remains held; another partial release can be created.
- **Retainage — Fully invoiced** — four milestone Progress Invoices total $100,000,
  Contract progress and Payment Schedule progress are both 100 percent, and
  $10,000 remains held with **Release retainage** available.

The dedicated invoice-override scenario is removed. A Draft Progress Invoice still
allows its copied Retainage rate to be changed, including to zero, and held
Retainage continues to use actual amounts from historical invoices rather than the
Estimate's current default.
