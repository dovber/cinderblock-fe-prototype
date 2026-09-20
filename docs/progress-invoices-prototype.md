# Progress invoices: frontend prototype requirements

> Canonical posting, financial definitions, discount-pool behavior, cancellation,
> concurrency, and permissions are defined in
> `docs/contract-billing-business-rules.md` and supersede conflicting wording here.
> QuickBooks Online line mapping and post-sync safeguards are defined in
> `docs/quickbooks-online-sync-requirements.md`.

Consolidation update: these requirements now run inside the unified contract
lifecycle. See [current ownership and integration rules](contract-lifecycle-prototype.md).
Earlier independent-sandbox and deferred-retainage statements are superseded by
that integration; the detailed document behavior below remains applicable.

Progress Invoicing is Contract-based from the moment an Estimate is Accepted.
Before any Accepted Change Order, that Contract consists entirely of the Accepted
Estimate. Accepted Change Orders revise the same Contract; they do not start a
new accounting model, ledger, or billing history. Estimate-only and CO-backed
states use the same tracked Progress billing rules and preserve source-line
lineage.

Status: implemented as a local frontend lifecycle prototype. Open Estimates, then
**Open progress invoices prototype**. The implementation includes six mock
billing scenarios, creation dialog with % / $ modes, item selection, and the
full-screen invoice editor, saved linked invoices, and customer-facing HTML
previews. This document remains the scope and acceptance contract; production
integrations remain deferred.

## Scope and reference priority

Build two connected estimate-to-invoice paths within the existing modular
architecture. **Progress invoice** is the tracked billing path through billing
selection, optional item selection, and the progress invoice editor. **Copy to
invoice** is the flexible standard-invoice path. Keep the shared Cinderblock shell
and visual system intact.
Use the existing full-screen editor layout when entering the editor, without
redesigning the workspace shell.

Primary UX references are `create-percentage.png`, `create-amount.png`,
`select-items.png`, `select-items-one-fully-invoiced.png`, and
`new-progress-invoice.png` under `screenshots/`. The other screenshots and
[UI system](cinderblock-ui-system.md) supply visual context. The new boards show
states and branches of one experience, not separate screens to reproduce literally.
Explicit requirements here take precedence over conflicting screenshot labels.

The editor provides two customer-facing views built from the currently opened
progress invoice: a PDF-style printable document and a customer web-link view.
Both are React-rendered HTML/CSS. They use the customer screenshots and PDF
documents as visual references without generating, embedding, or rasterizing a
PDF.

Use plausible, internally consistent mock calculations sufficient to exercise
the UI. Do not implement production allocation, exact rounding, backend validation,
persistence, API calls, QBO behavior, or concurrency. Local input validation is
still needed to demonstrate the supplied error states.

Do not add workflows or dialogs beyond the supplied references and requirements.
In particular, the earlier suggestions for a customer preview, discard-changes
dialog, save-confirmation dialog, sending/payment/acceptance flows, and a complete
saved-invoice lifecycle are not requirements.

## Entry and scenarios

Enter from the existing Estimates area. An accepted estimate with no Progress
Invoice history exposes **Create invoice**. That action opens **What do you want
to invoice?** with **Standard invoice** and **Progress invoice** radio options.
Only the selected type shows its helper: **Invoice the full estimate without progress tracking** for
Standard invoice or **Invoice part of the contract** for Progress invoice.
Cancel closes the dialog. With Standard invoice selected, the primary action is
**Create invoice** and immediately opens the unsaved Standard Invoice editor;
there is no intermediate setup step. With Progress invoice selected, the primary
action is **Continue** and advances to tracked billing setup. Estimates with Progress Invoice history expose the tracked
**Progress invoice** action directly. A complete estimates management feature is
not required.

The focused retainage launcher state reuses this chooser with **Standard invoice**
visible but disabled, followed by **Progress invoice** and **Retainage release**.
The release option appears last only while previously withheld funds have an
unreleased balance greater than zero. The Progress invoice flow continues to offer
**Select items**, which opens
the existing shared item-selection step directly.
Provide easily accessible mock scenarios using consistent Contract source lines:

- Not yet invoiced: every line has zero Previously Billed.
- Partially invoiced: prior billing exists and eligible lines have value remaining.
- Individual items fully invoiced: mix unbilled, partially billed, and fully billed
  lines so selection eligibility and zero-current-amount editor rows can be checked.
- Fully invoiced: Deposit (10%), Progress 1 (40%), Progress 2 (40%), and Final
  (10%) each have a separate linked Progress Invoice; every carried line is
  complete and new creation is unavailable.
- Over invoiced w/ change order: three historical Progress Invoices remain fixed
  at Deposit ($10,000), Progress 1 ($40,000), and Progress 2 ($30,000) after an
  accepted -$25,000 Change Order reduces the $100,000 contract to $75,000. Their
  displayed percentages recalculate to 13.33%, 53.33%, and 40%.
- Has discount: accepted estimate with a $7,500 estimate discount and no prior
  progress invoices.
- Discount partially used: one prior invoice has consumed $1,875 of the $7,500
  pool, leaving $5,625 available.
Scenario selection is a lightweight prototype affordance, not another product
workflow. A separate fully invoiced-estimate workflow is not required. Fully
invoiced individual items are required.

Previously Billed represents prior non-draft billing and excludes the current
invoice. It is not payments received or an unpaid balance. Use believable mock
values without implementing production status logic. Creating an invoice never
sends it; invoice delivery is outside this prototype.

## Choose what to invoice

When Payment Schedule supplies one or more unfulfilled milestones, the existing
**What would you like to invoice?** dialog adds **Select milestone** as its first
option. It expands a milestone selector and nested **Percent or amount** and
**Select items** methods. A planned percentage is prefilled as an editable
suggestion. Milestone selection remains optional; ad-hoc tracked billing remains
available and proceeds through the optional **Payment milestone** step so the
saved invoice is represented in Payment Schedule history. Every saved Progress
Invoice creates or updates one linked milestone, including ad-hoc invoices made
without a pre-existing schedule. Allocated values never reserve contract scope
or bypass the existing remaining-value constraints. See
[Payment Schedule frontend prototype](payment-schedule-prototype.md).

The Progress Invoice editor header uses the invoice's stored milestone name when
one exists: **Deposit · Job 1004 Kitchen Installation**. Without a stored name it
shows only **Job 1004 Kitchen Installation**, with no empty separator. The header
does not show the Job Type color marker. The customer PDF-style and web previews
show that same stored milestone name with the invoice number and omit the row
entirely when it is absent. Generated schedule labels are not invoice milestone
names and do not appear on these invoice surfaces.

Use the referenced choice dialog with mutually exclusive options. The available
choices depend on whether the Contract already has Progress Invoice history.

For the first Progress Invoice, show only:

1. **Percent or amount**: reveal a compact **% / $ switcher** and one input.
   Percentage and dollars are modes of this same option, not different flows.
   For the first Progress Invoice, show **Contract subtotal: $X**. For subsequent
   Progress Invoices, show **Remaining subtotal: $X** using the active scenario's
   actual gross, pre-discount remaining Contract scope.
2. **Select items**: continue to item selection.

Do not show a full-estimate or rest-of-estimate choice for the first Progress
Invoice. Entering this workflow for the first time starts partial, tracked billing.

For subsequent Progress Invoices, show these choices in order:

1. **The rest of this estimate**, with the helper **Remaining subtotal: $X**:
   populate This Invoice with every eligible Contract source line's remaining
   amount. This pre-CO label is legitimate presentation because the Contract
   consists entirely of the Accepted Estimate; it does not define an
   Estimate-level accounting model. When Accepted COs exist, the corresponding
   label is **The rest of this contract**.
2. **Percent or amount**, retaining the same % / $ behavior and applying
   against eligible remaining scope.
3. **Select items**, retaining full-remaining billing for
   each selected eligible line.

Only the selected radio option expands. The rest option shows **Remaining subtotal: $X**
only while selected. Percent or amount shows its contextual helper and controls
only while selected. Select items has no supporting text on this step.

For a subsequent Progress Invoice in percentage mode, show both remaining value
and the maximum remaining percentage as **Remaining subtotal: $X · Y%**. Derive
both from the active Contract state. In dollar mode, show **Remaining subtotal:
$X**. Existing inline
validation must reject a percentage above the displayed remaining limit.

The scope-selection step uses **Continue** because a milestone or item-selection
setup step follows. Continuing from rest or a valid partial value proceeds to
**Payment milestone** for an ad-hoc invoice; continuing from Select items opens
item selection and then the milestone step. For a selected planned milestone,
the selected billing method proceeds through item selection only when applicable.
Choosing the rest of the estimate still creates a Progress Invoice. A
100% entry under Percent or amount also remains a Progress Invoice; the chosen
workflow determines the document type rather than the billed amount.
Cancel returns to the originating estimate context without creating anything.
Changing the selected option updates its conditional controls and primary action.

Percentage applies across all eligible accepted Contract source lines and is
distributed accordingly. Before any Accepted CO, those source lines all belong
to the Accepted Estimate. Retain the reference's original-contract percentage basis and
remaining-percentage context; it is not a selected-items-only percentage or a
percentage that is silently redefined as a percentage of remaining balance.
Fully invoiced items are ineligible for additional billing.

Dollar mode distributes the requested amount across eligible items using a
simple, believable allocation. Exact allocation and rounding are implementation
details, not UX decisions requiring approval. Keep displayed totals consistent
and avoid allocating beyond a line's remaining amount; unequal prior billing
does not justify production allocation machinery.

Required input states: empty, focused, valid, over remaining allowance, and
corrected after an error. Use the inline error **Exceeds remaining subtotal**.
Block invalid submission; blank, nonnumeric, zero, and negative
entries must not create an invoice. Do not introduce an error dialog. Preserve
the entered value while it is being corrected. Mode switching must update the
unit and contextual remaining allowance without treating a dollar value as a
percentage accidentally.

## Select items to invoice

The preceding **What would you like to invoice?** step retains the concise option
label **Select items**. Choosing it opens the item-selection screen titled
**Select items to invoice**.

Show item checkboxes, item names, Qty, and Amount. Show Remaining where prior
billing makes it useful. Keep fully invoiced lines visible, muted, disabled, and
labeled **Fully invoiced**.

- No selection: the current primary action is disabled.
- One or multiple eligible items selected: enable the current primary action.
- Select all/deselect all applies only to eligible items; support an indeterminate
  header checkbox for partial selection.
- Count eligible items, not every visible row: three rows with one fully billed
  item produce **0 of 2 selected** initially.
- Selecting an item invoices its **full remaining amount**, not its original
  contract amount and not a user-entered portion in the selection step.
- Back returns to the preceding setup step; Cancel from the initial choice exits
  the creation flow. Retain working choices when moving backward within the flow.

## Resulting progress invoice editor

Every creation method converges on the same editor. **All accepted Contract source
lines appear**, including unselected and fully invoiced lines with **$0 in This
Invoice**. Before any Accepted CO these are the Accepted Estimate lines; after
Accepted COs they retain their Estimate or CO source grouping. Do not filter the
editor to only the lines being billed.

Preserve item identity/descriptions and Qty separately where appropriate. The
financial columns, in order, are:

**Contract Amount · Previously Billed · This Invoice · % Complete**

- Contract Amount: original line value.
- Previously Billed: posted tracked billing from invoices that precede this
  invoice in the immutable contract billing sequence. Later invoices are never
  presented as previous on an earlier document. Current allocation availability
  remains a separate calculation across all posted allocations and Draft
  reservations.
- This Invoice: amount assigned to the current invoice by the creation flow.
- % Complete: derived display from `(Previously Billed + This Invoice) / Contract
  Amount`, expressed as a percentage; it is not a separate editable input.

Use straightforward mock arithmetic and consistent displayed totals. Fully
invoiced lines show zero current billing and 100% complete. Unselected partially
invoiced lines show zero current billing and retain their prior completion level.
Current billing is visually emphasized; historical values are quieter.

Follow the editor reference for the header, close control, details card, section
navigation, line-item area, totals, and right settings pane. A new invoice uses one
**Create invoice** action. Existing invoices show no Send, Save, saved-state, or
dropdown action in the header. Preserve Qty as always-visible, read-only contract context. Keep salesperson
static/read-only when displayed. Existing references
also guide cost-plus, discount, tax, subtotal, and total presentation; they are not
production calculation specifications.

Cost Plus is inherited from accepted contract scope. The editor displays the
applicable percentage and calculated fee, but the percentage is read-only and
cannot be introduced, removed, or modified from a Progress Invoice. A flat
adjustment belongs in a normal Change Order line item.

The displayed fee is a summary of explicit Cost Plus contract scope allocated
with its associated base lines. The invoice never recalculates Cost Plus over its
subtotal. Cost Plus is based on selling Price, retains source lineage, and may
have taxability independent of its base line.

Progress Invoice creation does not establish a tax rate. It inherits the
applicable tax configuration and line/component taxability from the underlying
Accepted Estimate/contract using the product's existing tax behavior. A 0% source
Estimate therefore opens a Progress Invoice at 0%; the flow must not introduce a
7% or other default rate. The resolved tax facts are stored when the invoice
Draft is created.
The invoice editor displays those resolved tax facts as inherited, read-only
information. The Progress/Contract Invoice flow cannot override the contractual
tax rate or component taxability.

### Contract discount pool

After ad-hoc scope selection, **Payment milestone** explains **Optional. Add a
milestone name to describe what this payment is for.** Its **Milestone name**
field uses the placeholder **e.g. Deposit, Rough-in complete, Final payment** and
may be blank. A blank name is resolved to the generated `Invoice N` name when
the invoice is saved.

Setup actions follow one rule: **Continue** appears only when another
configuration step follows; **Create invoice** appears when the current step
completes setup and opens the unsaved New Invoice editor. Therefore the Payment
milestone or selected-milestone step uses **Continue** when a remaining discount
requires the next step, and **Create invoice** when no discount step is needed.
The item-selection step follows the same rule. **Back** remains the secondary
action.

When a discount pool remains, the final step is **Apply discount?** inside the
same creation dialog. It shows the remaining pool, labels the field **Discount
amount**, prefills a simple proportional suggestion based on selected scope,
allows $0, and validates against the available pool. Clearing the input is
treated as `$0.00` for validation and remaining-pool calculation and must not
produce the positive-amount validation error. **Back** preserves prior setup and
**Create invoice** opens the editor with the chosen discount already populated.
Revisiting the step after changing scope recalculates the suggestion. The editor
does not show another discount prompt. Saved invoice
discounts reduce the remaining local pool. The pool combines the Estimate
discount with discount contributions from Accepted Change Orders; Draft and
Pending Change Orders do not contribute. A Progress Invoice remains a consumer
and cannot exceed the currently available pool. No production allocation or
persistence is implied.

Use normal editor interaction for current-invoice values and descriptions, with
local validation and recalculated totals/completion. Contract Amount and Previously
Billed remain contextual values. Do not permit further billing on a fully invoiced
line. Arbitrary ad-hoc line items are not supported in Progress Invoices. No
separate editing workflow or dialog is needed.

Every editable, billable `This Invoice` field with a positive unused balance shows
`Apply remaining` directly beneath the input. It fills the field through the same
amount state as manual entry using `Contract Amount - Previously Billed`, then
updates line `% Complete`, invoice totals, and all contract-level progress values
immediately. Hide the shortcut when the current amount already equals the remaining
balance and show it again if the contractor reduces the amount. It never appears on
locked, non-billable, removed, or fully billed lines, or in customer-facing output.

## Copy to invoice

**Standard invoice** selected in the uninvoiced estimate's invoice-type step
enters the separate, flexible copy path. **Create invoice** opens the standard invoice
editor directly with every estimate line copied and the source estimate linked.
There is no additional confirmation modal or Learn more step.

Confirming copies every estimate line into a standard editable invoice with **Item
name · Price · Qty · Amount** columns. Copied lines can be edited or removed, and
new ordinary lines can be added. Progress columns and Progress Invoice controls do
not appear. The invoice Details block retains a document-level **Linked to Estimate
#1008** relationship for provenance only; copied lines have no tracking,
synchronization, consumption, or progress calculation against the estimate.

For this local prototype, creating the copied invoice marks the source estimate
**BILLED** regardless of subsequent edits to the copied invoice. Cancel leaves
the estimate unchanged. Saving assigns the mock document number **Invoice #100501**
and transitions the mounted editor from **New invoice** to the saved Draft
**Invoice #100501** without navigating away. The source Estimate is updated in
local state at the same time. When the contractor explicitly closes the invoice,
the Billed Estimate shows the clickable invoice reference under **Linked to**,
using only the link icon and document ID. Opening the reference returns to the
saved standard invoice with its edited lines and invoice details preserved. Before
the standard invoice exists, the Estimate does not render an empty **Linked to**
field.

### Sidebar visibility settings

Keep editor visibility controls distinct from customer-view visibility controls.
Editor visibility controls show or hide only their corresponding internal editor
fields. Customer-view settings are stored and managed independently for each
Progress Invoice and control that invoice's customer PDF and web-link
presentation.

The Progress Invoice **Customer view** settings provide independent visibility
controls for:

- **Quantity**
- **Contract Amount**
- **Previously Billed**
- **% Complete**
- **Taxed**
- **Items not billed**

**Item name** is always shown and has no visibility control. **This Invoice** is
also always shown and has no visibility control because it is the current billed
amount for each line. **Taxed** controls presentation of the line-level
taxed/taxable indicator. **Items not billed** is not a column setting; it controls
whether contract lines with `$0` in **This Invoice** are included in the
customer-facing document.

The same per-invoice customer-view choices apply to both the PDF and customer web
link. They affect presentation only and never change calculations, allocations,
contract progress, tax configuration or treatment, or any other financial state.

Ancillary sections with no specified behavior need no invented functionality. Do
not infer dropdown contents, payment handling, attachment workflows, or history
screens from icons or tabs alone.

## Customer-facing previews

The Progress Invoice editor exposes **PDF preview** and **Customer web preview**.
Both reflect the editor's current line amounts and descriptions,
dates, discount, tax, note, terms, status, and calculated totals. They include
Item name and This Invoice for every included line. Quantity, Contract Amount,
Previously Billed, % Complete, and the line-level Taxed indicator follow that
Progress Invoice's customer-view visibility settings. Contract lines with `$0`
in This Invoice are included or omitted according to **Items not billed**.

The PDF-style preview follows the supplied invoice document references with two
HTML document sheets, merchant/contact framing, payment strip, customer and job
details, the progress table, totals, note, terms, payment history, and page
footers. It is a browser preview only and does not create a PDF file.

The customer web preview follows the supplied invoice weblink hierarchy with a
centered white document, amount-due banner, customer and job details, progress
table, totals, note, collapsible terms, payment history, and customer footer.
When **Items not billed** is enabled, rows with $0 in This Invoice are visually
subdued in both customer views. Changing this setting filters presentation only
and preserves the invoice's financial state.

The first Progress Invoice for a contract does not display **Invoice history**.
Starting with the second Progress Invoice, both the customer-facing PDF-style
preview and customer web-link preview display an **Invoice history** table near
the bottom of the document, after the invoice totals and Contract progress
content. The table contains every prior tracked invoice for the contract in
chronological order and excludes the current invoice. Its columns are
**Invoice**, **Date**, **Amount**, and **Status**. Amount is the prior invoice's
actual total after its applicable invoice discount and tax, rather than its
gross line-item allocation, and Status uses the existing invoice status
terminology. This customer-facing history is informational only; it does not
change contract calculations or invoice state.

Payment, Print, and PDF controls shown inside the customer surfaces are inert
reference chrome. Neither preview exposes editor settings, costs, markup,
margin, profit, or prototype scenario controls.

Create invoice stores the Draft in local React state and keeps the user on the newly
assigned Invoice document. Closing the saved invoice returns to the originating
Estimate. Closing a new editor without saving discards its working changes and
must not change Estimate totals. There is no browser or backend persistence.
This document-creation navigation rule applies consistently to Standard, Progress,
and Contract Invoice creation: creating transitions the open editor to its saved
Draft document; only an explicit close returns to the originating Estimate.

## Contract progress on the Estimate and linked invoices

The originating estimate uses the same full-screen editor skeleton as the supplied
Estimate reference: editor header and actions, section tabs, Details block, normal
estimate item table, totals, document sections, and collapsed right tool rail. All
estimate scenarios render through this one editor component.

Estimate item columns remain **Item name · Price · Qty · Amount** before and after
progress billing. Estimate documents do not show line-level `% Complete` or
progress-invoice accounting columns. Line completion belongs in the Progress
Invoice editor and its customer-facing outputs.

The accepted Estimate's financial controls remain editable only while no saved
tracked invoice and no saved Change Order exists. A saved Draft invoice or
Draft/Pending CO therefore locks Estimate line editing even though it does not
yet change accepted posted billing. If the only downstream record is a Draft CO
and it is deleted, editing may become available again. A financial edit removes
Accepted and requires acceptance again; it does not create a parallel pending
revision.

Every Estimate state except **Not yet invoiced** shows the shared Contract summary block inside Estimate
Details: **Contract value**, **Total invoiced**, **Remaining**, **Contract
progress**, and the progress bar. Contract value means the Accepted Estimate
total plus the net deltas of all Accepted Change Orders; Draft and Pending Change
Orders never affect it. The current Progress Invoice scenarios have no Accepted
Change Orders, so their Contract value equals the Accepted Estimate total.
The summary's net Remaining derives from Contract Value and Total Invoiced. It is
distinct from the gross, pre-discount Remaining subtotal in invoice creation. Contract Progress
derives from posted Gross Contract Scope consumed divided by Gross Contract
Scope; discount does not count as completed work. A saved Draft reserves its
selected scope but is excluded
from Total invoiced, Previously billed, line completion, and Contract progress until
Open. Surface the reservation as quiet secondary context such as **$X reserved by
a draft** so the contractor can explain why available scope is lower. Do not show
Current draft as a primary summary metric.

Linked invoices use the Details block's **Linked to** pattern and can be reopened.
Each relationship chip contains only the link icon and `Invoice #...`; invoice
status and amount are shown on the invoice document rather than in `Linked to`.
There is no separate linked-invoice card or history table. A saved Draft reopens as
editable. A clean saved Draft has no redundant save control; editing it reveals
**Save changes**, which persists the edits in Draft and returns the editor to a
clean state. Only the latest Open tracked invoice in the persisted billing
sequence reopens financially editable, and only until a payment is attached. A
subsequent saved Draft locks preceding Open invoices; deleting or canceling it
may restore the latest preceding unpaid Open invoice's eligibility. Saving a
changed eligible Open invoice uses the existing confirmation **The customer may be unaware
of these changes.** The current invoice remains authoritative; Cinderblock does
not create revisions or automatically notify the customer. The contractor may
send or share the updated invoice through the existing behavior. Partially
paid and Paid invoices reopen locked. At most one linked
invoice may be Draft. When a Draft exists, the Estimate shows no dedicated draft
action and does not offer creation of a second Draft. When all accepted Contract
source scope is allocated, creation is disabled.

The same chronology rule governs cancellation: only the latest active
tracked invoice can be financially reversed, subject to normal payment rules. A
preceding Open invoice stays financially locked once a later active tracked
invoice exists. Its payment activity remains available under ordinary payment
rules; applying, voiding, refunding, or unapplying a payment does not reverse its
contract allocations or make that earlier invoice editable again.

Contract billing status belongs to the current Contract. With no posted
tracked billing it is **ACCEPTED**; with posted billing and remaining current
Contract scope it is **PARTIALLY BILLED**; with posted tracked billing and no
remaining current Contract scope it is **BILLED**. A Draft reservation alone
does not change the status.
If a positive Accepted CO adds scope after full conversion, the Contract returns
to **PARTIALLY BILLED** without rewriting prior billing. The original Estimate
and every Accepted CO reflect this Contract billing status wherever Contract
billing state is presented. CO approval lifecycle state remains a
separate accepted fact.

## Cross-workflow billing mode

Invoice type is fixed by the chosen path. Once a Progress Invoice exists, Standard
invoice creation against the Estimate is disabled. The first Accepted Change
Order does not switch accounting models: future tracked invoices continue against
the same Contract, ledger, history, and pools. The product may automatically use
the established Contract Invoice presentation variant—Contract wording and
Estimate/CO source groupings—without asking the contractor to choose a mode.

Successfully saving a Standard Invoice Draft from an otherwise uninvoiced
Estimate creates the exclusive conversion lock. Entering or abandoning the
unsaved editor does not. Deleting that Draft or canceling the Standard
Invoice removes the lock, subject to normal history and conflict rules.

## Tax Credit Balance and final discount warning

Invoice tax is established when the Draft is created and is not rerated merely
because the status changes to Open. If an Accepted Change Order later removes
previously taxed scope, the historical tax attributed to that scope becomes a
Tax Credit Balance. New Draft invoices reserve and apply no more than the lesser
of available Tax Credit Balance and calculated invoice tax, show the applied
credit as a separate negative totals row, and leave any remainder visible on the
contract. The credit never reduces principal and does not change Contract Value,
progress, Total Invoiced, discount, or retainage. Draft edits recalculate the
reservation; Draft deletion/cancellation releases it; Open consumes it.

When opening the invoice that consumes the final remaining gross scope while a
contract discount remains unused, show the remaining discount and resulting
over-invoiced amount in a warning. The contractor may proceed. The warning does
not alter the invoice or apply discount automatically.

If a Change Order is Accepted while a tracked Draft invoice exists, release the
Draft's scope and discount reservations, mark the invoice Canceled, retain it as a
read-only row in the invoice table with its Estimate link, and require a new invoice
against the updated accepted contract.

CO acceptance also creates a new contract-revision boundary. Existing Open
tracked invoices from the preceding revision remain valid for payment activity
but become financially locked; newly accepted CO scope must be billed on a new
tracked invoice against the new revision. It cannot be added retroactively to an
older Open invoice.

## Implementation boundaries and acceptance checks

Retainage behavior is specified in `docs/retainage-prototype.md`. The Estimate
provides the future-invoice default, each Draft can override it, Contract progress
continues to use gross line billing, and release invoices change retainage history
without consuming contract scope. Standard Invoice copying remains unchanged.

Keep feature components, mock scenarios, state, calculations, and CSS Modules
under `src/prototypes/progress-invoices`. Export through `index.ts`. The app owns
composition/navigation between independent prototypes; no cross-prototype imports.
Do not modify the shared shell to implement feature behavior.

Check each creation method against the required scenarios. Verify that the first
invoice omits the rest-of-estimate option and subsequent invoices show the
applicable rest-of-estimate/contract label with the **Remaining subtotal: $X**
helper. Verify the
switcher, conditional actions, inline correction, selection counts, disabled rows,
back/cancel behavior, and all-lines editor display. Verify prior billing stays
unchanged as the current invoice changes and completion reflects both values.
Verify post-save totals, the one-draft rule, draft edit persistence, unsaved close,
historical invoice context, locked non-draft lines, disabled fully-invoiced
creation, and consistent current-invoice data across both customer previews. No
extra workflow or dialog should be introduced.

## Production access and lifecycle

Existing Financial-area access governs Contract Billing; no feature-specific RBAC
matrix is introduced. The lifecycle is Draft → Open → Partially Paid → Paid, and
Open invoices never return to Draft. Financial editing follows the latest-unpaid-
Open rule above. Every contract-affecting save validates the current contract
revision in production. Ordinary nonfinancial fields continue to follow existing
Cinderblock behavior where they do not change allocations, discounts, retainage,
tax, progress, Total Invoiced, or amounts owed.
