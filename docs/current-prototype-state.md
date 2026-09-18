# Current prototype state

Updated September 17, 2026. This is the compact handoff for starting a fresh
Codex task in the existing project directory. It summarizes where to look; the
linked requirement documents remain authoritative for detailed product behavior.

## Start here

Read these files before changing UI or behavior:

1. `AGENTS.md`
2. `docs/cinderblock-ui-system.md`
3. `docs/reference-review.md`
4. The requirement document for the prototype being changed

Inspect `git status --short` before editing. The repository has a committed shared
shell baseline, while substantial prototype work is currently uncommitted. Preserve
the existing working tree. Do not reset, clean, or replace uncommitted files.

The source references under `screenshots/` and `pdf-docs/` are inputs. Preserve
them. PDF references guide visual design only; customer previews are React HTML/CSS.

## Implemented prototype modules

The Estimates launcher in `src/app/App.tsx` has two entries: Regular Estimate and
Estimate w/ Retainage. Each mounts independent state through the same
`src/prototypes/progress-invoices/ProgressInvoicesPrototype.tsx` controller.
Regular Estimate exposes Standard/Progress Invoice, Change Order, and Payment
Schedule flows. The retainage entry exposes only its rule, retained billing, and
release Invoice path. Contract Invoice has no separate entry or module. Read
`docs/contract-lifecycle-prototype.md` before changing this flow.

Global Search lives in `src/prototypes/global-search/` and is composed by the app
into the shared workspace header through a `headerSearch` slot. It is always
available in the main workspace header, without a launcher or separate page.
It uses local fixtures, six entity groups, Tabler icons, highlighted matches,
keyboard navigation, and the shared result-open modal. See
`docs/global-search-prototype.md` for requirements and test queries.

The preserved fixture scenarios remain model-test inputs. The product UI exposes
two dedicated launcher states. Each Estimate has a prototype-only Scenario
selector in the header: Regular Estimate covers twelve focused invoice, Change
Order, payment schedule, and acceptance-review states, while Retainage has
No invoice and With invoices. Navigation within either Estimate preserves its
shared local state until a scenario is changed.

The shell launcher lives in `src/prototypes/shell-preview/`. Other sidebar product
areas remain visible and inert. Unsupported actions should be dead clicks without
alerts or placeholder pages.

Keep the dependency direction `app -> prototypes -> shared`. Prototype modules
must not import one another. Put reusable, proven UI in `src/shared/`; keep mock
data and product-specific behavior inside the owning prototype.

## Authoritative requirements

- Consolidation: `docs/contract-lifecycle-prototype.md` (supersedes old independent-module descriptions)
- Canonical business rules: `docs/contract-billing-business-rules.md` (supersedes conflicting lifecycle and financial wording)
- Normative financial engineering spec: `docs/contract-billing-financial-spec.md`

- Progress Invoices: `docs/progress-invoices-prototype.md`
- Change Orders: `docs/change-orders-requirements.md`
- Contract Invoices: `docs/contract-invoices-prototype.md`
- Payment Schedule: `docs/payment-schedule-prototype.md`
- Retainage: `docs/retainage-prototype.md`
- Global Search: `docs/global-search-prototype.md`
- Shared visual system: `docs/cinderblock-ui-system.md`
- Screenshot/PDF findings: `docs/reference-review.md`

The generated contract-workflow review PDF is a review artifact. The Markdown
requirements above and later explicit user decisions control implementation.

This frontend prototype validates important interactions, primary financial
workflows, and consequential user-visible exception states. It is not an
executable substitute for every production rule. The authoritative requirements
and engineering tests own backend integrity, atomicity, idempotency, concurrency,
ledger, stale-write, permission, and integration enforcement when those concerns
do not introduce an unresolved user-facing interaction.

## Shared decisions already established

- Estimates and Change Orders use the full-screen Estimate-style document editor.
- Estimate and Change Order document item tables do not show line-level `% Complete`.
- Progress Invoice and Contract Invoice editors do show line-level `% Complete`.
- Customer invoice PDF-style and web previews also show line-level `% Complete`.
- Starting with the second tracked Progress Invoice, customer PDF-style and web
  previews show prior invoices in chronological order in an informational
  **Invoice history** table; the current invoice is excluded.
- Internal tracked-invoice columns are Item name, Qty, Contract Amount,
  Previously Billed, This Invoice, and `% Complete`.
- `Linked to` is reserved for invoice relationships and displays only a link icon
  plus `Invoice #...`; status and amount are omitted.
- Saving a new Standard, Progress, or Contract Invoice keeps the user on the newly
  saved Draft invoice. Returning to the source Estimate is explicit navigation.
- Invoice setup uses **Continue** only when another setup step follows and
  **Create invoice** when setup is complete and the unsaved New Invoice editor
  opens. The editor also uses **Create invoice** to persist the completed invoice.
  This repeated label is intentional and is not an audit ambiguity.
- A Standard Invoice copied from an Estimate marks that Estimate Converted. Once
  this path is used, Progress Invoices and Change Orders are unavailable for it.
- The prototype demonstrates the Standard Invoice choice and conversion result;
  the existing product's complete Standard Invoice lifecycle is out of scope.
- The prototype may remove a Payment Schedule at Standard Invoice confirmation.
  Production must persist that removal only when invoice creation succeeds.
- Gross Contract Scope equals accepted line scope plus document-level Cost Plus.
  Contract Value subtracts accepted contract discount and may not be negative.
  Draft and Pending Change Orders do not modify either accepted measure.
- Existing invoice history is preserved when accepted Change Orders alter scope.
- An Accepted Estimate can be financially edited only before any invoice or Change
  Order is saved; editing removes acceptance and requires reacceptance.
- `Open` is the invoice posting event. Drafts reserve scope and discounts without
  contributing to Previously Billed, Total Invoiced, or Contract Progress.
- Financial edit/cancel eligibility belongs only to the latest active
  tracked invoice. A later Draft or accepted contract revision locks preceding
  Open invoices, while their normal payment activity remains available.
- Estimate and pre-acceptance Change Order customer links are revision-specific.
  Accepted Change Orders are financially immutable; corrections use another CO.
- Gross Contract Scope drives progress. Total Invoiced is posted gross scope less
  discounts actually applied; tax, retainage, and payments are separate.
- Cost Plus is contract-derived and read-only on Progress Invoices and Change
  Orders. Those documents display the applicable percentage and fee but cannot
  introduce or change the rate. It is selling-price-based explicit scope with
  source lineage, is consumed proportionally with its base scope, and is never
  charged again at invoice level.
- Contract-derived invoice flows inherit the applicable Accepted
  Estimate/contract tax configuration and component taxability; they do not
  introduce a flow-specific rate. Invoice tax is fixed at Draft creation. Historical tax attributed to scope
  removed by an Accepted CO creates a visible Tax Credit Balance that is
  reserved by Drafts and applied only against future calculated invoice tax.
- The contract Discount Pool combines the Estimate discount and signed discount
  adjustments from Accepted Change Orders. Positive CO adjustments increase it;
  negative adjustments reduce it but cannot take the pool below $0. Progress
  Invoices only consume the combined available pool and cannot allocate a
  negative discount or exceed its available balance.
- Retainage is an optional feature layer enabled only by scenarios prefixed
  **Retainage —**. Ordinary Progress Invoice, Payment Schedule, Change Order, and
  Contract Invoice scenarios keep their baseline UI and math. In enabled states,
  retainage reduces amount due while contract and milestone consumption remain
  gross; releases do not create new contract billing.
- Existing product sections outside the prototype scope may remain visible as
  inert structural reference. They must not use hover, pointer, chevron, or other
  affordances that imply interaction, but their non-interactivity is not broken
  navigation or an engineering-handoff blocker.
- The Draft milestone **Invoiced** date presentation is an accepted prototype
  state for this handoff and is not an audit blocker.
- Change Order acceptance uses the saved revision. Dirty editor changes must be
  saved first; empty or meaningless COs cannot be accepted; and an acceptance
  that would make Contract Value negative is rejected without clamping.
- Tracked invoice tax is inherited from the Accepted Estimate/contract and is
  displayed read-only. Contract-derived flows do not establish or override a tax
  rate.
- Cancellation/recovery, save and stale-write failure presentation, unsaved-change
  navigation, and Financial-area permissions reuse existing Cinderblock platform
  conventions unless a genuinely new interaction is identified.

## Prototype-specific state

### Progress Invoices

Implements first/subsequent creation choices, percent/dollar and item-selection
flows, the explicit Estimate w/ discount scenario, discount reservation and
consumption, editable Drafts and latest-unpaid-Open locking, Estimate scenarios,
standard-invoice copying, invoice links, customer PDF-style preview, and customer
web preview. Progress Invoice scope remains tracked even at 100 percent.
Retainage scenarios cover defaults, invoice overrides, accumulated and partial
release history, the shared Draft lock, and a fully invoiced contract with held
retainage. They reuse the shared Payment Schedule card and milestone-aware Progress
Invoice creation. Retainage release stays a contract-level amount and never uses
line-item or milestone release allocation. `docs/retainage-prototype.md` also
defines the future QBO accounting contract: gross work lines plus one negative
mapped Retainage item on Progress Invoices, and one positive Retainage item only
on release Invoices. Those rules are documentation-only; no QBO frontend or sync
implementation exists in this prototype.

### Change Orders

Implements Estimate-style Change Order documents, local lifecycle states, parallel
Draft/Pending COs with line-scoped conflict protection, negative-quantity removals,
valid named $0 adjustments, optional explicit replacement items,
independent added scope, contract lineage/details, contract summaries, accepted CO
effects, over-invoiced presentation, Delete Draft, Cancel Pending, scenario controls,
and live contract-aware invoice creation from the same state. Consult the requirements before changing lifecycle or
contract math because this module contains many finalized interaction decisions.

### Contract-aware billing (consolidated)

Migrated into the Progress Invoice editor; implements tracked billing across the accepted Estimate and Accepted Change Orders.
The editor groups lines by source document, preserves historical billing attribution,
keeps non-billable adjustment lines visible, provides live contract progress, and
has HTML PDF-style and customer web previews.

### Payment Schedule

Implements an Estimate section for advisory milestones and Progress Invoice history.
It includes schedule management, required names with optional percentage-or-dollar
entry and dates, milestone and
ad-hoc invoice creation, saved invoice links, and Accepted Change Order recalculation
of future planned percentages. Allocated values never reserve contract scope. The
shared lifecycle model guarantees that every active Progress Invoice has one linked
milestone containing its actual amount, percentage, and invoice date, creating a
Payment Schedule automatically when the first ad-hoc Progress Invoice is saved. The
optional planned date remains separate from the linked invoice date. The
Percentage and Amount are editable together without an entry-mode switch. Dollar
entry derives a precise canonical percentage; unfulfilled milestone amounts
continue to project from those percentages against Contract Value when the
contract changes. Actual invoice differences do not rebalance other milestones,
and schedule over-allocation remains editable advisory state. The schedule-level **On acceptance** setting can do nothing or create a Draft first-
milestone Progress Invoice, with first-row validation,
Draft collision handling, and duplicate protection. The default Scheduled
milestones scenario is a Draft Estimate. The setting appears only before
acceptance and is omitted from Manage milestones afterward.

Payment Schedule distinguishes Planned, Draft invoice, and Invoiced states. A
Draft-linked milestone uses neutral styling, a document-dollar icon, its invoice
link, and a Draft badge; only Open and later posted states use the green fulfilled
treatment. At $0 Contract Value, percentage milestones remain valid and
project $0 while dollar entry is unavailable.

The dedicated Retainage prototype owns the expanded release ledger: Total
retained, Released, Held, Available to release, and individual release invoices.
Draft releases show a Draft badge beside the invoice number rather than a separate
summary metric. They still reserve capacity and become Released only at Draft →
Open; at most one active release Draft exists.

The first invoice still offers Standard or Progress Invoice. Choosing Standard
with an active schedule confirms that the full Estimate will be converted and the
schedule removed, then uses the shared Standard Invoice editor. Choosing Progress
continues into the schedule-aware scope and milestone flow.

The Payment Schedule prototype renders the complete Estimate. Shared Estimate
Details and Items appear above Payment schedule; launch focuses the scroll area on
Payment schedule while the earlier sections remain reachable above it.

Manually managed schedule rows require names before the schedule can be saved.
Ad-hoc invoice milestone names remain optional; a blank name becomes `Invoice X`,
where X is the row's one-based insertion position in the Payment Schedule.

## Shared UI currently in use

`src/shared/ui/` contains the common primitives, Contract summary, inert/overlay
handling, and reusable Estimate sections/surface. Before adding another copy of
Estimate Details, Items, status, totals, or contract progress, inspect these shared
components and their existing consumers.

Maintain the documented distinction between internal application UI and customer
documents. Do not flatten those variants into one rendering model merely because
their data overlaps.

## Run and verify

From the project root:

```powershell
pnpm dev --host 127.0.0.1
pnpm typecheck
pnpm lint
pnpm build
```

The usual local preview is `http://127.0.0.1:5173/`. A dev server from a previous
task may no longer be running, so verify it before browser inspection.

For UI changes, inspect the relevant scenarios in a realistic desktop viewport and
check the browser console. Run typecheck, lint, and build after implementation.

## Fresh-task prompt

Use a new task in this same saved project directory, not a fork, and start with:

> Continue work on the Cinderblock FE Prototype in the existing project directory.
> Read `AGENTS.md` and `docs/current-prototype-state.md`, then read the requirement
> document for the prototype in my request. Inspect the current working tree and
> implementation before editing. Preserve all uncommitted work and use the current
> source, documentation, screenshots, and UI behavior as context.

Use the saved project directly/local while this work remains uncommitted. A new Git
worktree based on the baseline commit will not contain the current prototype files.
