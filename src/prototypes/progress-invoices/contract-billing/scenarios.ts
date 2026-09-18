export type ScenarioId = 'partial-accepted' | 'multiple-accepted' | 'fully-adjusted'
export type SourceDocument = { id: string; label: string; shortLabel: string; kind: 'estimate' | 'change-order'; delta?: number }
export type ContractLine = {
  id: string
  sourceId: string
  name: string
  description: string
  qty: number
  contract: number
  previous: number
  kind: 'active' | 'superseded' | 'removal'
  billableRemaining: number
  adjustedCompletion?: boolean
}
export type ContractInvoice = {
  id: string
  status: 'Draft' | 'Open' | 'Canceled'
  amounts: Record<string, number>
  invoiceDate: string
  dueDate: string
  note: string
  terms: string
}
export type ContractScenario = {
  id: ScenarioId
  label: string
  sources: SourceDocument[]
  lines: ContractLine[]
  invoices: ContractInvoice[]
}

const estimate: SourceDocument = { id: 'estimate-1008', label: 'Original contract: Estimate #1008', shortLabel: 'Estimate #1008', kind: 'estimate' }
const co1: SourceDocument = { id: 'co-1', label: 'Change Order 1: CO #1008-CO1', shortLabel: 'CO #1008-CO1', kind: 'change-order', delta: 10000 }
const co2: SourceDocument = { id: 'co-2', label: 'Change Order 2: CO #1008-CO2', shortLabel: 'CO #1008-CO2', kind: 'change-order', delta: 3000 }

const originalLines: ContractLine[] = [
  { id: 'cabinets', sourceId: estimate.id, name: 'Standard cabinets', description: 'Factory-finished base and wall cabinets with standard hardware and installation.', qty: 1, contract: 10000, previous: 1000, kind: 'superseded', billableRemaining: 0 },
  { id: 'countertops', sourceId: estimate.id, name: 'Quartz countertops', description: 'Template, fabricate, and install quartz countertops with eased edges and sink cutout.', qty: 1, contract: 25000, previous: 5000, kind: 'active', billableRemaining: 20000 },
  { id: 'flooring', sourceId: estimate.id, name: 'Kitchen flooring', description: 'Install finished flooring with underlayment, perimeter trim, and jobsite cleanup.', qty: 1, contract: 40000, previous: 9000, kind: 'active', billableRemaining: 31000 },
]
const co1Lines: ContractLine[] = [
  { id: 'cabinets-removal', sourceId: co1.id, name: 'Standard cabinets', description: 'Contract adjustment removing the original standard cabinet allowance.', qty: -1, contract: -10000, previous: 0, kind: 'removal', billableRemaining: 0 },
  { id: 'custom-cabinets', sourceId: co1.id, name: 'Custom inset cabinets', description: 'Custom inset cabinetry with painted finish, upgraded hardware, and field installation.', qty: 1, contract: 14000, previous: 0, kind: 'active', billableRemaining: 13000, adjustedCompletion: true },
  { id: 'lighting', sourceId: co1.id, name: 'Additional lighting scope', description: 'Add dedicated circuits, device relocation, and final electrical trim for the revised kitchen plan.', qty: 1, contract: 6000, previous: 0, kind: 'active', billableRemaining: 6000 },
]
const co2Lines: ContractLine[] = [
  { id: 'flooring-removal', sourceId: co2.id, name: 'Kitchen flooring', description: 'Contract adjustment removing the original flooring selection.', qty: -1, contract: -40000, previous: 0, kind: 'removal', billableRemaining: 0 },
  { id: 'premium-flooring', sourceId: co2.id, name: 'Premium wide-plank flooring', description: 'Supply and install upgraded wide-plank flooring with premium underlayment and trim.', qty: 1, contract: 43000, previous: 0, kind: 'active', billableRemaining: 34000, adjustedCompletion: true },
]

const historicalInvoice: ContractInvoice = {
  id: '100501', status: 'Open', amounts: { cabinets: 1000, countertops: 5000, flooring: 9000 },
  invoiceDate: '2026-08-14', dueDate: '2026-09-13', note: 'Thank you for your business.',
  terms: 'Payment is due according to the terms shown on this invoice.',
}
const fullInvoice: ContractInvoice = {
  id: '100502', status: 'Open', amounts: { countertops: 20000, flooring: 31000, 'custom-cabinets': 13000, lighting: 6000 },
  invoiceDate: '2026-09-10', dueDate: '2026-10-10', note: 'Thank you for your business.',
  terms: 'Payment is due according to the terms shown on this invoice.',
}

export const scenarios: ContractScenario[] = [
  { id: 'partial-accepted', label: 'Partially invoiced · Accepted CO', sources: [estimate, co1], lines: [...originalLines, ...co1Lines], invoices: [historicalInvoice] },
  { id: 'multiple-accepted', label: 'Multiple accepted COs', sources: [estimate, co1, co2], lines: [...originalLines.map(line => line.id === 'flooring' ? { ...line, kind: 'superseded' as const, billableRemaining: 0 } : line), ...co1Lines, ...co2Lines], invoices: [historicalInvoice] },
  { id: 'fully-adjusted', label: 'Fully invoiced contract · Adjusted lines', sources: [estimate, co1], lines: [...originalLines, ...co1Lines], invoices: [historicalInvoice, fullInvoice] },
]


