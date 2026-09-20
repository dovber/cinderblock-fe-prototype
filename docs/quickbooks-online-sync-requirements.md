# QuickBooks Online synchronization requirements

Updated September 20, 2026. These requirements define the future accounting
integration for Estimates, Change Orders, Standard Invoices, tracked
Progress/Contract Invoices, and Retainage release Invoices. They are backend and
integration requirements only. They do not authorize prototype UI, state, flow,
calculation, or behavior changes.

This document is authoritative for QBO synchronization. The contract lifecycle,
posting rules, and financial calculations remain authoritative in
[`contract-billing-business-rules.md`](contract-billing-business-rules.md) and
[`contract-billing-financial-spec.md`](contract-billing-financial-spec.md).

## System ownership and integration boundary

Cinderblock is the source of truth for contract billing logic. QuickBooks Online
is an accounting destination.

Cinderblock must not use QBO Progress Invoicing and must not create or maintain
QBO Estimate-to-Invoice progress relationships. QBO does not need to represent or
reconstruct:

- Contract Progress, Previously Billed, Balance to Finish, or Remaining;
- the contract discount pool;
- the Cost Plus ledger or pool;
- the Retainage ledger;
- Change Order lineage or relationships;
- Payment Schedule or milestone state;
- Cinderblock contract revisions, reservations, or allocation records; or
- any other Cinderblock-specific contract accounting state.

Only the accounting documents and values represented by the Cinderblock document
are synchronized. Manual QBO changes must never recalculate or directly mutate
Cinderblock contract progress, prior billing, remaining scope, discount, Cost
Plus, Retainage, Change Order, milestone, or allocation state.

A valid local Cinderblock operation remains valid when its QBO sync fails. A QBO
failure does not roll back, delete, or silently rewrite the Cinderblock document.

## Document mapping

| Cinderblock document | QBO document | Required behavior |
| --- | --- | --- |
| Estimate | Standard QBO Estimate | Do not enable or use QBO Progress Invoicing. |
| Change Order | Separate standard QBO Estimate | Do not modify the original QBO Estimate. Preserve the Cinderblock Change Order identity, such as `EST-123-CO1`, in the QBO document number/identity mapping. No other QBO relationship to the original Estimate is required. |
| Standard Invoice | Standard QBO Invoice | Do not create a QBO Estimate-to-Invoice link. |
| Progress Invoice | Standard QBO Invoice | Send the actual accounting lines and values only. Do not use QBO Progress Invoicing. |
| Contract Invoice | Standard QBO Invoice | Treat identically to a Progress Invoice at the QBO boundary. QBO does not receive the accepted-contract lineage. |
| Invoice created from a Change Order | Standard QBO Invoice | QBO does not need to know the source Change Order. |
| Retainage release Invoice | Standard QBO Invoice | The Invoice may contain only one positive `Retainage release` line. |

The lack of QBO document linkage does not remove Cinderblock lineage. Cinderblock
continues to retain its own Estimate, Change Order, and Invoice relationships.

## Billing status mapping

Cinderblock owns the finer-grained Contract billing status. QBO retains its
existing, coarser **Converted** semantic for documents that have entered billing:

| Cinderblock status | QBO semantic |
| --- | --- |
| Partially Billed | Converted |
| Billed | Converted |

The integration must not rename, collapse, or overwrite Cinderblock's local
status because both local states map to the same QBO semantic. QBO Converted does
not prove that the current Cinderblock Contract has no remaining billable scope;
that determination remains entirely within Cinderblock.

## Invoice line synchronization

Each Cinderblock Invoice line is transformed into the ordinary QBO Invoice line
needed to preserve its accounting quantity, rate, amount, taxability, and mapped
Product/Service or account. QBO receives the resulting lines; it does not derive
them from Cinderblock contract state.

### Fractional Progress Invoice quantities

Cinderblock may hide fractional quantities in its customer-facing Progress
Invoice presentation, but the actual billed quantity must synchronize to QBO.
Cinderblock calculates that fraction before sync.

For a contract line with quantity `10` and rate `$100`, billing 25 percent sends:

```text
Qty:     2.5
Rate:    $100
Amount:  $250
```

The QBO payload must not round the quantity to the customer-visible display value
or replace it with a synthetic one-unit amount when doing so would lose the
actual quantity and rate.

## Retainage

Retainage remains a Cinderblock totals-level computation and ledger. Its QBO line
representation must not turn it into editable contract scope in Cinderblock or
change Contract Progress, Total Invoiced, Payment Schedule, or line allocation.

### Retainage withheld

A Cinderblock Invoice with withheld Retainage must append one dedicated negative
QBO line:

- Item name: `Retainage`
- Qty: `1`
- Amount: the negative persisted Retainage amount

Example:

```text
Retainage | Qty 1 | -$1,000
```

The line uses the normal QBO Product/Service and account mapping rules. It is not
allocated across work lines. A zero Retainage amount sends no Retainage line.

### Retainage release

A Retainage release Invoice must send one dedicated positive QBO line:

- Item name: `Retainage release`
- Qty: `1`
- Amount: the positive persisted release amount

Example:

```text
Retainage release | Qty 1 | $1,000
```

The line uses the normal QBO Product/Service and account mapping rules. The QBO
Invoice may consist only of this line. It must not resend contract work, Estimate
lines, Change Order lines, milestones, or original quantities. QBO does not
maintain or recreate the Cinderblock Retainage ledger.

## Discounts and Cost Plus

QBO receives only adjustments represented on the Cinderblock document being
synchronized:

- If a discount appears on the Estimate, Change Order, or Invoice, synchronize
  that discount through the established compatible QBO representation.
- If no discount appears, do not send a zero discount or synthesize one.
- If Cost Plus appears on the document, synchronize the represented Cost Plus
  value through the established compatible QBO representation.
- If Cost Plus does not appear, do not send a zero fee or synthesize one.

QBO does not receive or reproduce the contract discount pool, Cost Plus pool,
Cost Plus derivation, prior consumption, remaining balance, or underlying source
line lineage. Cinderblock calculates and persists the document values before
sync. The QBO transaction must reconcile to those represented values without
creating a second Cost Plus calculation.

## Sales tax

For a Cinderblock account connected to QBO, Cinderblock relies on the connected
QBO tax configuration and rate for sales-tax calculations. The integration must
synchronize taxable status and tax-relevant line facts correctly so the resulting
Cinderblock and QBO tax remain aligned.

The ordering and treatment of discounts, Retainage, Cost Plus, taxable lines, and
other adjustments must be compatible with confirmed QBO behavior. A small
discrepancy is an implementation, ordering, precision, or rounding issue to
reconcile; it must not introduce an independent competing Cinderblock tax model.
The exact compatible ordering must be documented in this file once validated
against the production QBO API and tax configuration.

## Last-successful-sync record

For every synchronized Cinderblock document, the integration must retain enough
state to distinguish an unchanged QBO transaction from a diverged one. At
minimum, retain:

- the QBO realm/company and transaction identifier;
- the QBO transaction type;
- QBO's transaction version/concurrency value, such as `SyncToken`;
- the last successful sync timestamp;
- the Cinderblock document revision synchronized;
- a canonical last-synced snapshot or fingerprint of material accounting fields;
  and
- the last sync outcome and actionable error details.

Material fields include document identity, customer, dates, lines, quantities,
rates, amounts, taxability and tax, discounts, Retainage, Cost Plus, totals,
transaction status, void/deletion state, and payment-sensitive state where QBO
exposes it. Non-material metadata may be excluded only after product and
accounting review.

## Preflight and concurrency protection

Before updating, voiding, deleting, or recreating an existing QBO transaction,
the implementation must compare current QBO state with the last successfully
synced state. It must also use QBO's available optimistic-concurrency mechanism,
such as `SyncToken`, on the write.

The product must not rely only on an API stale-write failure as its conflict user
experience. The intended sequence is:

1. Read or otherwise obtain the current QBO transaction state.
2. Detect whether it changed after the last successful sync.
3. Prevent a silent overwrite, recreation, deletion, or other destructive write.
4. Record and surface a QBO sync conflict.
5. Require an intentional and authorized resolution path.
6. Revalidate QBO version and payment state immediately before the resolved write.

A race detected by QBO after preflight must produce the same conflict outcome,
not an automatic retry that overwrites newer QBO data.

## Required post-sync scenarios

### 1. QBO transaction unchanged

If the QBO transaction still matches the last successfully synced state, a later
Cinderblock edit may use the normal QBO update path. The write must still include
the current QBO concurrency/version value.

### 2. QBO transaction edited after sync

If a user or another integration materially changes the QBO transaction:

- do not silently overwrite those changes;
- mark the Cinderblock document as having a QBO sync conflict;
- preserve the Cinderblock contract and document state;
- show that QBO differs from the last successful sync; and
- require user intervention before another material QBO write.

Suggested conflict copy:

> This invoice was changed in QuickBooks after it was last synced. Review the
> changes before syncing again.

Equivalent document-specific wording applies to Estimates and Change Orders.
Exact production UX and final action labels are not defined by this requirements
pass.

### 3. QBO transaction deleted or voided

If QBO reports that the mapped transaction was deleted, voided, or is otherwise
unavailable, do not silently recreate it. Record a conflict, preserve the
Cinderblock document and contract state, and require intentional resolution.
Deletion and voiding are distinct accounting states when QBO distinguishes them.

### 4. Payment exists in QBO

If a QBO Invoice has an applied payment, credit, or other settlement state, treat
a destructive or material Cinderblock-initiated change as accounting-sensitive.
Do not blindly replace, delete, void, or materially rewrite the QBO Invoice.
Surface the condition and require a safe resolution or manual accounting action.
A payment recorded in QBO does not directly change Cinderblock contract billing
state.

### 5. Document deleted, voided, canceled, or invalidated in Cinderblock

Deleting or invalidating a Cinderblock document must not automatically delete the
mapped QBO transaction. Before any QBO cleanup action, inspect divergence,
transaction status, and payments. Prefer an explicit accounting-safe resolution
over automatic deletion. If no safe automated action is defined, leave the QBO
transaction unchanged, record that reconciliation is required, and direct the
user to manual resolution.

This applies to soft deletion, Invoice cancellation or voiding, Change Order
deletion/cancellation, Estimate invalidation, and any other state that would make
an already-synced accounting transaction obsolete.

### 6. QBO create or update failure

When a create or update fails:

- keep the Cinderblock transaction intact;
- clearly record and surface that QBO sync failed;
- retain enough error and request identity information for safe diagnosis;
- allow an idempotent retry when the failure is retryable;
- provide a manual resolution path when retry is unsafe; and
- never show or persist a successful-sync state unless QBO success is confirmed.

An ambiguous timeout must be reconciled by idempotency/request identity and a QBO
lookup before retry. It must not create a duplicate transaction.

## Conflict state and resolution guardrails

QBO divergence is a first-class sync state, separate from the Cinderblock
document lifecycle. A conflict does not reopen an Accepted Change Order, unpost
an Invoice, or recalculate the contract.

Potential future actions include **Review changes**, **Keep QuickBooks version**,
and **Overwrite QuickBooks**, but availability is conditional:

- **Review changes** must compare current QBO state with the last-synced and
  current Cinderblock representations.
- **Keep QuickBooks version** must not import QBO edits into Cinderblock contract
  ledgers. Its effect on the Cinderblock accounting document and future sync
  baseline requires an explicit product/accounting decision.
- **Overwrite QuickBooks** must require appropriate permission and a fresh
  concurrency/payment preflight. It must be unavailable when accounting rules,
  payments, closed periods, tax state, or QBO limitations make overwrite unsafe.

No resolution may silently change both systems, discard accounting history, or
claim success before QBO confirms the operation. Conflict detection, review,
resolution choice, actor, timestamps, versions, and outcome must be auditable.

## Sync status requirements

The production integration must distinguish at least:

- not synced;
- sync pending/in progress;
- synced successfully;
- sync failed; and
- sync conflict.

Retryable failure and detected divergence are not the same state. A generic
"failed" state must not conceal that QBO was manually changed, deleted, voided,
or paid.

## Unresolved safeguards and implementation decisions

The following must be resolved with Product, Accounting, and QBO API validation
before production implementation. They do not authorize speculative prototype
behavior:

1. The exact QBO Product/Service and account mappings for `Retainage` and
   `Retainage release`, including whether they may share an account while
   retaining distinct line names.
2. The exact QBO-compatible representation of document-level discounts and Cost
   Plus on Estimates, Change Orders, and each Invoice type.
3. Confirmed calculation order and rounding for discounts, Cost Plus, Retainage,
   tax, negative lines, and document totals under every supported QBO tax mode.
4. Which QBO edits are material conflicts and which metadata-only edits may merge
   without accounting risk.
5. Whether and when Cinderblock may void rather than leave unchanged an obsolete
   QBO Invoice, and the required behavior for closed periods, applied payments,
   credits, deposits, and reconciled transactions.
6. The safe outcome of **Keep QuickBooks version**, because QBO values must not be
   pulled into Cinderblock contract ledgers.
7. Permission, confirmation, audit, and role requirements for any explicit
   overwrite, relink, detach, void, or retry operation.
8. Polling, webhook, or hybrid detection timing and how quickly out-of-band QBO
   edits, payments, voids, and deletions must surface in Cinderblock.
9. Idempotency keys, duplicate detection, and recovery for ambiguous create and
   update responses.
10. QBO document-number constraints and collision handling while preserving
    Cinderblock Change Order identity.
11. The user-facing reconciliation workflow and support escalation path for
    conflicts that cannot be safely resolved automatically.

Until these decisions are made, the safe default is to preserve both systems,
block the risky QBO write, surface the mismatch, and require intentional manual
resolution.

## Acceptance criteria for the integration design

- Cinderblock Estimates create standard QBO Estimates.
- Each Cinderblock Change Order creates a separate standard QBO Estimate and does
  not mutate the original Estimate.
- Every Cinderblock Invoice type creates a standard QBO Invoice with no QBO
  Estimate-to-Invoice relationship.
- QBO Progress Invoicing is never used.
- Cinderblock Partially Billed and Billed both map to QBO Converted without
  collapsing the two local states.
- Actual fractional Progress Invoice quantities synchronize even when hidden in
  the Cinderblock customer presentation.
- Retainage withheld sends one negative `Retainage` line with Qty `1`.
- A Retainage release sends one positive `Retainage release` line with Qty `1`.
- Discounts and Cost Plus synchronize only when represented on the document.
- Taxability and tax behavior remain compatible with the connected QBO tax
  configuration.
- QBO never becomes the source for Cinderblock contract pools, ledgers, progress,
  lineage, or remaining balances.
- Unchanged QBO transactions may update normally with version protection.
- Edited, voided, deleted, paid, or otherwise diverged QBO transactions are not
  silently overwritten, recreated, or deleted.
- Failures and conflicts are explicit, auditable, and never presented as a
  successful sync.
