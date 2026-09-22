export type ChangeOrderStatus = 'Draft' | 'Pending' | 'Accepted' | 'Declined' | 'Canceled'
export type ChangeOrderScenarioId = 'none' | 'draft' | 'pending' | 'accepted' | 'multiple' | 'partial-no-co' | 'partial-accepted' | 'over-invoiced'

export type EstimateLine = {
  id: string
  name: string
  description: string
  cost: number
  markup: number
  price: number
  qty: number
}

export type AdjustmentLine = {
  id: string
  name: string
  description: string
  cost: number
  markup: number
  price: number
  qty: number
  sourceEstimateLineId?: string
  sourceChangeOrderLineId?: string
  sourceChangeOrderId?: string
}

export type ChangeOrder = {
  id: string
  status: ChangeOrderStatus
  poNumber: string
  customerReference: string
  createdFromChangeOrderId?: string
  lines: AdjustmentLine[]
  discount: number
  costPlusPercent: number
  publicNote: string
  terms: string
  acceptedAt?: string
  acceptedBy?: string
  version: number
}

export const estimateId = '1008'

export const estimateLines: EstimateLine[] = [
  { id: 'fixtures', name: 'Kitchen fixtures and plumbing', description: 'Supply and install kitchen fixtures, plumbing connections, and final fixture testing.', cost: 8750, markup: 42.86, price: 12500, qty: 2 },
  { id: 'drywall', name: 'Drywall installation and finishing', description: 'Hang, tape, finish, and sand drywall throughout the designated kitchen work area.', cost: 7000, markup: 42.86, price: 10000, qty: 2 },
  { id: 'flooring', name: 'Flooring materials and installation', description: 'Install finished flooring with underlayment, perimeter trim, and jobsite cleanup.', cost: 21000, markup: 42.86, price: 30000, qty: 1 },
]

export const amount = (line: Pick<AdjustmentLine, 'price' | 'qty'>) => line.price * line.qty
export const costAmount = (line: Pick<AdjustmentLine, 'cost' | 'qty'>) => line.cost * line.qty
export const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
export const estimateTotal = sum(estimateLines.map(amount))

export function parseSignedChangeOrderValue(value: string) {
  const normalized = value.trim().replaceAll(',', '').replaceAll('$', '')
  return normalized !== '' && /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN
}

export const changeOrderScenarios: { id: ChangeOrderScenarioId; label: string }[] = [
  { id: 'none', label: 'No Change Orders' },
  { id: 'draft', label: 'Draft CO' },
  { id: 'pending', label: 'Pending CO' },
  { id: 'accepted', label: 'Accepted CO' },
  { id: 'multiple', label: 'Multiple accepted COs' },
  { id: 'partial-no-co', label: 'Partially invoiced · No COs' },
  { id: 'partial-accepted', label: 'Partially invoiced · Accepted CO' },
  { id: 'over-invoiced', label: 'Over invoiced after accepted CO' },
]

export function blankAdjustmentLine(orderId: string, sequence = Date.now()): AdjustmentLine {
  return { id: `addition-${orderId}-${sequence}`, name: '', description: '', cost: 0, markup: 0, price: 0, qty: 1 }
}

export function newChangeOrder(count: number, selectedIds: string[], sourceOrder?: ChangeOrder, originalLines: EstimateLine[] = estimateLines, costPlusPercent = 0): ChangeOrder {
  const id = `${estimateId}-CO${count}`
  const selectableLines = sourceOrder
    ? sourceOrder.lines.filter(line => !line.sourceEstimateLineId && !line.sourceChangeOrderLineId && amount(line) > 0)
    : originalLines
  return {
    id,
    status: 'Draft',
    poNumber: '',
    customerReference: '',
    createdFromChangeOrderId: sourceOrder?.id,
    lines: [
      ...selectedIds.map(sourceId => {
          const source = selectableLines.find(line => line.id === sourceId)!
          return {
            id: `removal-${sourceOrder?.id ?? 'estimate'}-${sourceId}-${count}`,
            name: source.name,
            description: source.description,
            cost: Math.abs(source.cost),
            markup: source.markup,
            price: Math.abs(source.price),
            qty: -Math.abs(source.qty),
            ...(sourceOrder
              ? { sourceChangeOrderLineId: source.id, sourceChangeOrderId: sourceOrder.id }
              : { sourceEstimateLineId: source.id }),
          }
        }),
    ],
    discount: 0,
    costPlusPercent,
    publicNote: 'This Change Order updates the accepted scope described above.',
    terms: 'Approved Change Orders become part of the contract and are billed through future contract invoices.',
    version: 1,
  }
}

function seededChangeOrder(count: number, status: ChangeOrderStatus, selectedIds: string[], additions: AdjustmentLine[]): ChangeOrder {
  const order = newChangeOrder(count, selectedIds)
  const removedLines = order.lines.filter(line => line.sourceEstimateLineId)
  return {
    ...order,
    status,
    poNumber: `PO-8814-CO${count}`,
    customerReference: count === 1 ? 'Client directive 14' : `Client directive ${13 + count}`,
    lines: [...removedLines, ...additions],
    ...(status === 'Accepted' ? { acceptedAt: '2026-09-12T14:30:00-04:00', acceptedBy: 'Diana Johnston' } : {}),
  }
}

export function selectableChangeOrderLines(order: ChangeOrder) {
  return order.lines.filter(line => !line.sourceEstimateLineId && !line.sourceChangeOrderLineId && amount(line) > 0)
}

const drywallUpgrade: AdjustmentLine = {
  id: 'premium-drywall',
  name: 'Premium drywall and wall finish package',
  description: 'Upgrade to moisture-resistant board with a level-five finish in the kitchen work area.',
  cost: 17500,
  markup: 42.86,
  price: 25000,
  qty: 1,
}

const fixtureUpgrade: AdjustmentLine = {
  id: 'custom-fixtures',
  name: 'Custom fixture and plumbing package',
  description: 'Provide upgraded fixtures, trim, valves, and revised plumbing connections.',
  cost: 23450,
  markup: 42.86,
  price: 33500,
  qty: 1,
}

const electricalAddition: AdjustmentLine = {
  id: 'additional-electrical-scope',
  name: 'Additional electrical scope',
  description: 'Add dedicated circuits, device relocation, and final electrical trim for the revised kitchen plan.',
  cost: 7000,
  markup: 42.86,
  price: 10000,
  qty: 1,
}

export function scenarioOrders(scenario: ChangeOrderScenarioId): ChangeOrder[] {
  if (scenario === 'none' || scenario === 'partial-no-co') return []
  if (scenario === 'draft') return [seededChangeOrder(1, 'Draft', ['drywall'], [{ ...drywallUpgrade, id: 'draft-drywall-upgrade', price: 24000, cost: 16800 }])]
  if (scenario === 'pending') return [seededChangeOrder(1, 'Pending', ['drywall'], [{ ...drywallUpgrade, id: 'pending-drywall-upgrade', price: 22500, cost: 15750 }])]
  if (scenario === 'partial-accepted') return [seededChangeOrder(1, 'Accepted', [], [electricalAddition])]
  if (scenario === 'over-invoiced') return [seededChangeOrder(1, 'Accepted', ['flooring'], [{ id: 'revised-flooring', name: 'Revised flooring scope', description: 'Reduce the flooring allowance and retain installation for the revised finish selection.', cost: 14000, markup: 42.86, price: 20000, qty: 1 }])]
  const first = seededChangeOrder(1, 'Accepted', ['drywall'], [{ ...drywallUpgrade }])
  if (scenario === 'accepted') return [first]
  return [
    first,
    seededChangeOrder(2, 'Accepted', ['fixtures'], [{ ...fixtureUpgrade }]),
  ]
}

export function changeOrderLineSubtotal(order: ChangeOrder) {
  return sum(order.lines.map(amount))
}

export function hasMeaningfulAdjustment(order: ChangeOrder) {
  return order.lines.some(line => Boolean(line.sourceEstimateLineId || line.sourceChangeOrderLineId || line.name.trim())) || order.discount !== 0
}

export function changeOrderCostPlus(order: ChangeOrder) {
  // Cost Plus follows the customer-facing selling price. Internal cost never
  // participates in the contract or invoice calculation.
  return sum(order.lines.map(amount)) * order.costPlusPercent / 100
}

export function changeOrderImpact(order: ChangeOrder) {
  return changeOrderLineSubtotal(order) + changeOrderCostPlus(order) - order.discount
}

export function changeOrderContractValueImpact(order: ChangeOrder) {
  return changeOrderLineSubtotal(order) + changeOrderCostPlus(order) - order.discount
}

export function openChangeOrderAdjustment(order?: ChangeOrder) {
  if (!order || (order.status !== 'Draft' && order.status !== 'Pending')) return undefined
  const value = changeOrderContractValueImpact(order)
  const formatted = value > 0 ? `+${money(value)}` : money(value)
  return `${formatted} ${order.status.toLowerCase()}`
}

export function acceptedOrders(orders: ChangeOrder[]) {
  return orders.filter(order => order.status === 'Accepted')
}

export function activeContractValue(orders: ChangeOrder[], originalTotal = estimateTotal) {
  return originalTotal + sum(acceptedOrders(orders).map(changeOrderContractValueImpact))
}
