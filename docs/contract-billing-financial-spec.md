# Contract Billing financial implementation specification

Updated September 16, 2026. This document is the normative engineering handoff
for Cost Plus, invoice source allocation, ledger events, and deterministic
financial fixtures. It supplements `contract-billing-business-rules.md` and does
not add product flows.

## Canonical formulas

All money uses fixed decimal arithmetic. Round persisted currency values to the
currency's minor unit using one platform-wide half-up policy. Payment Schedule
percentage inputs and displays use at most three decimal places. Preserve the
higher-precision percentage anchor derived from amount entry, but use the stored
currency-precision milestone amount for billing, schedule totals, and validation.

| Value | Formula / rule |
| --- | --- |
| Base contract scope | Accepted quantity × customer-facing selling Price |
| Cost Plus scope | Associated base contract scope × inherited Cost Plus % |
| Gross Contract Scope | Base scope + Cost Plus scope |
| Accepted Contract Discount | max(0, Accepted Estimate discount + sum of signed Accepted Change Order discount adjustments) |
| Contract Value | Gross Contract Scope − accepted Contract Discount |
| Cost Plus invoice allocation | Base invoice allocation ÷ base contract scope × associated Cost Plus scope |
| Total Invoiced | Posted base allocation + posted Cost Plus allocation − posted discount |
| Contract Progress | Posted gross allocation ÷ current Gross Contract Scope |
| Milestone planned amount | round-to-currency(precise milestone % × Contract Value); the stored amount is authoritative for billing and schedule validation |
| Milestone gross default | Canonical milestone % × Gross Contract Scope |
| Milestone discount suggestion | min(canonical milestone % × applicable original Contract Discount, remaining Discount Pool) |
| Final-scope predicate | Current Invoice Gross Allocation = Remaining Gross Contract Allocation |

Internal Cost never enters a Cost Plus formula. Cost Plus is explicit contract
scope linked to one underlying priced source line. It is not a discretionary
pool. Billing 40% of a base line consumes 40% of its Cost Plus scope. Invoice
totals sum the two allocations once and never calculate another percentage over
the subtotal.

Discount is allocated proportionally across billed base and Cost Plus components
for source attribution and tax calculation. A user's invoice-level discount
override is allowed and never rebalances another milestone or invoice. The last
eligible component receives the deterministic rounding remainder.

Cost Plus taxability is a contract-revision attribute independent of base-line
taxability. Tax uses each component's own taxable flag. Progress, Contract,
retainage, and other contract-derived invoice flows resolve the applicable tax
configuration and component taxability from the underlying Accepted
Estimate/contract; they never supply a flow-specific default rate. Tax rate and
calculated allocation facts are established on Draft save. Draft → Open posts
those facts without rerating. The existing product tax engine remains
authoritative for how that inherited configuration is resolved.

## Persisted records

Each accepted contract scope record needs: stable contract-line ID, contract
revision, source document and source line, base or Cost Plus kind, related base
line ID for Cost Plus, signed accepted amount, Cost Plus percentage where
applicable, independent taxability, supersession lineage, and financial status.

Each invoice source allocation needs at minimum:

- invoice ID and immutable billing-sequence key;
- source contract-line ID and source contract revision;
- gross base amount billed;
- Cost Plus amount billed and its related base line;
- discount allocated to base and Cost Plus;
- taxable base for base and Cost Plus;
- tax charged for base and taxable Cost Plus;
- deterministic rounding remainder;
- Draft reservation or posted state.

Each invoice associated with a milestone stores an immutable snapshot of the
milestone ID, name, canonical percentage, and planned-date context. The live
milestone separately stores at most one active invoice association. Canceling
releases that active association without rewriting the invoice snapshot.

The contract owns one durable monotonic revision or equivalent row/state token.
It changes after every accepted financial mutation relevant to billing. It is
never derived from child-document version sums.

## Ledger events and invariants

| Event | Atomic effects |
| --- | --- |
| Save Draft invoice | Validate expected contract revision and one-Draft rule; inherit the accepted Estimate/contract tax configuration and component taxability; reserve base scope, associated Cost Plus, selected discount, retainage where enabled, and applicable Tax Credit; persist source allocation and Draft-established tax facts. |
| Edit Draft | Revalidate revision and availability; replace reservations and allocation facts atomically; release prior Tax Credit reservation before reserving the recalculated amount. |
| Delete/cancel Draft | Release scope, Cost Plus, discount, retainage, and Tax Credit reservations; preserve cancellation history when canceled. |
| Draft → Open | Validate revision; convert reservations to posted/consumed entries; post the Draft-established tax; consume reserved Tax Credit; do not rerate. |
| Edit eligible Open invoice | Preserve tax rate; atomically replace posted allocations and recalculated tax facts under existing chronology/payment locks. |
| Cancel eligible Open invoice | Follow existing platform payment rules; reverse posted scope, Cost Plus, discount, retainage, and Tax Credit consumption; restore the live milestone to Not invoiced while preserving its invoice snapshot. |
| Accept Change Order | Operate on the current saved revision; reject an empty or otherwise meaningless adjustment; validate revision and line reservations; reject without mutation if resulting Contract Value would be below $0; post full-negative and positive replacement scope plus associated Cost Plus; increment contract revision; cancel conflicting Draft invoice and release its reservations; generate Tax Credit from persisted historical tax facts. |
| Generate Tax Credit | For removed source lines, sum actual persisted base tax and taxable Cost Plus tax attributable to historically posted allocations; never use current tax configuration. |
| Reserve Tax Credit | Reserve `min(available Tax Credit Balance, Draft calculated tax)`; another Draft cannot reserve it. |
| Consume Tax Credit | On Open, apply only against calculated invoice tax. Never reduce principal. Carry excess forward. |
| Release Tax Credit | Draft edit/delete/cancellation or failed atomic posting releases the reservation. |

Change Order acceptance and invoice posting are idempotent. Every stale-write-
sensitive mutation validates the expected contract revision inside the same
transaction. Independent Change Orders may be open concurrently; line
reservations prevent conflicting removal of the same accepted source line.

Contract Billing references the existing application payment lifecycle for
unpaid, partially paid, paid, processing, failed, voided, refunded, unapplied,
and disputed payments. Payment reversal and invoice cancellation remain separate
existing operations. Contract Billing adds no second payment state machine.

## Tax Credit accounting contract

Tax Credit Balance is a customer tax-credit subledger, separate from principal,
contract scope, discount, payments, and retainage.

When an Accepted deduction establishes that historical tax is no longer owed,
generation debits Sales Tax Payable and credits the customer Tax Credit liability
for the attributable amount, subject to the platform's jurisdiction posting
integration. A future invoice still records its newly calculated tax normally.
Applying the credit debits the customer Tax Credit liability and credits the
invoice receivable/contra-receivable for no more than that new tax. It never
reduces revenue or principal. If an external accounting integration requires a
different account mapping, it must preserve these subledger invariants and the
same customer balance.

Retainage Release never calculates tax and never consumes Tax Credit Balance.

## Deterministic implementation fixtures

1. **Estimate with Cost Plus and discount:** Base $100,000; Cost Plus 10% =
   $10,000; gross scope $110,000; discount $10,000; Contract Value $100,000.
2. **20% milestone / partial invoice:** Allocate $20,000 base + $2,000 Cost Plus;
   suggest $2,000 discount; net contract billing and milestone actual $20,000.
3. **Taxable and nontaxable scope:** $6,000 taxable + $4,000 nontaxable at 8%
   yields $480 tax before discount.
4. **Taxable Cost Plus:** $4,000 taxable base + independently taxable $400 Cost
   Plus at 8% yields $352 tax. Nontaxable Cost Plus yields $320.
5. **Accepted deduction:** Reverse $1,000 base and associated $100 Cost Plus with
   full-negative lines; do not mutate the accepted source.
6. **Historical tax removal:** Persisted historical facts identify $70 base tax
   and $7 taxable Cost Plus tax; accepting the deduction generates $77 Tax Credit.
7. **Draft reservation:** With $1,000 available credit and $700 calculated tax,
   Draft reserves $700 and leaves $300 available.
8. **Open consumption:** Opening that Draft consumes $700; tax due is $0;
   principal is unchanged; $300 carries forward.
9. **Draft edit/release:** Editing tax to $500 releases $200; deleting/canceling
   the Draft releases the remaining $500 reservation.
10. **Cost Plus replacement:** Remove $1,000 base / $100 Cost Plus and add $600
    base / $60 Cost Plus. Gross contract change is −$440.
11. **Over-invoiced deduction:** Historical posted allocations remain posted
    after scope falls below them; expose the discrepancy without automatic
    principal recovery.
12. **Final gross billing with unused discount:** When current gross allocation
    exactly equals remaining gross allocation and Discount Pool remains, warn and
    allow Open without automatic discount.
13. **Rounding remainder:** Allocate a one-cent remainder to the last eligible
    component by stable source order so allocation sums equal document totals.

These fixtures are implementation and acceptance-test inputs. They do not create
additional UI or workflows.
