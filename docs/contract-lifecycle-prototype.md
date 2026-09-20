# Unified contract lifecycle prototype

> The lifecycle and financial definitions in
> `docs/contract-billing-business-rules.md` are authoritative and supersede any
> older conflicting wording below. In particular, `Open` replaces `Sent` as the
> posting state; only the latest active unpaid tracked invoice remains eligible
> for financial editing or cancellation, and an accepted contract
> revision also locks Open invoices created against an earlier revision.
> QuickBooks Online document mapping, synchronization boundaries, and post-sync
> conflict safeguards are defined in
> `docs/quickbooks-online-sync-requirements.md`.

Consolidated September 15, 2026. This document supersedes earlier statements that
Progress Invoices, Change Orders, Contract Invoices, and Payment Schedule are
independent sandboxes.

## Entry points and ownership

The landing page has two scenario entries: **Regular Estimate** and **Estimate w/
Retainage**. Both reuse the same `ProgressInvoicesPrototype` controller with
independent initial state. Regular Estimate exposes Standard and Progress Invoice,
Change Order, and Payment Schedule flows. Estimate w/ Retainage starts in **No
invoice** and can switch to **With invoices** to expose held funds and the release
Invoice flow. There is no separate Contract Invoice launcher, route, controller,
editor, or invoice ledger.

Inside Regular Estimate, a prototype-only **Scenario** selector replaces the
estimate header action cluster. It offers twelve focused review states: **No invoices**,
**Estimate w/ discount**, **With progress invoice**, **Fully invoiced**, **With
change order**, **With multiple change orders**, **Fully invoiced w/ change
orders**, **Over invoiced w/ change order**, **Payment schedule**, **Payment
schedule with draft**, **Payment schedule in progress**, and **Payment schedule
over allocated**. The four Payment Schedule states cover a configured schedule
with no milestone invoices, an Accepted Estimate with a Draft milestone invoice,
a schedule with invoiced and remaining milestones, and an over-100% allocation
that exposes the existing warning in both the Estimate table and Manage Payment
Schedule modal.
Every state uses a $100,000 accepted original Estimate. The additive Change Order
states begin with a posted $10,000 **Deposit** invoice against that original value;
schedule states use Deposit 10%,
Progress 1 40%, Progress 2 40%, and Final 10%. The selector resets transient
editors and dialogs when the state changes.

**Over invoiced w/ change order** preserves three posted milestone invoices
totaling $80,000 and applies an accepted $25,000 scope reduction, adjusting the
contract to $75,000. The shared contract summary reports the $5,000 overage and
106.67% progress without creating a credit, refund, or corrective invoice. The
locked milestone percentages dynamically reflect each historical amount against
the adjusted contract value.

The module owns the original Estimate, COs, tracked invoices, Standard Invoice
conversion, milestone history, retainage defaults, and release history. The two
launcher entries mount separate mock contracts. Closing either returns to the
launcher.

## Contract and billing

- Progress Invoicing is Contract-based from Estimate acceptance. Before an
  Accepted CO, the Contract consists entirely of the Accepted Estimate; Accepted
  COs revise that same Contract. The first Accepted CO does not migrate history,
  reset progress, create a ledger, or introduce a second accounting model.
- The canonical contract identity is Estimate #1008, with sequential #1008-CO1,
  #1008-CO2 documents. Previously separate fixture identities are normalized.
- Gross Contract Scope is accepted line scope plus document-level Cost Plus. Contract
  Value subtracts accepted contract discount and may not be negative. Pending,
  Draft, Declined, and Canceled orders have no accepted-value effect.
- CO edits are staged in the editor. Unsaved financial changes do not mutate the
  accepted contract. Accepted COs are financially immutable; every correction
  uses another Change Order.
- Invoice amounts are keyed by stable source-line IDs. Removing scope never
  transfers its historical billing into newly added scope.
- Removed originals and negative adjustments remain in invoice editors and
  customer previews. Negative adjustments are not billable; historical originals
  retain their actual billing. Selection omits non-billable scope.
- One creation dialog and one invoice editor serve Estimate-only and CO-backed
  billing. CO-backed views repeat source headings and aligned column headings.
- Per-line remaining and the Contract-level Remaining subtotal constrain creation
  and manual entry. Remaining subtotal is gross available source scope before
  discount; the separate Contract summary Remaining is net Contract Value less
  Total Invoiced. Contract progress and over-invoiced displays remain gross.
- Drafts reserve scope and share the retainage-release Draft lock. They do not
  contribute to posted billing. Creating remains on the numbered Draft. Invoice
  delivery and Send actions are outside the prototype.
- Accepting a CO cancels open tracked Drafts, releases reservations and milestone
  fulfillment, preserves cancellation reason/time and original invoice amounts,
  and shows a notice. It also locks preceding Open invoices against financial
  edits because they belong to the prior contract revision. A fresh draw uses the
  changed accepted contract.
- Standard conversion preserves the shared copy editor and removes the schedule;
  subsequent tracked billing and CO creation are unavailable.

## Unified tracked-invoice presentation

The existing Progress Invoice editor retains its totals, discount pool, retainage,
settings, and previews. When Accepted COs exist, the same Contract-based editor
adds the established source hierarchy and contract-aware wording; this is a
presentation variant rather than an accounting transition. Both HTML customer previews repeat source/column
headings, preserve original historical billing, show the adjusted-completion
asterisk when applicable, and show cumulative contract progress after totals.
No duplicate invoice editor or customer preview remains.

Cost Plus is inherited from the accepted contract and displayed read-only on
Progress Invoices and Change Orders. Accepted Change Order discounts adjust the
same contract-level Discount Pool as the Estimate discount: positive adjustments
increase it, negative adjustments reduce it, and the result cannot fall below
$0. Progress Invoices consume that combined pool without changing the underlying
contractual discount and remain limited to its available balance;
Change Orders may contribute a discount greater than the pool's prior balance.

Cost Plus is calculated from selling Price, represented as scope with underlying
line lineage, and consumed proportionally with that base scope. Invoice totals
never apply another Cost Plus percentage over the allocated Cost Plus amount.
Historical tax and Tax Credit behavior use persisted source allocation facts as
specified in `contract-billing-financial-spec.md`.

## Milestones and retainage

The existing schedule manager and Standard Invoice confirmation are reused.
All lifecycle scenarios can manage milestones. Future planned amounts use the
current accepted contract; posted fulfillment keeps its original contract basis.
Saved Draft-linked milestones use a neutral invoice state until the Draft becomes
Open, then adopt the existing green fulfilled treatment.
On-acceptance settings, validation, duplicate protection, and Draft collision
handling remain available through the schedule scenarios.

Retainage remains opt-in through the existing retainage scenarios, including the
schedule on-acceptance scenario. COs can be created from those same contracts.
The rate applies to future invoices; historic withholding remains unchanged.
Release invoices draw from a single contract-level pool and never consume scope,
alter milestone fulfillment, or increase contract progress.

The focused retainage entry has exactly two scenarios. **No invoice** has a 10%
rule and no billing or held funds. **With invoices** has $75,000 gross billed,
$7,500 retained, and $25,000 remaining. Its **What do you want to invoice?**
dialog lists disabled **Standard invoice**, **Progress invoice**, and—only in the
eligible held-balance state—**Retainage release** last. Item selection remains a
method within the Progress invoice flow. Change
Order, Payment Schedule, estimate-header utilities, and other unrelated entry
points are hidden.

## Validation

Run:

```powershell
node --import ./scripts/register-typescript.mjs --test src/prototypes/progress-invoices/model.test.mjs src/prototypes/progress-invoices/lifecycle.test.mjs
pnpm typecheck
pnpm lint
pnpm build
```

Model tests cover all preserved scenarios plus acceptance collisions, historical
line attribution, reservations, over-invoicing, adjusted completion, schedule
history, and retainage after a live CO acceptance. Browser review covers the
launcher, CO-to-invoice navigation, saved Drafts, canceled invoice history,
grouped customer previews, milestones, retainage, and Standard conversion.

Detailed rules continue in `progress-invoices-prototype.md`,
`change-orders-requirements.md`, `contract-invoices-prototype.md`,
`payment-schedule-prototype.md`, and `retainage-prototype.md`.
