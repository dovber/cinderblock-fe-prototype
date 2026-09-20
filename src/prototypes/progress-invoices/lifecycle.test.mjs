import test from 'node:test'
import assert from 'node:assert/strict'
import { acceptChangeOrder, acceptSavedChangeOrder, acceptedValue, availableContractDiscount, billingLines, cancelLifecycleInvoice, contractDiscountPool, contractScope, currentContractRevision, draftInvoice, draftReservedValue, grossContractScope, hasDraft, historicalTaxCreditGenerated, initialLifecycle, invoiceAmounts, invoiceSnapshotLines, isTrackedInvoiceFinanciallyEditable, lifecycleScenarios, regularScenarios, regularScenarioState, saveLifecycleInvoice, taxCreditBalance, toChangeOrderSources, totalBilled, totalGrossBilled, trackedInvoiceFinancialLockReason } from './lifecycle.ts'
import { blankAdjustmentLine, changeOrderCostPlus, changeOrderImpact, hasMeaningfulAdjustment, newChangeOrder } from './change-orders/model.ts'
import { invoiceRetainageWithheld, sum } from './model.ts'
import { milestoneAmount } from './schedule/model.ts'
import { paymentSchedulePercentage } from '../../shared/ui/paymentScheduleMath.ts'
import { retainageReleaseMetrics } from '../../shared/invoice-creation/retainage.ts'

for (const scenario of lifecycleScenarios) {
  test(`${scenario.label}: accepted scope reconciles with one invoice ledger`, () => {
    const state = initialLifecycle(scenario.id)
    assert.ok(Number.isFinite(acceptedValue(state)))
    assert.equal(sum(contractScope(state).map(line => line.contract)), grossContractScope(state))
    assert.equal(new Set(contractScope(state).map(line => line.id)).size, contractScope(state).length)
    const expected = sum(state.invoices.filter(invoice => !['Draft', 'Canceled'].includes(invoice.status)).map(invoice => sum(invoice.lineAmounts) - invoice.discount))
    assert.equal(totalBilled(state), expected)
    assert.ok(billingLines(state).every(line => line.billableRemaining >= 0))
    for (const invoice of state.invoices.filter(invoice => invoice.status !== 'Canceled')) {
      const milestone = state.milestones.find(item => item.invoiceId === invoice.id)
      assert.ok(milestone, `Invoice #${invoice.id} must have a payment schedule milestone`)
      assert.equal(milestone.id, invoice.milestoneId)
      assert.equal(milestone.actualAmount, sum(invoice.lineAmounts) - invoice.discount)
      assert.equal(milestone.invoiceDate, invoice.invoiceDate)
    }
  })
}
test('acceptance cancels a reserved draft, releases scope and preserves canceled history', () => {
  const before = initialLifecycle('co-pending')
  assert.equal(acceptedValue(before), 75000)
  assert.equal(totalBilled(before), 0)
  assert.equal(hasDraft(before), true)
  const after = acceptChangeOrder(before, before.orders[0])
  assert.equal(acceptedValue(after), 77500)
  assert.equal(totalBilled(after), 0)
  assert.equal(hasDraft(after), false)
  assert.equal(after.invoices[0].status, 'Canceled')
  assert.deepEqual(after.invoices[0].lineAmounts, before.invoices[0].lineAmounts)
  assert.ok(after.invoices[0].canceledAt)
  assert.equal(billingLines(after).find(line => line.id === 'fixtures').billableRemaining, 25000)
})
test('billing stays attributed to removed scope; new scope has no inherited previous billing', () => {
  const state = initialLifecycle('contract-partial-accepted')
  const lines = billingLines(state)
  assert.equal(acceptedValue(state), 85000)
  assert.equal(totalBilled(state), 15000)
  assert.equal(lines.find(line => line.id === 'cabinets').previous, 1000)
  assert.equal(lines.find(line => line.id === 'cabinets').billableRemaining, 0)
  assert.equal(lines.find(line => line.name === 'Custom inset cabinets').previous, 0)
  assert.equal(lines.find(line => line.kind === 'removal').previous, 0)
})
test('fully adjusted and over-invoiced scenarios preserve contract-level totals', () => {
  const full = initialLifecycle('contract-fully-adjusted')
  assert.equal(totalBilled(full), acceptedValue(full))
  const adjusted = billingLines(full).find(line => line.name === 'Custom inset cabinets')
  assert.equal(Math.round(adjusted.previous / adjusted.contract * 10000) / 100, 92.86)
  const over = initialLifecycle('co-over-invoiced')
  assert.equal(totalBilled(over) - acceptedValue(over), 5000)
})
test('drafts reserve by stable source ID; posting updates totals once', () => {
  let state = initialLifecycle('unbilled')
  const lines = billingLines(state)
  const invoice = draftInvoice(state, lines, [1000, 2000, 3000])
  state = saveLifecycleInvoice(state, invoice)
  assert.equal(state.invoices[0].milestoneId, `invoice-${invoice.id}`)
  assert.equal(state.milestones[0].invoiceId, invoice.id)
  assert.equal(state.milestones[0].actualAmount, 6000)
  assert.equal(state.milestones[0].invoiceDate, invoice.invoiceDate)
  assert.equal(totalBilled(state), 0)
  assert.equal(billingLines(state)[0].billableRemaining, 24000)
  state = saveLifecycleInvoice(state, { ...invoice, status: 'Open' })
  assert.equal(totalBilled(state), 6000)
  assert.equal(billingLines(state)[0].previous, 1000)
  assert.equal(invoiceAmounts(invoice, [...lines].reverse())[lines[0].id], 1000)
})
test('contract-derived invoice flows inherit the source contract tax rate', () => {
  const zeroTax = regularScenarioState('regular-no-invoices')
  const zeroTaxDraft = draftInvoice(zeroTax, billingLines(zeroTax), [1000, 0, 0])
  assert.equal(zeroTax.taxRate, 0)
  assert.equal(zeroTaxDraft.taxRate, 0)
  assert.equal(sum(zeroTaxDraft.allocationFacts.map(fact => fact.taxCharged + fact.taxOnCostPlus)), 0)

  const taxableRetainage = { ...initialLifecycle('retainage-new'), taxRate: 8 }
  const retainedDraft = draftInvoice(taxableRetainage, billingLines(taxableRetainage), [1000, 0, 0])
  assert.equal(retainedDraft.taxRate, 8)
  assert.equal(sum(retainedDraft.allocationFacts.map(fact => fact.taxCharged + fact.taxOnCostPlus)), 80)
})
test('tax, Cost Plus, and discount are isolated to their dedicated regular scenarios', () => {
  const tax = regularScenarioState('regular-tax')
  const costPlus = regularScenarioState('regular-cost-plus')
  const discount = regularScenarioState('regular-discount')
  const baselineIds = regularScenarios.map(scenario => scenario.id).filter(id => !['regular-tax', 'regular-cost-plus', 'regular-discount'].includes(id))

  assert.equal(tax.taxRate, 7.5)
  assert.equal(tax.costPlusPercent, 0)
  assert.equal(tax.discount, 0)
  assert.deepEqual(tax.original.map(line => line.taxable), [true, false, true])
  const taxDraft = draftInvoice(tax, billingLines(tax), [30000, 30000, 40000])
  assert.equal(sum(taxDraft.allocationFacts.map(fact => fact.taxCharged + fact.taxOnCostPlus)), 5250)

  assert.equal(costPlus.taxRate, 0)
  assert.equal(costPlus.costPlusPercent, 10)
  assert.equal(costPlus.discount, 0)
  assert.equal(grossContractScope(costPlus), 110000)
  const costPlusDraft = draftInvoice(costPlus, billingLines(costPlus), [12000, 8000, 10000, 0, 0, 0])
  assert.deepEqual(costPlusDraft.lineAmounts, [12000, 8000, 10000, 1200, 800, 1000])

  assert.equal(discount.taxRate, 0)
  assert.equal(discount.costPlusPercent, 0)
  assert.equal(discount.discount, 10000)

  for (const id of baselineIds) {
    const state = regularScenarioState(id)
    assert.equal(state.taxRate, 0, `${id} leaked tax`)
    assert.equal(state.costPlusPercent, 0, `${id} leaked Cost Plus`)
    assert.equal(state.discount, 0, `${id} leaked discount`)
  }
})
test('discount scenario separates gross progress, net invoicing, and draft reservation', () => {
  let state = regularScenarioState('regular-discount')
  assert.equal(grossContractScope(state), 100000)
  assert.equal(acceptedValue(state), 90000)
  const invoice = draftInvoice(state, billingLines(state), [10000, 8000, 12000], 2500)
  state = saveLifecycleInvoice(state, invoice)
  assert.equal(totalGrossBilled(state), 0)
  assert.equal(totalBilled(state), 0)
  assert.equal(sum(state.invoices.filter(item => item.status === 'Draft').map(item => item.discount)), 2500)
  state = saveLifecycleInvoice(state, { ...invoice, status: 'Open' })
  assert.equal(totalGrossBilled(state), 30000)
  assert.equal(totalBilled(state), 27500)
  assert.equal(state.discount - sum(state.invoices.filter(item => item.status !== 'Canceled').map(item => item.discount)), 7500)
})
test('authoritative contract and invoice summary values include contractual and invoice discounts', () => {
  let state = regularScenarioState('regular-discount')
  assert.equal(acceptedValue(state), 90000)
  const draft = draftInvoice(state, billingLines(state), [10000, 8000, 12000], 3000)
  state = saveLifecycleInvoice(state, draft)
  assert.equal(draftReservedValue(state), 27000)
  state = saveLifecycleInvoice(state, { ...draft, status: 'Open' })
  assert.equal(draftReservedValue(state), 0)
  assert.equal(totalBilled(state), 27000)
})
test('Payment Schedule projections use Contract Value after discount', () => {
  const state = regularScenarioState('regular-discount')
  const milestone = { id: 'deposit', name: 'Deposit', percentage: 10 }
  assert.equal(grossContractScope(state), 100000)
  assert.equal(acceptedValue(state), 90000)
  assert.equal(milestoneAmount(milestone, acceptedValue(state)), 9000)
})
test('only the latest active unpaid Open tracked invoice is financially editable', () => {
  let state = regularScenarioState('regular-no-invoices')
  const first = { ...draftInvoice(state, billingLines(state), [1000, 0, 0]), id: '100501', status: 'Open' }
  state = saveLifecycleInvoice(state, first)
  assert.equal(isTrackedInvoiceFinanciallyEditable(state, first.id), true)

  const second = { ...draftInvoice(state, billingLines(state), [0, 1000, 0]), id: '100502' }
  state = saveLifecycleInvoice(state, second)
  assert.equal(isTrackedInvoiceFinanciallyEditable(state, first.id), false)
  assert.equal(isTrackedInvoiceFinanciallyEditable(state, second.id), true)

  state = { ...state, invoices: state.invoices.map(invoice => invoice.id === second.id ? { ...invoice, status: 'Canceled' } : invoice) }
  assert.equal(isTrackedInvoiceFinanciallyEditable(state, first.id), true)

  state = { ...state, invoices: state.invoices.map(invoice => invoice.id === first.id ? { ...invoice, status: 'Partially paid' } : invoice) }
  assert.equal(isTrackedInvoiceFinanciallyEditable(state, first.id), false)
})
test('accepting a Change Order creates a revision boundary that locks earlier Open invoices', () => {
  let state = regularScenarioState('regular-no-invoices')
  const invoice = { ...draftInvoice(state, billingLines(state), [1000, 0, 0]), id: '100501', status: 'Open' }
  state = saveLifecycleInvoice(state, invoice)
  assert.equal(invoice.contractRevision, 0)
  assert.equal(isTrackedInvoiceFinanciallyEditable(state, invoice.id), true)

  const order = newChangeOrder(1, [], undefined, toChangeOrderSources(state.original))
  order.lines = [{ ...blankAdjustmentLine(order.id, 1), name: 'Added scope', price: 5000 }]
  state = { ...state, orders: [order] }
  state = acceptChangeOrder(state, order)

  assert.equal(currentContractRevision(state), 1)
  assert.equal(state.invoices.find(item => item.id === invoice.id)?.status, 'Open')
  assert.equal(isTrackedInvoiceFinanciallyEditable(state, invoice.id), false)
  assert.match(trackedInvoiceFinancialLockReason(state, invoice.id), /contract changed/)

  const next = draftInvoice(state, billingLines(state), [1000, 0, 0])
  assert.equal(next.contractRevision, currentContractRevision(state))
  assert.equal(isTrackedInvoiceFinanciallyEditable(saveLifecycleInvoice(state, next), next.id), true)
  assert.equal(currentContractRevision(acceptChangeOrder(state, state.orders[0])), 1)
})
test('accepted Change Order discounts accumulate in the contract pool and invoices consume the combined amount', () => {
  let state = regularScenarioState('regular-no-invoices')
  state.discount = 5000
  const first = { ...newChangeOrder(1, [], undefined, toChangeOrderSources(state.original)), discount: 8000 }
  const second = { ...newChangeOrder(2, [], undefined, toChangeOrderSources(state.original)), discount: 2000 }
  assert.equal(hasMeaningfulAdjustment(first), true)
  state.orders = [first, second]
  state = acceptChangeOrder(state, first)
  state = acceptChangeOrder(state, second)
  assert.equal(contractDiscountPool(state), 15000)
  assert.equal(acceptedValue(state), grossContractScope(state) - 15000)
  const invoice = draftInvoice(state, billingLines(state), [10000, 8000, 12000], 3000)
  state = saveLifecycleInvoice(state, invoice)
  assert.equal(availableContractDiscount(state), 12000)
  assert.equal(availableContractDiscount(state, invoice.id), 15000)
})
test('a negative Change Order discount reduces the pool and increases the contract change', () => {
  let state = regularScenarioState('regular-no-invoices')
  state.discount = 10000
  const order = { ...newChangeOrder(1, [], undefined, toChangeOrderSources(state.original)), discount: -3000 }
  order.lines = []
  assert.equal(hasMeaningfulAdjustment(order), true)
  assert.equal(changeOrderImpact(order), 3000)
  state.orders = [order]
  state = acceptChangeOrder(state, order)
  assert.equal(contractDiscountPool(state), 7000)
  assert.equal(state.orders[0].status, 'Accepted')
})
test('a Change Order cannot reduce the contract discount pool below zero', () => {
  let state = regularScenarioState('regular-no-invoices')
  state.discount = 10000
  const order = { ...newChangeOrder(1, [], undefined, toChangeOrderSources(state.original)), discount: -10000.01 }
  state.orders = [order]
  const next = acceptChangeOrder(state, order)
  assert.equal(contractDiscountPool(next), 10000)
  assert.equal(next.orders[0].status, 'Draft')
  assert.match(next.notice, /below \$0\.00/)
})
test('a Change Order cannot be accepted when it would make Contract Value negative', () => {
  let state = regularScenarioState('regular-no-invoices')
  const order = newChangeOrder(1, [], undefined, toChangeOrderSources(state.original))
  order.lines = [{ ...blankAdjustmentLine(order.id, 1), name: 'Catastrophic deductive adjustment', price: 150000, qty: -1 }]
  state.orders = [order]
  const next = acceptChangeOrder(state, order)
  assert.equal(next.orders[0].status, 'Draft')
  assert.equal(acceptedValue(next), 100000)
  assert.match(next.notice, /Contract Value less than \$0\.00/)
})
test('an empty Change Order cannot be accepted', () => {
  let state = regularScenarioState('regular-no-invoices')
  const order = newChangeOrder(1, [], undefined, toChangeOrderSources(state.original))
  state.orders = [order]
  const next = acceptChangeOrder(state, order)
  assert.equal(next.orders[0].status, 'Draft')
  assert.match(next.notice, /no contract adjustment/)
})
test('Change Order acceptance resolves the saved revision rather than a dirty editor copy', () => {
  let state = regularScenarioState('regular-no-invoices')
  const saved = newChangeOrder(1, [], undefined, toChangeOrderSources(state.original))
  saved.lines = [{ ...blankAdjustmentLine(saved.id, 1), name: 'Saved lighting scope', price: 1850, qty: 1 }]
  state.orders = [saved]
  const dirtyEditorCopy = { ...saved, lines: saved.lines.map(line => ({ ...line })) }
  dirtyEditorCopy.lines[0].price = -150000

  const next = acceptSavedChangeOrder(state, dirtyEditorCopy.id)
  assert.equal(next.orders[0].status, 'Accepted')
  assert.equal(next.orders[0].lines[0].price, 1850)
  assert.equal(acceptedValue(next), 101850)
})
test('contract-derived Cost Plus is carried to invoices and Change Orders without an override', () => {
  const state = { ...regularScenarioState('regular-no-invoices'), costPlusPercent: 12 }
  const invoice = draftInvoice(state, billingLines(state), [1000, 0, 0])
  const order = newChangeOrder(1, [], undefined, toChangeOrderSources(state.original), state.costPlusPercent)
  assert.equal(invoice.costPlus, 12)
  assert.equal(order.costPlusPercent, 12)
})
test('inherited Cost Plus uses selling price for additions and full negative removal lines', () => {
  const state = { ...regularScenarioState('regular-no-invoices'), costPlusPercent: 10 }
  const order = newChangeOrder(1, ['faucet'], undefined, toChangeOrderSources(state.original), state.costPlusPercent)
  order.lines = [...order.lines.filter(line => line.sourceEstimateLineId), { ...blankAdjustmentLine(order.id, 1), name: 'Replacement', cost: 5000, price: 7000, qty: 1 }]
  assert.equal(changeOrderCostPlus(order), -2300)
  order.lines = order.lines.map(line => ({ ...line, cost: 999999 }))
  assert.equal(changeOrderCostPlus(order), -2300)
})
test('tax invoiced against later removed scope becomes a future-invoice credit', () => {
  let state = { ...regularScenarioState('regular-no-invoices'), taxRate: 10 }
  const posted = { ...draftInvoice(state, billingLines(state), [1000, 0, 0]), id: '100501', status: 'Open' }
  state = saveLifecycleInvoice(state, posted)
  const order = newChangeOrder(1, ['faucet'], undefined, toChangeOrderSources(state.original))
  state = { ...state, orders: [order] }
  state = acceptChangeOrder(state, order)
  assert.equal(historicalTaxCreditGenerated(state), 100)
  assert.equal(taxCreditBalance(state), 100)
  const next = draftInvoice(state, billingLines(state), [0, 1000, 0])
  assert.equal(next.taxCreditApplied, 100)
  assert.equal(taxCreditBalance(saveLifecycleInvoice(state, next)), 0)
})
test('Cost Plus is explicit proportional scope and its persisted tax participates in Tax Credit', () => {
  let state = { ...regularScenarioState('regular-no-invoices'), costPlusPercent: 10, costPlusTaxable: true, taxRate: 7 }
  const lines = billingLines(state)
  const invoice = { ...draftInvoice(state, lines, [1000, 0, 0]), id: '100501', status: 'Open' }
  assert.equal(sum(invoice.lineAmounts), 1100)
  assert.equal(invoice.allocationFacts[0].grossAmountBilled, 1000)
  assert.equal(invoice.allocationFacts[0].costPlusAllocation, 100)
  assert.equal(invoice.allocationFacts[0].taxCharged + invoice.allocationFacts[0].taxOnCostPlus, 77)
  state = saveLifecycleInvoice(state, invoice)
  const order = newChangeOrder(1, ['faucet'], undefined, toChangeOrderSources(state.original), 10)
  state = acceptChangeOrder({ ...state, orders: [order] }, order)
  assert.equal(historicalTaxCreditGenerated(state), 77)
  const smallDraft = draftInvoice(state, billingLines(state), [0, 100, 0])
  assert.equal(smallDraft.taxCreditApplied, 7.7)
  assert.equal(taxCreditBalance(saveLifecycleInvoice(state, smallDraft)), 69.3)
})
test('canceling an invoice releases its active milestone and preserves its snapshot', () => {
  let state = regularScenarioState('regular-payment-schedule')
  const milestone = state.milestones[0]
  const invoice = draftInvoice(state, billingLines(state), [1000, 0, 0], 0, milestone)
  state = saveLifecycleInvoice(state, invoice)
  assert.equal(state.invoices[0].milestonePercentageSnapshot, milestone.percentage)
  state = cancelLifecycleInvoice(state, invoice.id)
  assert.equal(state.milestones[0].invoiceId, undefined)
  assert.equal(state.invoices[0].status, 'Canceled')
  assert.equal(state.invoices[0].milestoneName, milestone.name)
  assert.equal(state.invoices[0].milestonePercentageSnapshot, milestone.percentage)
})
test('a named zero-dollar Change Order line is a valid adjustment', () => {
  const state = regularScenarioState('regular-no-invoices')
  const order = newChangeOrder(1, [], undefined, toChangeOrderSources(state.original))
  assert.equal(hasMeaningfulAdjustment(order), false)
  order.lines = [{ ...blankAdjustmentLine(order.id, 1), name: 'Owner-supplied fixture coordination' }]
  assert.equal(hasMeaningfulAdjustment(order), true)
})
test('invoice creation resolves an explicit or generated milestone name', () => {
  const state = initialLifecycle('unbilled')
  const lines = billingLines(state)
  const blank = draftInvoice(state, lines, [1000, 0, 0], 0, { name: '   ' })
  const named = draftInvoice(state, lines, [1000, 0, 0], 0, { id: 'deposit', name: '  Deposit  ' })
  assert.equal(blank.milestoneName, 'Invoice 1')
  assert.equal(named.milestoneName, 'Deposit')
})
test('ad-hoc progress billing creates an actual milestone and preserves the remaining plan', () => {
  let state = regularScenarioState('regular-payment-schedule')
  const lines = billingLines(state)
  const invoice = draftInvoice(state, lines, [5000, 4000, 6000], 0, { name: 'Site work' })
  state = saveLifecycleInvoice(state, invoice)
  const actual = state.milestones.find(item => item.invoiceId === invoice.id)
  assert.equal(actual?.name, 'Site work')
  assert.equal(actual?.actualAmount, 15000)
  assert.equal(paymentSchedulePercentage(actual, acceptedValue(state)), 15)
  assert.equal(actual?.invoiceDate, invoice.invoiceDate)
  assert.equal(sum(state.milestones.filter(item => !item.invoiceId).map(item => milestoneAmount(item, 100000))), 100000)
})
test('billing a planned milestone replaces its plan with the actual and preserves other percentage anchors', () => {
  let state = regularScenarioState('regular-payment-schedule')
  const lines = billingLines(state)
  const invoice = draftInvoice(state, lines, [5000, 4000, 6000], 0, { id: 'deposit', name: 'Deposit' })
  state = saveLifecycleInvoice(state, invoice)
  const deposit = state.milestones.find(item => item.id === 'deposit')
  assert.equal(deposit?.invoiceId, invoice.id)
  assert.equal(deposit?.actualAmount, 15000)
  assert.equal(paymentSchedulePercentage(deposit, acceptedValue(state)), 15)
  assert.equal(sum(state.milestones.filter(item => !item.invoiceId).map(item => milestoneAmount(item, 100000))), 90000)
})
test('accepted CO recalculates future milestones without rewriting fulfilled history or retainage', () => {
  let state = initialLifecycle('retainage-10')
  const first = { ...state.milestones[0] }
  const order = newChangeOrder(1, [], undefined, toChangeOrderSources(state.original))
  order.lines = [{ ...blankAdjustmentLine(order.id, 1), name: 'Added scope', price: 10000, qty: 1 }]
  state = { ...state, orders: [order] }
  assert.equal(acceptedValue(state), 100000)
  state = acceptChangeOrder(state, order)
  assert.equal(acceptedValue(state), 110000)
  assert.deepEqual(state.milestones[0], first)
  assert.equal(acceptedValue(state) * state.milestones[1].percentage / 100, 27500)
  assert.equal(sum(state.invoices.map(invoiceRetainageWithheld)), 2500)
  const released = { ...state, releases: [{ id: 'release', status: 'Open', amount: 1000 }] }
  assert.equal(totalBilled(released), totalBilled(state))
})
test('schedule with existing accepted CO recalculates the locked invoice percentage', () => {
  const state = initialLifecycle('schedule-accepted-co')
  assert.equal(state.milestones[0].actualAmount, 18750)
  assert.equal(acceptedValue(state), 85000)
  assert.equal(paymentSchedulePercentage(state.milestones[0], acceptedValue(state)), 18750 / 85000 * 100)
})
test('launcher scenarios start with independent regular and retainage state', () => {
  const regular = regularScenarioState('regular-no-invoices')
  const retainage = initialLifecycle('retainage-held')
  assert.equal(regular.retainageEnabled, false)
  assert.equal(regular.invoices.length, 0)
  assert.equal(retainage.retainageEnabled, true)
  assert.equal(totalBilled(retainage), 75000)
  assert.equal(sum(retainage.invoices.map(invoiceRetainageWithheld)), 7500)
  assert.notStrictEqual(regular.original, retainage.original)
})
test('retainage release Drafts reserve capacity until Open and cancellation restores it', () => {
  const draft = { id: '100605', status: 'Draft', amount: 2500, invoiceDate: '2026-09-10', dueDate: '2026-10-10', note: '' }
  assert.deepEqual(retainageReleaseMetrics(7500, [draft]), { released: 0, held: 7500, draftReserved: 2500, available: 5000 })
  assert.deepEqual(retainageReleaseMetrics(7500, [{ ...draft, status: 'Open' }]), { released: 2500, held: 5000, draftReserved: 0, available: 5000 })
  assert.deepEqual(retainageReleaseMetrics(7500, [{ ...draft, status: 'Canceled' }]), { released: 0, held: 7500, draftReserved: 0, available: 7500 })
})
test('regular selector scenarios expose the requested contract states', () => {
  const noInvoices = regularScenarioState('regular-no-invoices')
  assert.equal(noInvoices.accepted, true)
  assert.equal(acceptedValue(noInvoices), 100000)
  assert.equal(totalBilled(noInvoices), 0)
  assert.equal(noInvoices.orders.length, 0)
  assert.equal(noInvoices.milestones.length, 0)

  const progress = regularScenarioState('regular-progress')
  assert.equal(acceptedValue(progress), 100000)
  assert.equal(totalBilled(progress), 25000)
  assert.equal(progress.invoices.length, 1)
  assert.equal(progress.milestones.length, 1)
  assert.equal(progress.milestones[0].invoiceId, '100501')
  assert.equal(progress.milestones[0].actualAmount, 25000)
  assert.equal(paymentSchedulePercentage(progress.milestones[0], acceptedValue(progress)), 25)
  assert.equal(progress.milestones[0].invoiceDate, progress.invoices[0].invoiceDate)

  const full = regularScenarioState('regular-fully-invoiced')
  assert.equal(acceptedValue(full), 100000)
  assert.equal(totalBilled(full), acceptedValue(full))
  assert.equal(full.invoices.length, 4)
  assert.equal(full.milestones.length, 4)
  assert.deepEqual(full.invoices.map(item => item.id), ['100501', '100502', '100503', '100504'])
  assert.deepEqual(full.milestones.map(item => item.name), ['Deposit', 'Progress 1', 'Progress 2', 'Final'])
  assert.deepEqual(full.milestones.map(item => paymentSchedulePercentage(item, acceptedValue(full))), [10, 40, 40, 10])
  assert.deepEqual(full.milestones.map(item => item.actualAmount), [10000, 40000, 40000, 10000])
  assert.deepEqual(full.milestones.map(item => item.invoiceId), full.invoices.map(item => item.id))
  assert.deepEqual(full.milestones.map(item => item.invoiceDate), full.invoices.map(item => item.invoiceDate))
  assert.equal(sum(full.milestones.map(item => item.actualAmount ?? 0)), acceptedValue(full))

  const oneOrder = regularScenarioState('regular-change-order')
  assert.equal(acceptedValue(oneOrder), 110000)
  assert.equal(totalBilled(oneOrder), 10000)
  assert.equal(oneOrder.orders.length, 1)
  assert.equal(oneOrder.invoices[0].milestoneName, 'Deposit')
  assert.equal(oneOrder.milestones.find(item => item.invoiceId === '100501')?.name, 'Deposit')
  assert.equal(oneOrder.invoices[0].contractRevision, 0)
  assert.ok(invoiceSnapshotLines(oneOrder.invoices[0], contractScope(oneOrder)).every(line => line.sourceId === 'estimate'))

  const orderWithInvoices = regularScenarioState('regular-change-order-invoices')
  assert.equal(acceptedValue(orderWithInvoices), 110000)
  assert.equal(orderWithInvoices.orders.length, 1)
  assert.equal(orderWithInvoices.invoices.length, 2)
  const [deposit, laterInvoice] = orderWithInvoices.invoices
  const depositLines = invoiceSnapshotLines(deposit, contractScope(orderWithInvoices))
  const progressLines = invoiceSnapshotLines(laterInvoice, contractScope(orderWithInvoices))
  assert.deepEqual([deposit.contractRevision, laterInvoice.contractRevision], [0, 1])
  assert.equal(sum(depositLines.map(line => line.contract)), 100000)
  assert.equal(sum(progressLines.map(line => line.contract)), 110000)
  assert.ok(depositLines.every(line => line.sourceId === 'estimate'))
  assert.ok(progressLines.some(line => line.sourceId === '1008-CO1'))
  assert.equal(sum(progressLines.map(line => line.previous)), 10000)
  assert.equal(sum(laterInvoice.lineAmounts), 30000)
  assert.ok(laterInvoice.lineAmounts[progressLines.findIndex(line => line.sourceId === '1008-CO1')] > 0)
  assert.equal(sum(progressLines.filter(line => line.kind === 'active').map(line => line.contract - line.previous - laterInvoice.lineAmounts[progressLines.indexOf(line)])), 70000)

  const multipleOrders = regularScenarioState('regular-multiple-change-orders')
  assert.equal(acceptedValue(multipleOrders), 117500)
  assert.equal(totalBilled(multipleOrders), 10000)
  assert.equal(multipleOrders.orders.length, 2)
  assert.equal(multipleOrders.invoices[0].milestoneName, 'Deposit')

  const fullWithOrder = regularScenarioState('regular-fully-invoiced-change-orders')
  assert.equal(totalBilled(fullWithOrder), acceptedValue(fullWithOrder))
  assert.equal(fullWithOrder.milestones.filter(item => item.invoiceId).length, fullWithOrder.invoices.length)
  assert.equal(sum(fullWithOrder.milestones.map(item => item.actualAmount ?? 0)), acceptedValue(fullWithOrder))

  const overWithOrder = regularScenarioState('regular-over-invoiced-change-order')
  assert.equal(acceptedValue(overWithOrder), 75000)
  assert.equal(totalBilled(overWithOrder), 80000)
  assert.equal(totalBilled(overWithOrder) - acceptedValue(overWithOrder), 5000)
  assert.equal(overWithOrder.invoices.length, 3)
  assert.deepEqual(overWithOrder.invoices.map(item => item.id), ['100501', '100502', '100503'])
  assert.ok(overWithOrder.invoices.every(item => item.status === 'Open'))
  assert.equal(overWithOrder.orders.length, 1)
  assert.equal(overWithOrder.orders[0].status, 'Accepted')
  assert.equal(overWithOrder.releases.length, 0)
  assert.equal(overWithOrder.standardInvoice, null)
  assert.equal(overWithOrder.milestones.length, 3)
  assert.deepEqual(overWithOrder.milestones.map(item => item.name), ['Deposit', 'Progress 1', 'Progress 2'])
  assert.deepEqual(overWithOrder.milestones.map(item => item.actualAmount), [10000, 40000, 30000])
  assert.deepEqual(overWithOrder.milestones.map(item => paymentSchedulePercentage(item, acceptedValue(overWithOrder))), [10000 / 75000 * 100, 40000 / 75000 * 100, 40])
  assert.deepEqual(overWithOrder.milestones.map(item => item.invoiceId), overWithOrder.invoices.map(item => item.id))
  assert.deepEqual(overWithOrder.milestones.map(item => item.invoiceDate), overWithOrder.invoices.map(item => item.invoiceDate))

  const schedule = regularScenarioState('regular-payment-schedule')
  assert.deepEqual(schedule.milestones.map(item => item.percentage), [10, 40, 40, 10])
  assert.equal(schedule.invoices.length, 0)

  const scheduleProgress = regularScenarioState('regular-payment-schedule-progress')
  assert.equal(totalBilled(scheduleProgress), 10000)
  assert.equal(scheduleProgress.milestones[0].invoiceId, '100501')
  assert.equal(scheduleProgress.milestones[0].invoiceDate, scheduleProgress.invoices[0].invoiceDate)
  assert.equal(scheduleProgress.milestones.slice(1).some(item => item.invoiceId), false)
})

test('every Regular Estimate progress invoice has one matching historical milestone', () => {
  const scenarioIds = [
    'regular-no-invoices',
    'regular-discount',
    'regular-progress',
    'regular-fully-invoiced',
    'regular-change-order',
    'regular-change-order-invoices',
    'regular-multiple-change-orders',
    'regular-fully-invoiced-change-orders',
    'regular-over-invoiced-change-order',
    'regular-payment-schedule',
    'regular-payment-schedule-draft',
    'regular-payment-schedule-progress',
    'regular-payment-schedule-over-allocated',
  ]
  for (const id of scenarioIds) {
    const state = regularScenarioState(id)
    const linked = state.milestones.filter(item => item.invoiceId)
    assert.equal(linked.length, state.invoices.length, `${id} must link every invoice exactly once`)
    assert.equal(new Set(linked.map(item => item.invoiceId)).size, state.invoices.length)
    for (const invoice of state.invoices) {
      const milestone = linked.find(item => item.invoiceId === invoice.id)
      const amount = sum(invoice.lineAmounts) - invoice.discount
      assert.ok(milestone, `${id} is missing a milestone for Invoice #${invoice.id}`)
      assert.equal(milestone.actualAmount, amount)
      assert.equal(paymentSchedulePercentage(milestone, acceptedValue(state)), amount / acceptedValue(state) * 100)
      assert.equal(milestone.invoiceDate, invoice.invoiceDate)
    }
  }
})

test('Regular Estimate exposes only the four consolidated payment schedule scenarios', () => {
  const paymentScheduleScenarios = regularScenarios.filter(scenario => scenario.id.startsWith('regular-payment-schedule'))
  assert.deepEqual(paymentScheduleScenarios.map(scenario => scenario.label), [
    'Payment schedule',
    'Payment schedule with draft',
    'Payment schedule in progress',
    'Payment schedule over allocated',
  ])

  const baseline = regularScenarioState('regular-payment-schedule')
  assert.equal(baseline.invoices.length, 0)
  assert.equal(sum(baseline.milestones.map(item => item.percentage ?? 0)), 100)

  const withDraft = regularScenarioState('regular-payment-schedule-draft')
  assert.equal(withDraft.accepted, true)
  assert.equal(withDraft.invoices.length, 1)
  assert.equal(withDraft.invoices[0].status, 'Draft')
  assert.equal(withDraft.milestones.find(item => item.invoiceId === withDraft.invoices[0].id)?.id, 'deposit')

  const inProgress = regularScenarioState('regular-payment-schedule-progress')
  assert.ok(inProgress.invoices.length > 0)
  assert.ok(inProgress.milestones.some(item => item.invoiceId))
  assert.ok(inProgress.milestones.some(item => !item.invoiceId))

  const overAllocated = regularScenarioState('regular-payment-schedule-over-allocated')
  assert.equal(overAllocated.invoices.length, 0)
  assert.equal(sum(overAllocated.milestones.map(item => item.percentage ?? 0)), 110)
})
