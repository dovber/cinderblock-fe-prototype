import assert from 'node:assert/strict'
import test from 'node:test'
import { billingError, buildInvoiceAllocationFacts, completion, consumesAllRemainingGrossScope, createAmounts, invoiceMilestoneName, invoiceProgressAmount, invoiceRetainageWithheld, invoiceTaxFromAllocations, normalizeCostPlusAllocations, partialError, proportionalDiscount, remaining, scenarioEstimateDiscount, scenarioInvoices, scenarioLines, scenarioRetainageDefault, scenarioRetainageReleases, scenarios, sum } from './model.ts'

for (const scenario of scenarios) {
  test(`${scenario.label}: every creation method preserves all lines and prior billing`, () => {
    const lines = scenarioLines(scenario.id)
    const original = lines.map(line => ({ ...line }))
    const allowance = sum(lines.map(remaining))
    if (allowance === 0) {
      assert.deepEqual(createAmounts(lines, 'full', 'percent', '', []), [0, 0, 0])
      assert.equal(partialError('10', 'percent', lines), 'Exceeds remaining estimate value')
      assert.deepEqual(lines, original)
      return
    }
    const results = [
      createAmounts(lines, 'full', 'percent', '', []),
      createAmounts(lines, 'partial', 'percent', '10', []),
      createAmounts(lines, 'partial', 'amount', '7500', []),
      createAmounts(lines, 'items', 'percent', '', [lines[0].id]),
    ]
    for (const amounts of results) {
      assert.equal(amounts.length, lines.length)
      amounts.forEach((amount, index) => {
        assert.ok(amount >= 0 && amount <= remaining(lines[index]))
        assert.ok(completion(lines[index], amount) <= 100)
      })
    }
    assert.equal(sum(results[0]), allowance)
    assert.equal(sum(results[1]), sum(lines.map(line => line.contract)) * .1)
    assert.equal(sum(results[2]), 7500)
    assert.deepEqual(results[3], [remaining(lines[0]), 0, 0])
    assert.deepEqual(lines, original)
  })
}
test('percentage uses original contract and rejects exceeding the remaining allowance', () => {
  const lines = scenarioLines('partial')
  assert.deepEqual(createAmounts(lines, 'partial', 'percent', '25', []), [6250, 5000, 7500])
  assert.equal(partialError('75', 'percent', lines), '')
  assert.equal(partialError('76', 'percent', lines), 'Exceeds remaining estimate value')
  assert.equal(partialError('56,251', 'amount', lines), 'Exceeds remaining estimate value')
  for (const value of ['', '0', '-5', 'abc']) assert.notEqual(partialError(value, 'percent', lines), '')
})
test('seeded linked invoices match each estimate-side non-draft billing state', () => {
  for (const scenario of scenarios) {
    const invoices = scenarioInvoices(scenario.id)
    const nonDraft = invoices.filter(invoice => invoice.status !== 'Draft')
    const billed = scenario.previous.reduce((total, amount) => total + amount, 0)
    assert.equal(sum(nonDraft.map(invoiceProgressAmount)), billed)
    assert.ok(invoices.filter(invoice => invoice.status === 'Draft').length <= 1)
  }
})
test('uneven prior billing caps eligible lines while distributing a partial amount', () => {
  const lines = scenarioLines('mixed')
  assert.deepEqual(createAmounts(lines, 'partial', 'amount', '20000', []), [5000, 15000, 0])
  assert.deepEqual(createAmounts(lines, 'items', 'percent', '', ['flooring']), [0, 0, 0])
  assert.equal(completion(lines[2], 0), 100)
  assert.equal(completion(lines[0], 0), 80)
  assert.notEqual(billingError('1', lines[2]), '')
  assert.equal(billingError('0', lines[2]), '')
})
test('discount scenarios expose a bounded proportional pool', () => {
  assert.equal(scenarioEstimateDiscount('discount'), 7500)
  assert.equal(scenarioInvoices('discount').length, 0)
  const used = scenarioInvoices('discount-used')
  assert.equal(sum(used.map(item => item.discount)), 1875)
  assert.equal(proportionalDiscount(7500, 18750, 75000), 1875)
  assert.equal(proportionalDiscount(7500, 18750, 75000, 5625), 1875)
  assert.equal(proportionalDiscount(7500, 18750, 75000, 1000), 1000)
})
test('retainage reduces amount due without changing gross contract consumption', () => {
  const invoice = scenarioInvoices('retainage-10')[0]
  assert.equal(sum(scenarioLines('retainage-10').map(line => line.contract)), 100000)
  assert.equal(invoiceProgressAmount(invoice), 25000)
  assert.equal(invoiceRetainageWithheld(invoice), 2500)
  assert.equal(100000 - invoiceProgressAmount(invoice), 75000)
  assert.equal(scenarioRetainageDefault('retainage-10'), 10)
  assert.equal(invoice.milestoneId, 'deposit')
})
test('invoice override and release history do not mutate the contract default or gross billing', () => {
  const original = scenarioInvoices('retainage-10')[0]
  const overridden = { ...original, retainagePercent: 0 }
  assert.equal(scenarioRetainageDefault('retainage-10'), 10)
  assert.equal(invoiceRetainageWithheld(overridden), 0)
  const accumulated = scenarioInvoices('retainage-partial-release')
  assert.equal(sum(accumulated.map(invoiceProgressAmount)), 75000)
  assert.equal(sum(accumulated.map(invoiceRetainageWithheld)), 7500)
  assert.equal(sum(scenarioRetainageReleases('retainage-partial-release').map(item => item.amount)), 2500)
})
test('fully invoiced retainage scenario remains 100 percent gross billed with retainage held', () => {
  const invoices = scenarioInvoices('retainage-full')
  assert.equal(sum(invoices.map(invoiceProgressAmount)), 100000)
  assert.equal(sum(invoices.map(invoiceRetainageWithheld)), 10000)
  assert.deepEqual(invoices.map(invoice => invoice.milestoneId), ['deposit', 'rough-in', 'drywall', 'final'])
})
test('invoice milestone names use only the stored nonblank value', () => {
  assert.equal(invoiceMilestoneName({ milestoneName: '  Deposit  ' }), 'Deposit')
  assert.equal(invoiceMilestoneName({ milestoneName: '   ' }), undefined)
  assert.equal(invoiceMilestoneName({}), undefined)
})
test('Cost Plus allocation follows base selling-price scope without compounding', () => {
  const lines = [
    { id: 'base', name: 'Base', qty: 1, contract: 1000, previous: 0, sku: '', code: '', scopeKind: 'base', taxable: true },
    { id: 'base:cost-plus', relatedScopeId: 'base', name: 'Base — Cost Plus', qty: 1, contract: 100, previous: 0, sku: '', code: '', scopeKind: 'cost-plus', taxable: true },
  ]
  assert.deepEqual(normalizeCostPlusAllocations(lines, [400, 999]), [400, 40])
  const facts = buildInvoiceAllocationFacts(lines, [400, 999], 0, 8)
  assert.equal(facts[0].grossAmountBilled, 400)
  assert.equal(facts[0].costPlusAllocation, 40)
  assert.equal(invoiceTaxFromAllocations(facts), 35.2)
})
test('Cost Plus taxability is independent and discount allocation reconciles', () => {
  const lines = [
    { id: 'taxable', name: 'Taxable', qty: 1, contract: 6000, previous: 0, sku: '', code: '', taxable: true },
    { id: 'nontaxable', name: 'Nontaxable', qty: 1, contract: 4000, previous: 0, sku: '', code: '', taxable: false },
    { id: 'taxable:cost-plus', relatedScopeId: 'taxable', name: 'Cost Plus', qty: 1, contract: 600, previous: 0, sku: '', code: '', scopeKind: 'cost-plus', taxable: false },
  ]
  const facts = buildInvoiceAllocationFacts(lines, [6000, 4000, 600], 1000, 8)
  assert.equal(sum(facts.map(fact => fact.discountAllocated + fact.costPlusDiscountAllocated)), 1000)
  assert.equal(facts.find(fact => fact.sourceContractLineId === 'taxable').taxOnCostPlus, 0)
  assert.equal(invoiceTaxFromAllocations(facts), 434.72)
})
test('gross-scope completion ignores net discount totals', () => {
  assert.equal(consumesAllRemainingGrossScope(22000, 22000), true)
  assert.equal(consumesAllRemainingGrossScope(20000, 22000), false)
  assert.equal(proportionalDiscount(10000, 22000, 110000), 2000)
})
