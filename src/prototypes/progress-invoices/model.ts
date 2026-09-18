import type { RetainageReleaseInvoice } from '../../shared/invoice-creation'

export type EstimateLine = { id: string; name: string; qty: number; contract: number; previous: number; sku: string; code: string; description?: string; sourceId?: string; sourceLabel?: string; sourceRevision?: number; kind?: 'active' | 'superseded' | 'removal'; scopeKind?: 'base' | 'cost-plus'; relatedScopeId?: string; taxable?: boolean; modifiedBy?: string; originatedFrom?: string; billableRemaining?: number }
export type ScenarioId = 'unbilled' | 'partial' | 'full' | 'mixed' | 'discount' | 'discount-used' | 'retainage-new' | 'retainage-10' | 'retainage-held' | 'retainage-partial-release' | 'retainage-full'
export type CreationMethod = 'full' | 'partial' | 'items'
export type InputMode = 'percent' | 'amount'
export type InvoiceStatus = 'Draft' | 'Open' | 'Partially paid' | 'Paid' | 'Canceled'
export type InvoiceColumnVisibility = { contract: boolean; previous: boolean; current: boolean; completion: boolean; sku: boolean; code: boolean }
export type InvoiceAllocationFact = {
  sourceContractLineId: string
  sourceRevision: number
  grossAmountBilled: number
  costPlusAllocation: number
  discountAllocated: number
  costPlusDiscountAllocated: number
  taxableBase: number
  costPlusTaxableBase: number
  taxCharged: number
  taxOnCostPlus: number
  roundingAdjustment: number
}
export type ProgressInvoice = {
  id: string
  status: InvoiceStatus
  lineAmounts: number[]
  lineIds?: string[]
  lineSnapshot?: EstimateLine[]
  cancellationReason?: string
  canceledAt?: string
  contractRevision?: number
  milestoneContractValue?: number
  invoiceDate: string
  dueDate: string
  salesperson: string
  descriptions: string[]
  costPlus: number
  discount: number
  taxCreditApplied?: number
  allocationFacts?: InvoiceAllocationFact[]
  retainagePercent?: number
  processingFee?: number
  taxRate: number
  note: string
  terms: string
  milestoneId?: string
  milestoneName?: string
  milestonePercentageSnapshot?: number
  milestonePlannedDateSnapshot?: string
  editorVisibility?: InvoiceColumnVisibility
  customerVisibility?: InvoiceColumnVisibility
}
type Scenario = { id: ScenarioId; label: string; previous: number[]; invoices: ProgressInvoice[]; estimateDiscount?: number; contractValue?: number; retainageDefault?: number; retainageReleases?: RetainageReleaseInvoice[] }
const invoice = (id: string, status: InvoiceStatus, lineAmounts: number[], overrides: Partial<ProgressInvoice> = {}): ProgressInvoice => ({
  id, status, lineAmounts, invoiceDate: '2026-09-10', dueDate: '2026-10-10',
  salesperson: 'Diana Johnston', descriptions: ['', '', ''], costPlus: 0,
  discount: 0, taxRate: 0, note: 'Thank you for your business.',
  terms: 'Payment is due on the date shown on this invoice.', ...overrides,
})
export const scenarios: Scenario[] = [
  { id: 'unbilled', label: 'Not yet invoiced', previous: [0, 0, 0], invoices: [] },
  { id: 'partial', label: 'Partially invoiced', previous: [6250, 5000, 7500], invoices: [invoice('100411', 'Open', [6250, 5000, 7500])] },
  { id: 'full', label: 'Fully invoiced', previous: [25000, 20000, 30000], invoices: [invoice('100411', 'Partially paid', [12500, 10000, 15000]), invoice('100412', 'Paid', [12500, 10000, 15000])] },
  { id: 'mixed', label: 'Individual item fully invoiced', previous: [20000, 0, 30000], invoices: [invoice('100413', 'Partially paid', [20000, 0, 30000])] },
  { id: 'discount', label: 'Has discount', previous: [0, 0, 0], invoices: [], estimateDiscount: 7500 },
  { id: 'discount-used', label: 'Discount partially used', previous: [6250, 5000, 7500], invoices: [invoice('100414', 'Open', [6250, 5000, 7500], { discount: 1875 })], estimateDiscount: 7500 },
  { id: 'retainage-new', label: 'Retainage — Not yet invoiced', previous: [0, 0, 0], invoices: [], contractValue: 100000, retainageDefault: 10 },
  { id: 'retainage-10', label: 'Retainage — Progress invoice', previous: [7500, 7500, 10000], contractValue: 100000, retainageDefault: 10, invoices: [invoice('100601', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'deposit', milestoneName: 'Deposit' })] },
  { id: 'retainage-held', label: 'Retainage — Accumulated', previous: [22500, 22500, 30000], contractValue: 100000, retainageDefault: 10, invoices: [invoice('100601', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'deposit', milestoneName: 'Deposit' }), invoice('100602', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'rough-in', milestoneName: 'Rough-in' }), invoice('100603', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'drywall', milestoneName: 'Drywall' })] },
  { id: 'retainage-partial-release', label: 'Retainage — Partial release', previous: [22500, 22500, 30000], contractValue: 100000, retainageDefault: 10, invoices: [invoice('100601', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'deposit', milestoneName: 'Deposit' }), invoice('100602', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'rough-in', milestoneName: 'Rough-in' }), invoice('100603', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'drywall', milestoneName: 'Drywall' })], retainageReleases: [{ id: '100605', status: 'Open', amount: 2500, invoiceDate: '2026-09-10', dueDate: '2026-10-10', note: 'Partial retainage release.' }] },
  { id: 'retainage-full', label: 'Retainage — Fully invoiced', previous: [30000, 30000, 40000], contractValue: 100000, retainageDefault: 10, invoices: [invoice('100601', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'deposit', milestoneName: 'Deposit' }), invoice('100602', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'rough-in', milestoneName: 'Rough-in' }), invoice('100603', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'drywall', milestoneName: 'Drywall' }), invoice('100604', 'Open', [7500, 7500, 10000], { retainagePercent: 10, taxRate: 0, milestoneId: 'final', milestoneName: 'Final payment' })] },
]
export function scenarioLines(id: ScenarioId): EstimateLine[] {
  const scenario = scenarios.find(item => item.id === id) ?? scenarios[0]
  const contracts = scenario.contractValue === 100000 ? [30000, 30000, 40000] : [25000, 20000, 30000]
  return [
    { id: 'faucet', name: 'Dura Faucet Classical Two-Handle RV Kitchen Faucet', qty: 2, contract: contracts[0], sku: 'DF-200', code: 'PL-01' },
    { id: 'drywall', name: 'Drywall installation & finishing', qty: 2, contract: contracts[1], sku: 'DW-100', code: 'FN-02' },
    { id: 'flooring', name: 'Flooring installation', qty: 1, contract: contracts[2], sku: 'FL-300', code: 'FN-03' },
  ].map((line, index) => ({ ...line, previous: scenario.previous[index] }))
}
export function scenarioInvoices(id: ScenarioId): ProgressInvoice[] {
  const scenario = scenarios.find(item => item.id === id) ?? scenarios[0]
  return scenario.invoices.map(item => ({
    ...item,
    lineAmounts: [...item.lineAmounts], descriptions: [...item.descriptions],
  }))
}
export function scenarioEstimateDiscount(id: ScenarioId): number {
  return scenarios.find(item => item.id === id)?.estimateDiscount ?? 0
}
export const scenarioRetainageDefault = (id: ScenarioId) => scenarios.find(item => item.id === id)?.retainageDefault
export const scenarioRetainageReleases = (id: ScenarioId) => (scenarios.find(item => item.id === id)?.retainageReleases ?? []).map(item => ({ ...item }))
export const invoiceProgressAmount = (item: ProgressInvoice) => sum(item.lineAmounts)
export const invoiceAmount = (item: ProgressInvoice) => rounded(invoiceProgressAmount(item))
export const invoiceMilestoneName = (item: Pick<ProgressInvoice, 'milestoneName'>) => item.milestoneName?.trim() || undefined
export const invoiceRetainageWithheld = (item: ProgressInvoice) => {
  return rounded(Math.max(0, invoiceProgressAmount(item) - item.discount) * Math.max(0, Math.min(100, item.retainagePercent ?? 0)) / 100)
}
export const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
export const percent = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) + '%'
export const remaining = (line: EstimateLine) => line.kind === 'superseded' || line.kind === 'removal' ? 0 : Math.max(0, line.billableRemaining ?? line.contract - line.previous)
export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
export const rounded = (value: number) => Math.round(value * 100) / 100
export function normalizeCostPlusAllocations(lines: EstimateLine[], supplied: number[]) {
  const result = lines.map((_, index) => rounded(supplied[index] ?? 0))
  lines.forEach((line, index) => {
    if (line.scopeKind !== 'cost-plus' || !line.relatedScopeId) return
    const baseIndex = lines.findIndex(candidate => candidate.id === line.relatedScopeId)
    const base = lines[baseIndex]
    result[index] = !base || base.contract === 0 ? 0 : rounded(result[baseIndex] * line.contract / base.contract)
  })
  return result
}
export function buildInvoiceAllocationFacts(lines: EstimateLine[], supplied: number[], discount: number, taxRate: number): InvoiceAllocationFact[] {
  const amounts = normalizeCostPlusAllocations(lines, supplied)
  const components = lines.map((line, index) => ({ line, amount: Math.max(0, amounts[index] ?? 0), index })).filter(component => component.amount > 0)
  const total = sum(components.map(component => component.amount))
  let discountRemaining = Math.min(Math.max(0, rounded(discount)), total)
  let grossRemaining = total
  const allocated = components.map((component, index) => {
    const share = index === components.length - 1 || grossRemaining <= 0
      ? discountRemaining
      : Math.min(component.amount, rounded(discountRemaining * component.amount / grossRemaining))
    discountRemaining = rounded(discountRemaining - share)
    grossRemaining = rounded(grossRemaining - component.amount)
    return { ...component, discount: share, taxableBase: component.line.taxable === false ? 0 : rounded(Math.max(0, component.amount - share)) }
  })
  const taxableTotal = sum(allocated.map(component => component.taxableBase))
  const totalTax = rounded(taxableTotal * Math.max(0, taxRate) / 100)
  let taxRemaining = totalTax
  let taxableRemaining = taxableTotal
  const taxed = allocated.map(component => {
    if (component.taxableBase <= 0) return { ...component, tax: 0, rounding: 0 }
    const exact = component.taxableBase * Math.max(0, taxRate) / 100
    const tax = taxableRemaining === component.taxableBase ? taxRemaining : Math.min(taxRemaining, rounded(exact))
    taxRemaining = rounded(taxRemaining - tax)
    taxableRemaining = rounded(taxableRemaining - component.taxableBase)
    return { ...component, tax, rounding: rounded(tax - exact) }
  })
  const groups = new Map<string, InvoiceAllocationFact>()
  for (const component of taxed) {
    const sourceId = component.line.relatedScopeId ?? component.line.id
    const fact = groups.get(sourceId) ?? { sourceContractLineId: sourceId, sourceRevision: component.line.sourceRevision ?? 1, grossAmountBilled: 0, costPlusAllocation: 0, discountAllocated: 0, costPlusDiscountAllocated: 0, taxableBase: 0, costPlusTaxableBase: 0, taxCharged: 0, taxOnCostPlus: 0, roundingAdjustment: 0 }
    if (component.line.scopeKind === 'cost-plus') {
      fact.costPlusAllocation = rounded(fact.costPlusAllocation + component.amount)
      fact.costPlusDiscountAllocated = rounded(fact.costPlusDiscountAllocated + component.discount)
      fact.costPlusTaxableBase = rounded(fact.costPlusTaxableBase + component.taxableBase)
      fact.taxOnCostPlus = rounded(fact.taxOnCostPlus + component.tax)
    } else {
      fact.grossAmountBilled = rounded(fact.grossAmountBilled + component.amount)
      fact.discountAllocated = rounded(fact.discountAllocated + component.discount)
      fact.taxableBase = rounded(fact.taxableBase + component.taxableBase)
      fact.taxCharged = rounded(fact.taxCharged + component.tax)
    }
    fact.roundingAdjustment = rounded(fact.roundingAdjustment + component.rounding)
    groups.set(sourceId, fact)
  }
  return [...groups.values()]
}
export const invoiceTaxFromAllocations = (facts: InvoiceAllocationFact[]) => rounded(sum(facts.map(fact => fact.taxCharged + fact.taxOnCostPlus)))
export const invoiceCostPlusAllocation = (lines: EstimateLine[], amounts: number[]) => rounded(sum(normalizeCostPlusAllocations(lines, amounts).filter((_, index) => lines[index]?.scopeKind === 'cost-plus')))
export const consumesAllRemainingGrossScope = (currentGrossAllocation: number, remainingGrossAllocation: number) => Math.abs(rounded(currentGrossAllocation) - rounded(Math.max(0, remainingGrossAllocation))) <= 0.01
export const proportionalDiscount = (originalDiscount: number, invoiceValue: number, originalGrossScope: number, remainingPool = originalDiscount) => originalGrossScope > 0
  ? Math.min(remainingPool, rounded(originalDiscount * invoiceValue / originalGrossScope))
  : 0
export function parseAmount(value: string): number {
  const normalized = value.trim().replaceAll(',', '')
  return normalized !== '' && /^\d*\.?\d+$/.test(normalized) ? Number(normalized) : NaN
}
export function partialError(value: string, mode: InputMode, lines: EstimateLine[]): string {
  const number = parseAmount(value)
  if (!Number.isFinite(number) || number <= 0) return 'Enter a value greater than zero'
  const allowance = sum(lines.map(remaining))
  const requested = mode === 'percent' ? sum(lines.map(line => line.contract)) * number / 100 : number
  return requested > allowance + 0.000001 ? 'Exceeds remaining estimate value' : ''
}
// Mock distribution: weight by contract, cap at remaining, redistribute overflow.
export function allocate(lines: EstimateLine[], requested: number): number[] {
  let available = Math.min(Math.max(requested, 0), sum(lines.map(remaining)))
  const amounts = lines.map(() => 0)
  let eligible = lines.map((_, index) => index).filter(index => remaining(lines[index]) > 0)
  while (eligible.length && available > 0.000001) {
    const weight = sum(eligible.map(index => lines[index].contract))
    const capped = eligible.filter(index => available * lines[index].contract / weight > remaining(lines[index]) - amounts[index])
    if (!capped.length) {
      eligible.forEach(index => { amounts[index] += available * lines[index].contract / weight })
      break
    }
    capped.forEach(index => {
      const amount = remaining(lines[index]) - amounts[index]
      amounts[index] += amount
      available -= amount
    })
    eligible = eligible.filter(index => !capped.includes(index))
  }
  return amounts.map(rounded)
}
export function createAmounts(lines: EstimateLine[], method: CreationMethod, mode: InputMode, value: string, selected: string[]): number[] {
  if (method === 'full') return lines.map(remaining)
  if (method === 'items') return lines.map(line => selected.includes(line.id) ? remaining(line) : 0)
  if (partialError(value, mode, lines)) throw new Error('Invalid partial invoice')
  return allocate(lines, mode === 'percent' ? sum(lines.map(line => line.contract)) * parseAmount(value) / 100 : parseAmount(value))
}
export function billingError(value: string, line: EstimateLine): string {
  const amount = parseAmount(value)
  if (!Number.isFinite(amount)) return 'Enter zero or a positive amount'
  return amount > remaining(line) ? 'Exceeds remaining item value' : ''
}
export const completion = (line: EstimateLine, current: number) => (line.previous + current) / line.contract * 100
