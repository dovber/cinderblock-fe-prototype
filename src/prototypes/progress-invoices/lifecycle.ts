import { allocate, buildInvoiceAllocationFacts, invoiceTaxFromAllocations, normalizeCostPlusAllocations, scenarioLines, scenarioInvoices, scenarioEstimateDiscount, scenarioRetainageDefault, scenarioRetainageReleases, scenarios, sum, rounded, type EstimateLine, type ProgressInvoice, type ScenarioId } from './model'
import { acceptedOrders, amount, changeOrderScenarios, estimateLines as coEstimateLines, hasMeaningfulAdjustment, scenarioOrders, type ChangeOrder, type ChangeOrderScenarioId, type EstimateLine as ChangeOrderSource } from './change-orders/model'
import { scenarios as contractScenarios } from './contract-billing/scenarios'
import { cloneScheduleScenario, scheduleScenarios, type ScheduleMilestone, type OnAcceptanceAction, type ScheduleScenarioId } from './schedule/model'
import type { RetainageReleaseInvoice, StandardInvoice } from '../../shared/invoice-creation'

export type ContractInvoice = ProgressInvoice & { amounts: Record<string, number> }
export type LifecycleState = {
  scenario: string
  original: EstimateLine[]
  orders: ChangeOrder[]
  invoices: ProgressInvoice[]
  releases: RetainageReleaseInvoice[]
  standardInvoice: StandardInvoice | null
  discount: number
  /** Resolved from the accepted Estimate/contract; progress invoicing does not choose its own rate. */
  taxRate: number
  costPlusPercent: number
  costPlusTaxable: boolean
  contractRevision: number
  retainageDefault?: number
  retainageEnabled: boolean
  milestones: ScheduleMilestone[]
  accepted: boolean
  preAcceptanceStatus?: string
  onAcceptance: OnAcceptanceAction
  acceptanceProcessed?: boolean
  notice: string
}
export const lifecycleScenarios = [
  ...scenarios.map(item => ({ id: item.id, label: item.label })),
  ...changeOrderScenarios.map(item => ({ id: `co-${item.id}`, label: `Change Orders — ${item.label}` })),
  ...contractScenarios.map(item => ({ id: `contract-${item.id}`, label: item.label })),
  ...scheduleScenarios.map(item => ({ id: `schedule-${item.id}`, label: `Payment schedule — ${item.label}` })),
]
export type RegularScenarioId = 'regular-no-invoices' | 'regular-tax' | 'regular-cost-plus' | 'regular-discount' | 'regular-progress' | 'regular-fully-invoiced' | 'regular-change-order' | 'regular-change-order-invoices' | 'regular-multiple-change-orders' | 'regular-fully-invoiced-change-orders' | 'regular-over-invoiced-change-order' | 'regular-payment-schedule' | 'regular-payment-schedule-draft' | 'regular-payment-schedule-progress' | 'regular-payment-schedule-over-allocated'
export const regularScenarios: { id: RegularScenarioId; label: string }[] = [
  { id: 'regular-no-invoices', label: 'No invoices' },
  { id: 'regular-tax', label: 'Estimate w/ tax' },
  { id: 'regular-cost-plus', label: 'Estimate w/ cost plus' },
  { id: 'regular-discount', label: 'Estimate w/ discount' },
  { id: 'regular-progress', label: 'With progress invoice' },
  { id: 'regular-fully-invoiced', label: 'Fully invoiced' },
  { id: 'regular-change-order', label: 'With change order' },
  { id: 'regular-change-order-invoices', label: 'With Change Order + Invoices' },
  { id: 'regular-multiple-change-orders', label: 'With multiple change orders' },
  { id: 'regular-fully-invoiced-change-orders', label: 'Fully invoiced w/ change orders' },
  { id: 'regular-over-invoiced-change-order', label: 'Over invoiced w/ change order' },
  { id: 'regular-payment-schedule', label: 'Payment schedule' },
  { id: 'regular-payment-schedule-draft', label: 'Payment schedule with draft' },
  { id: 'regular-payment-schedule-progress', label: 'Payment schedule in progress' },
  { id: 'regular-payment-schedule-over-allocated', label: 'Payment schedule over allocated' },
]
const originalScope = (lines: EstimateLine[]) => lines.map(line => ({ ...line, previous: 0, sourceId: 'estimate', sourceLabel: 'Estimate #1008', kind: 'active' as const }))
export const toChangeOrderSources = (lines: EstimateLine[]): ChangeOrderSource[] => lines.map(line => ({ id: line.id, name: line.name, description: line.description ?? '', qty: line.qty, price: line.contract / line.qty, cost: line.contract / line.qty * .7, markup: 42.86 }))
export function invoiceAmounts(invoice: ProgressInvoice, lines: EstimateLine[]) {
  return Object.fromEntries((invoice.lineIds ?? lines.map(line => line.id)).map((id, index) => [id, invoice.lineAmounts[index] ?? 0]))
}
export function invoiceSnapshotLines(invoice: ProgressInvoice, fallback: EstimateLine[]) {
  return (invoice.lineSnapshot ?? fallback).map(line => ({ ...line }))
}
export const isPosted = (invoice: ProgressInvoice) => invoice.status !== 'Draft' && invoice.status !== 'Canceled'
export const totalGrossBilled = (state: LifecycleState) => sum(state.invoices.filter(isPosted).flatMap(invoice => invoice.lineAmounts))
export const totalBilled = (state: LifecycleState) => rounded(sum(state.invoices.filter(isPosted).map(invoice => sum(invoice.lineAmounts) - invoice.discount)))
export const draftReservedValue = (state: LifecycleState) => rounded(sum(state.invoices.filter(invoice => invoice.status === 'Draft').map(invoice => sum(invoice.lineAmounts) - invoice.discount)))
export const grossContractScope = (state: LifecycleState) => rounded(sum(contractScope(state).map(line => line.contract)))
export const contractDiscountPool = (state: LifecycleState) => Math.max(0, rounded(state.discount + sum(acceptedOrders(state.orders).map(order => order.discount))))
export const acceptedValue = (state: LifecycleState) => rounded(grossContractScope(state) - contractDiscountPool(state))
export const availableContractDiscount = (state: LifecycleState, excludeInvoiceId?: string) => Math.max(0, rounded(contractDiscountPool(state) - sum(state.invoices.filter(invoice => invoice.id !== excludeInvoiceId && invoice.status !== 'Canceled').map(invoice => invoice.discount))))
function removedSourceIds(state: LifecycleState) {
  const ids = new Set<string>()
  for (const order of acceptedOrders(state.orders)) for (const line of order.lines) {
    if (line.sourceEstimateLineId) ids.add(line.sourceEstimateLineId)
    if (line.sourceChangeOrderId && line.sourceChangeOrderLineId) ids.add(`${line.sourceChangeOrderId}:${line.sourceChangeOrderLineId}`)
  }
  return ids
}
export function historicalTaxCreditGenerated(state: LifecycleState) {
  const removed = removedSourceIds(state)
  return rounded(sum(state.invoices.filter(isPosted).flatMap(invoice => invoice.allocationFacts ?? []).filter(fact => removed.has(fact.sourceContractLineId)).map(fact => fact.taxCharged + fact.taxOnCostPlus)))
}
export function taxCreditBalance(state: LifecycleState, excludeInvoiceId?: string) {
  const applied = sum(state.invoices.filter(invoice => invoice.id !== excludeInvoiceId && invoice.status !== 'Canceled').map(invoice => invoice.taxCreditApplied ?? 0))
  return Math.max(0, rounded(historicalTaxCreditGenerated(state) - applied))
}
export const hasDraft = (state: LifecycleState) => state.invoices.some(invoice => invoice.status === 'Draft') || state.releases.some(invoice => invoice.status === 'Draft')
export const currentContractRevision = (state: LifecycleState) => state.contractRevision
export function isTrackedInvoiceFinanciallyEditable(state: LifecycleState, invoiceId: string) {
  const active = state.invoices.filter(invoice => invoice.status !== 'Canceled')
  const invoice = active.find(item => item.id === invoiceId)
  if (!invoice) return false
  const basedOnCurrentContract = (invoice.contractRevision ?? 0) === currentContractRevision(state)
  if (invoice.status === 'Draft') return basedOnCurrentContract
  return invoice.status === 'Open' && basedOnCurrentContract && active.at(-1)?.id === invoice.id
}
export function trackedInvoiceFinancialLockReason(state: LifecycleState, invoiceId: string) {
  const invoice = state.invoices.find(item => item.id === invoiceId)
  if (!invoice || isTrackedInvoiceFinanciallyEditable(state, invoiceId)) return undefined
  if (invoice.status === 'Open' && (invoice.contractRevision ?? 0) !== currentContractRevision(state)) return 'Financial fields are locked because the contract changed after this invoice posted'
  if (invoice.status === 'Open') return 'Financial fields are locked because a subsequent tracked invoice exists'
  if (invoice.status === 'Canceled') return 'Canceled invoices are read-only'
  return 'Financial fields are locked after payment begins'
}

export function contractScope(state: LifecycleState): EstimateLine[] {
  const accepted = acceptedOrders(state.orders)
  const removed = new Map<string, string>()
  for (const order of accepted) for (const line of order.lines) {
    if (line.sourceEstimateLineId) removed.set(line.sourceEstimateLineId, order.id)
    if (line.sourceChangeOrderLineId) removed.set(`${line.sourceChangeOrderId}:${line.sourceChangeOrderLineId}`, order.id)
  }
  const scope: EstimateLine[] = [...state.original.map(line => ({ ...line, scopeKind: 'base' as const, taxable: line.taxable ?? true, sourceRevision: line.sourceRevision ?? 1 }))]
  if (state.costPlusPercent) scope.push(...state.original.map(line => ({ id: `${line.id}:cost-plus`, relatedScopeId: line.id, sourceId: 'estimate', sourceLabel: 'Estimate #1008', sourceRevision: line.sourceRevision ?? 1, name: `${line.name} — Cost Plus`, description: `Cost Plus at ${state.costPlusPercent}% of selling price.`, qty: 1, contract: rounded(line.contract * state.costPlusPercent / 100), previous: 0, sku: '', code: '', scopeKind: 'cost-plus' as const, taxable: state.costPlusTaxable, kind: 'active' as const })))
  for (const order of accepted) {
    for (const line of order.lines) {
      const id = `${order.id}:${line.id}`
      const lineAmount = amount(line)
      scope.push({ id, sourceId: order.id, sourceLabel: `CO #${order.id}`, sourceRevision: order.version, name: line.name || 'New contract item', description: line.description, qty: line.qty, contract: lineAmount, previous: 0, sku: '', code: '', scopeKind: 'base', taxable: true, kind: lineAmount < 0 ? 'removal' : 'active', originatedFrom: line.sourceChangeOrderId ? `CO #${line.sourceChangeOrderId}` : line.sourceEstimateLineId ? 'Estimate #1008' : undefined })
      const costPlus = rounded(lineAmount * order.costPlusPercent / 100)
      if (costPlus) scope.push({ id: `${id}:cost-plus`, relatedScopeId: id, sourceId: order.id, sourceLabel: `CO #${order.id}`, sourceRevision: order.version, name: `${line.name || 'New contract item'} — Cost Plus`, description: `Inherited Cost Plus at ${order.costPlusPercent}% of selling price.`, qty: 1, contract: costPlus, previous: 0, sku: '', code: '', scopeKind: 'cost-plus', taxable: state.costPlusTaxable, kind: costPlus < 0 ? 'removal' : 'active', originatedFrom: line.sourceChangeOrderId ? `CO #${line.sourceChangeOrderId}` : line.sourceEstimateLineId ? 'Estimate #1008' : undefined })
    }
  }
  return scope.map(line => {
    const removedId = removed.has(line.id) ? line.id : line.relatedScopeId && removed.has(line.relatedScopeId) ? line.relatedScopeId : undefined
    return removedId ? { ...line, kind: 'superseded', modifiedBy: `CO #${removed.get(removedId)}` } : line
  })
}

// All consumption is keyed by original source identity, never by mutable row position.
export function billingLines(state: LifecycleState, excludeInvoiceId?: string): EstimateLine[] {
  const scope = contractScope(state)
  const invoices = state.invoices.filter(invoice => invoice.id !== excludeInvoiceId && invoice.status !== 'Canceled')
  const records = invoices.map(invoice => ({ invoice, amounts: invoiceAmounts(invoice, state.original) }))
  return scope.map(line => {
    const previous = sum(records.filter(record => isPosted(record.invoice)).map(record => record.amounts[line.id] ?? 0))
    const reserved = sum(records.filter(record => record.invoice.status === 'Draft').map(record => record.amounts[line.id] ?? 0))
    return { ...line, previous, billableRemaining: line.kind !== 'active' ? 0 : Math.max(0, rounded(line.contract - previous - reserved)) }
  })
}

export function acceptChangeOrder(state: LifecycleState, order: ChangeOrder): LifecycleState {
  if (state.orders.find(item => item.id === order.id)?.status === 'Accepted') return state
  if (!hasMeaningfulAdjustment(order)) {
    return { ...state, notice: 'This Change Order cannot be accepted because it has no contract adjustment.' }
  }
  if (rounded(contractDiscountPool(state) + order.discount) < 0) {
    return { ...state, notice: 'This discount adjustment would reduce the contract discount pool below $0.00.' }
  }
  const acceptedOrder = { ...order, status: 'Accepted' as const }
  const candidateOrders = state.orders.map(item => item.id === order.id ? acceptedOrder : item)
  const candidateState = { ...state, orders: candidateOrders }
  if (acceptedValue(candidateState) < 0) {
    return { ...state, notice: 'This Change Order cannot be accepted because it would make Contract Value less than $0.00.' }
  }
  const canceledAt = new Date().toISOString()
  const collision = state.invoices.some(invoice => invoice.status === 'Draft')
  return { ...state, contractRevision: state.contractRevision + 1, orders: state.orders.map(item => item.id === order.id ? { ...acceptedOrder, acceptedAt: canceledAt, acceptedBy: 'Diana Johnston', version: order.version + 1 } : item),
    invoices: state.invoices.map(invoice => invoice.status === 'Draft' ? { ...invoice, status: 'Canceled', cancellationReason: 'A Change Order was accepted.', canceledAt } : invoice),
    milestones: state.milestones.map(milestone => state.invoices.some(invoice => invoice.id === milestone.invoiceId && invoice.status === 'Draft') ? { ...milestone, invoiceId: undefined, actualAmount: undefined, invoiceDate: undefined } : milestone),
    notice: collision ? 'A Change Order was accepted. Your draft invoice was canceled — start a new invoice from the updated contract.' : '',
  }
}
export function acceptSavedChangeOrder(state: LifecycleState, orderId: string): LifecycleState {
  const savedOrder = state.orders.find(order => order.id === orderId)
  return savedOrder ? acceptChangeOrder(state, savedOrder) : state
}
export function cancelLifecycleInvoice(state: LifecycleState, invoiceId: string, reason = 'Canceled by contractor.'): LifecycleState {
  const invoice = state.invoices.find(item => item.id === invoiceId)
  if (!invoice || !isTrackedInvoiceFinanciallyEditable(state, invoiceId)) return state
  const canceledAt = new Date().toISOString()
  return {
    ...state,
    invoices: state.invoices.map(item => item.id === invoiceId ? { ...item, status: 'Canceled', cancellationReason: reason, canceledAt } : item),
    milestones: state.milestones.map(milestone => milestone.invoiceId === invoiceId ? { ...milestone, invoiceId: undefined, actualAmount: undefined, invoiceDate: undefined } : milestone),
  }
}
export function saveLifecycleInvoice(state: LifecycleState, invoice: ProgressInvoice): LifecycleState {
  const amount = rounded(sum(invoice.lineAmounts) - invoice.discount)
  const milestoneContractValue = invoice.milestoneContractValue ?? acceptedValue(state)
  const milestoneId = invoice.milestoneId ?? `invoice-${invoice.id}`
  let milestones = state.milestones
  const existing = milestones.find(item => item.id === milestoneId)
  const milestoneName = existing?.name ?? (invoice.milestoneName?.trim() || `Invoice ${milestones.length + 1}`)
  const saved = { ...invoice, milestoneId, milestoneName, milestoneContractValue, milestonePercentageSnapshot: invoice.milestonePercentageSnapshot ?? existing?.percentage, milestonePlannedDateSnapshot: invoice.milestonePlannedDateSnapshot ?? existing?.plannedDate }
  const entry = { id: saved.milestoneId, name: milestoneName, percentage: existing?.percentage, plannedDate: existing?.plannedDate, invoiceId: saved.id, actualAmount: amount, invoiceDate: saved.invoiceDate }
  if (milestones.some(item => item.id === entry.id)) milestones = milestones.map(item => item.id === entry.id ? { ...item, ...entry } : item)
  else { milestones = [...milestones]; const last = milestones.reduce((found, item, index) => item.invoiceId ? index : found, -1); milestones.splice(last + 1, 0, entry) }
  return { ...state, milestones, invoices: state.invoices.some(item => item.id === saved.id) ? state.invoices.map(item => item.id === saved.id ? saved : item) : [...state.invoices, saved] }
}

export function reconcileProgressInvoiceMilestones(state: LifecycleState): LifecycleState {
  return state.invoices.filter(invoice => invoice.status !== 'Canceled').reduce((current, invoice) => saveLifecycleInvoice(current, invoice), state)
}
export function draftInvoice(state: LifecycleState, lines: EstimateLine[], amounts: number[], discount = 0, milestone?: { id?: string; name: string }): ProgressInvoice {
  const id = String(Math.max(100415, ...state.invoices.map(item => Number(item.id)), ...state.releases.map(item => Number(item.id))) + 1)
  const milestoneId = milestone ? milestone.id ?? `invoice-${id}` : undefined
  const existing = milestoneId ? state.milestones.find(item => item.id === milestoneId) : undefined
  const milestoneName = existing?.name ?? (milestone?.name.trim() || `Invoice ${state.milestones.length + 1}`)
  const taxRate = state.taxRate
  const normalizedAmounts = normalizeCostPlusAllocations(lines, amounts)
  const allocationFacts = buildInvoiceAllocationFacts(lines, normalizedAmounts, discount, taxRate)
  const tax = invoiceTaxFromAllocations(allocationFacts)
  const taxCreditApplied = Math.min(taxCreditBalance(state), tax)
  return { id, status: 'Draft', contractRevision: currentContractRevision(state), lineIds: lines.map(line => line.id), lineSnapshot: lines.map(line => ({ ...line })), lineAmounts: normalizedAmounts, descriptions: lines.map(line => line.description ?? ''), invoiceDate: '2026-09-10', dueDate: '2026-10-10', salesperson: 'Diana Johnston', costPlus: state.costPlusPercent, discount, taxCreditApplied, allocationFacts, taxRate, note: 'Thank you for your business.', terms: 'Payment is due on the date shown on this invoice.', milestoneName, milestonePercentageSnapshot: existing?.percentage, milestonePlannedDateSnapshot: existing?.plannedDate, ...(milestoneId ? { milestoneId } : {}), ...(state.retainageEnabled ? { retainagePercent: state.retainageDefault ?? 0 } : {}) }
}

const regularMilestones = (): ScheduleMilestone[] => [
  { id: 'deposit', name: 'Deposit', percentage: 10 },
  { id: 'progress-1', name: 'Progress 1', percentage: 40 },
  { id: 'progress-2', name: 'Progress 2', percentage: 40 },
  { id: 'final', name: 'Final', percentage: 10 },
]

const regularOverAllocatedMilestones = (): ScheduleMilestone[] => regularMilestones().map(milestone =>
  milestone.id === 'progress-2' ? { ...milestone, percentage: 50 } : milestone,
)

function regularAcceptedOrders(count: 1 | 2): ChangeOrder[] {
  const first = scenarioOrders('partial-accepted')[0]
  if (count === 1) return [{ ...first, lines: first.lines.map(line => ({ ...line })) }]
  const second: ChangeOrder = {
    ...first,
    id: '1008-CO2',
    poNumber: 'PO-8814-CO2',
    customerReference: 'Client directive 15',
    lines: [{ ...first.lines[0], id: 'additional-cabinet-scope', name: 'Additional cabinet scope', description: 'Add pantry cabinetry and matching finish work to the accepted contract.', cost: 5250, price: 7500 }],
  }
  return [{ ...first, lines: first.lines.map(line => ({ ...line })) }, second]
}

function regularPostedInvoice(state: LifecycleState, amount: number, id: string, milestone?: { id: string; name: string }): ProgressInvoice {
  return { ...draftInvoice(state, state.original, allocate(state.original, amount), 0, milestone), id, status: 'Open', milestoneContractValue: sum(state.original.map(line => line.contract)) }
}

function regularFullyInvoicedProgression(state: LifecycleState): ProgressInvoice[] {
  const stages = [
    { id: '100501', milestone: { id: 'deposit', name: 'Deposit' }, amount: 10000, invoiceDate: '2026-09-10', dueDate: '2026-10-10' },
    { id: '100502', milestone: { id: 'progress-1', name: 'Progress 1' }, amount: 40000, invoiceDate: '2026-10-10', dueDate: '2026-11-09' },
    { id: '100503', milestone: { id: 'progress-2', name: 'Progress 2' }, amount: 40000, invoiceDate: '2026-11-10', dueDate: '2026-12-10' },
    { id: '100504', milestone: { id: 'final', name: 'Final' }, amount: 10000, invoiceDate: '2026-12-10', dueDate: '2027-01-09' },
  ]
  return stages.map(stage => ({ ...regularPostedInvoice(state, stage.amount, stage.id, stage.milestone), invoiceDate: stage.invoiceDate, dueDate: stage.dueDate }))
}

function regularOverInvoicedProgression(state: LifecycleState): ProgressInvoice[] {
  const stages = [
    { id: '100501', milestone: { id: 'deposit', name: 'Deposit' }, amount: 10000, invoiceDate: '2026-09-10', dueDate: '2026-10-10' },
    { id: '100502', milestone: { id: 'progress-1', name: 'Progress 1' }, amount: 40000, invoiceDate: '2026-10-10', dueDate: '2026-11-09' },
    { id: '100503', milestone: { id: 'progress-2', name: 'Progress 2' }, amount: 30000, invoiceDate: '2026-11-10', dueDate: '2026-12-10' },
  ]
  return stages.map(stage => ({ ...regularPostedInvoice(state, stage.amount, stage.id, stage.milestone), invoiceDate: stage.invoiceDate, dueDate: stage.dueDate }))
}

function regularReducingOrder(): ChangeOrder {
  return {
    id: '1008-CO1',
    status: 'Accepted',
    poNumber: 'PO-8814-CO1',
    customerReference: 'Client directive 14',
    lines: [
      { id: 'remove-flooring-scope', name: 'Flooring installation', description: 'Remove the original flooring scope from the accepted contract.', cost: 28000, markup: 42.86, price: 40000, qty: -1, sourceEstimateLineId: 'flooring' },
      { id: 'revised-flooring-scope', name: 'Revised flooring scope', description: 'Retain limited flooring installation for the revised project scope.', cost: 10500, markup: 42.86, price: 15000, qty: 1 },
    ],
    discount: 0,
    costPlusPercent: 0,
    publicNote: 'This Change Order reduces the accepted flooring scope.',
    terms: 'Approved Change Orders become part of the contract and are billed through future contract invoices.',
    acceptedAt: '2026-09-12T14:30:00-04:00',
    acceptedBy: 'Diana Johnston',
    version: 1,
  }
}

export function regularScenarioState(id: RegularScenarioId): LifecycleState {
  const state: LifecycleState = {
    ...initialLifecycle('retainage-new'),
    scenario: id,
    invoices: [],
    orders: [],
    milestones: [],
    releases: [],
    standardInvoice: null,
    discount: 0,
    retainageDefault: undefined,
    retainageEnabled: false,
    accepted: true,
    preAcceptanceStatus: undefined,
    onAcceptance: 'nothing',
    acceptanceProcessed: true,
    notice: '',
  }
  if (id === 'regular-tax') {
    state.taxRate = 7.5
    state.original = state.original.map(line => ({ ...line, taxable: line.id !== 'drywall' }))
  }
  if (id === 'regular-cost-plus') {
    state.costPlusPercent = 10
    state.costPlusTaxable = false
  }
  if (id === 'regular-progress') state.invoices = [regularPostedInvoice(state, 25000, '100501')]
  if (id === 'regular-discount') state.discount = 10000
  if (id === 'regular-fully-invoiced') state.invoices = regularFullyInvoicedProgression(state)
  if (id === 'regular-change-order' || id === 'regular-change-order-invoices' || id === 'regular-multiple-change-orders' || id === 'regular-fully-invoiced-change-orders') {
    const deposit = regularPostedInvoice(state, 10000, '100501', { id: 'deposit', name: 'Deposit' })
    state.orders = regularAcceptedOrders(id === 'regular-multiple-change-orders' ? 2 : 1)
    state.contractRevision = acceptedOrders(state.orders).length
    state.invoices = [deposit]
  }
  if (id === 'regular-change-order-invoices') {
    const revisedLines = billingLines(state)
    state.invoices.push({
      ...draftInvoice(state, revisedLines, allocate(revisedLines, 30000), 0, { id: 'progress-1', name: 'Progress 1' }),
      id: '100502',
      status: 'Open',
      invoiceDate: '2026-09-18',
      dueDate: '2026-10-18',
    })
  }
  if (id === 'regular-fully-invoiced-change-orders') {
    const remainingLines = billingLines(state)
    const amounts = remainingLines.map(line => line.kind === 'active' ? line.billableRemaining ?? 0 : 0)
    state.invoices.push({ ...draftInvoice(state, remainingLines, amounts), id: '100502', status: 'Open' })
  }
  if (id === 'regular-over-invoiced-change-order') {
    state.invoices = regularOverInvoicedProgression(state)
    state.orders = [regularReducingOrder()]
    state.contractRevision = acceptedOrders(state.orders).length
  }
  if (id === 'regular-payment-schedule' || id === 'regular-payment-schedule-draft' || id === 'regular-payment-schedule-progress') state.milestones = regularMilestones()
  if (id === 'regular-payment-schedule-draft') {
    state.invoices = [{ ...regularPostedInvoice(state, 10000, '100501', { id: 'deposit', name: 'Deposit' }), status: 'Draft' }]
  }
  if (id === 'regular-payment-schedule-over-allocated') state.milestones = regularOverAllocatedMilestones()
  if (id === 'regular-payment-schedule-progress') {
    const deposit = regularPostedInvoice(state, 10000, '100501', { id: 'deposit', name: 'Deposit' })
    state.invoices = [deposit]
    state.milestones = state.milestones.map(milestone => milestone.id === 'deposit' ? { ...milestone, invoiceId: deposit.id, actualAmount: 10000, invoiceDate: deposit.invoiceDate } : milestone)
  }
  state.invoices = state.invoices.map(invoice => ({ ...invoice, lineSnapshot: invoice.lineSnapshot ?? state.original.map(line => ({ ...line })) }))
  return reconcileProgressInvoiceMilestones(state)
}

export function initialLifecycle(scenario: string): LifecycleState {
  const baseline = scenarios.some(item => item.id === scenario) ? scenario as ScenarioId : 'unbilled'
  let state: LifecycleState = { scenario, original: originalScope(scenarioLines(baseline)), invoices: scenarioInvoices(baseline), releases: scenarioRetainageReleases(baseline), orders: [], discount: scenarioEstimateDiscount(baseline), taxRate: 0, costPlusPercent: 0, costPlusTaxable: true, contractRevision: 0, retainageDefault: scenarioRetainageDefault(baseline), retainageEnabled: baseline.startsWith('retainage-'), milestones: [], accepted: true, onAcceptance: 'nothing', standardInvoice: null, notice: '' }
  if (state.retainageEnabled) state.milestones = ['Deposit', 'Rough-in', 'Drywall', 'Final payment'].map((name, index) => ({ id: ['deposit', 'rough-in', 'drywall', 'final'][index], name, percentage: 25 }))
  if (scenario.startsWith('co-')) {
    const key = scenario.slice(3) as ChangeOrderScenarioId
    state.original = originalScope(coEstimateLines.map(line => ({ id: line.id, name: line.name, description: line.description, qty: line.qty, contract: amount(line), previous: 0, sku: '', code: '' })))
    const amounts = key === 'partial-no-co' || key === 'partial-accepted' ? [5000, 4000, 6000] : key === 'pending' ? [2500, 0, 5000] : key === 'over-invoiced' ? [25000, 20000, 25000] : null
    if (amounts) state.invoices = [{ ...draftInvoice(state, state.original, amounts), status: key === 'pending' ? 'Draft' : 'Open' }]
    state.orders = scenarioOrders(key)
    state.contractRevision = acceptedOrders(state.orders).length
  }
  if (scenario.startsWith('contract-')) {
    const seed = contractScenarios.find(item => item.id === scenario.slice(9))!
    state.original = originalScope(seed.lines.filter(line => line.sourceId === seed.sources[0].id).map(line => ({ ...line, previous: 0, sku: '', code: '', billableRemaining: undefined })))
    state.orders = seed.sources.filter(source => source.kind === 'change-order').map((source, index) => ({ id: `1008-CO${index + 1}`, status: 'Accepted', poNumber: '', customerReference: '', version: 1, discount: 0, costPlusPercent: 0, publicNote: 'This Change Order updates the accepted scope.', terms: '', lines: seed.lines.filter(line => line.sourceId === source.id).map(line => ({ id: line.id, name: line.name, description: line.description, qty: line.qty, price: line.contract / line.qty, cost: Math.abs(line.contract / line.qty) * .7, markup: 42.86, ...(line.kind === 'removal' ? { sourceEstimateLineId: state.original.find(original => original.name === line.name)?.id } : {}) })) }))
    state.contractRevision = acceptedOrders(state.orders).length
    const scope = contractScope(state)
    state.invoices = seed.invoices.map(invoice => ({ ...draftInvoice(state, scope, scope.map(line => invoice.amounts[line.id.split(':').at(-1)!] ?? 0)), id: invoice.id, status: invoice.status, invoiceDate: invoice.invoiceDate, dueDate: invoice.dueDate, note: invoice.note, terms: invoice.terms, taxRate: 0, lineIds: scope.map(line => line.id), lineAmounts: scope.map(line => invoice.amounts[line.id.split(':').at(-1)!] ?? 0) }))
  }
  if (scenario.startsWith('schedule-')) {
    const seed = cloneScheduleScenario(scenario.slice(9) as ScheduleScenarioId)
    state = { ...state, accepted: seed.accepted, preAcceptanceStatus: seed.preAcceptanceStatus, onAcceptance: seed.onAcceptance, retainageEnabled: seed.retainageDefault !== undefined, retainageDefault: seed.retainageDefault, milestones: seed.milestones.map(item => ({ ...item })) }
    state.original = originalScope(scenarioLines(seed.retainageDefault !== undefined ? 'retainage-new' : 'unbilled'))
    if (seed.acceptedChangeOrder) { state.orders = scenarioOrders('partial-accepted'); state.contractRevision = acceptedOrders(state.orders).length }
    state.invoices = seed.invoices.map(invoice => ({ ...draftInvoice(state, state.original, Object.values(invoice.amounts)), id: invoice.id, status: invoice.status, contractRevision: seed.acceptedChangeOrder ? 0 : state.contractRevision, milestoneId: invoice.milestoneId, milestoneName: invoice.milestoneName, retainagePercent: invoice.retainagePercent, milestoneContractValue: seed.acceptedChangeOrder ? seed.contractValue - seed.acceptedChangeOrder : seed.contractValue, lineIds: state.original.map(line => line.id) }))
  }
  state.contractRevision = acceptedOrders(state.orders).length
  state.invoices = state.invoices.map(invoice => ({ ...invoice, contractRevision: invoice.contractRevision ?? state.contractRevision, lineIds: invoice.lineIds ?? state.original.map(line => line.id), lineSnapshot: invoice.lineSnapshot ?? state.original.map(line => ({ ...line })) }))
  return reconcileProgressInvoiceMilestones(state)
}
