import test from 'node:test'
import assert from 'node:assert/strict'
import { milestoneAmount, milestonePercentageFromAmount } from './model.ts'
import { manualAllocationOverage, paymentSchedulePercentage } from '../../../shared/ui/paymentScheduleMath.ts'

test('dollar entry derives a precise canonical percentage', () => {
  const percentage = milestonePercentageFromAmount(10001, 100000)
  assert.equal(percentage, 10.001)
  assert.equal(milestoneAmount({ id: 'deposit', name: 'Deposit', percentage }, 100000), 10001)
  assert.equal(milestoneAmount({ id: 'deposit', name: 'Deposit', percentage }, 120000), 12001.2)
})

test('uninvoiced milestone amounts follow the current contract while invoiced actuals stay fixed', () => {
  const planned = { id: 'deposit', name: 'Deposit', percentage: 10 }
  assert.equal(milestoneAmount(planned, 100000), 10000)
  assert.equal(milestoneAmount(planned, 120000), 12000)

  const invoiced = { ...planned, invoiceId: '100501', actualAmount: 10000 }
  assert.equal(milestoneAmount(invoiced, 100000), 10000)
  assert.equal(milestoneAmount(invoiced, 120000), 10000)
  assert.equal(paymentSchedulePercentage(invoiced, 100000), 10)
  assert.equal(paymentSchedulePercentage(invoiced, 120000), 10000 / 120000 * 100)
})

test('over-allocation can be measured without making the advisory schedule invalid', () => {
  assert.equal(manualAllocationOverage(80000, 0, 75000), 0)
  assert.equal(manualAllocationOverage(0, 105000, 100000), 5000)
  assert.equal(manualAllocationOverage(80000, 10000, 75000), 10000)
})
