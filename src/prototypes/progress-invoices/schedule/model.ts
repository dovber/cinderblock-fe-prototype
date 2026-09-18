export type ScheduleScenarioId = 'none' | 'scheduled' | 'partial' | 'accepted-co' | 'acceptance-draft' | 'acceptance-retainage' | 'acceptance-reordered' | 'acceptance-conflict'
export type OnAcceptanceAction = 'nothing' | 'draft'

export type ScheduleMilestone = {
  id: string
  name: string
  percentage?: number
  plannedDate?: string
  invoiceDate?: string
  invoiceId?: string
  actualAmount?: number
  plannedAmount?: number
  amountContractValue?: number
}

export type ScheduleInvoice = {
  id: string
  status: 'Draft' | 'Open'
  milestoneId: string
  milestoneName: string
  amounts: Record<string, number>
  retainagePercent?: number
}

export type ScheduleLine = {
  id: string
  name: string
  qty: number
  contract: number
  previous: number
}

export type ScheduleScenario = {
  id: ScheduleScenarioId
  label: string
  contractValue: number
  acceptedChangeOrder?: number
  retainageDefault?: number
  milestones: ScheduleMilestone[]
  invoices: ScheduleInvoice[]
  onAcceptance: OnAcceptanceAction
  accepted: boolean
  preAcceptanceStatus?: 'DRAFT' | 'PENDING'
  acceptanceProcessed?: boolean
  acceptanceError?: string
}

const planned = (): ScheduleMilestone[] => [
  { id: 'deposit', name: 'Deposit', percentage: 25, plannedDate: '2026-12-01' },
  { id: 'rough-in', name: 'Rough-in', percentage: 25, plannedDate: '2027-01-15' },
  { id: 'drywall', name: 'Drywall', plannedDate: '2027-02-15' },
  { id: 'final', name: 'Final payment', percentage: 50 },
]

const depositInvoice: ScheduleInvoice = {
  id: '100501', status: 'Open', milestoneId: 'deposit', milestoneName: 'Deposit',
  amounts: { cabinets: 6250, drywall: 5000, flooring: 7500 },
}

export const scheduleScenarios: ScheduleScenario[] = [
  { id: 'none', label: 'No payment schedule', contractValue: 75000, milestones: [], invoices: [], onAcceptance: 'nothing', accepted: true },
  { id: 'scheduled', label: 'Scheduled milestones', contractValue: 75000, milestones: planned(), invoices: [], onAcceptance: 'nothing', accepted: false, preAcceptanceStatus: 'DRAFT' },
  { id: 'partial', label: 'Partially invoiced schedule', contractValue: 75000, milestones: planned().map(item => item.id === 'deposit' ? { ...item, invoiceId: '100501', actualAmount: 18750 } : item), invoices: [depositInvoice], onAcceptance: 'nothing', accepted: true },
  { id: 'accepted-co', label: 'Schedule with Accepted CO', contractValue: 85000, acceptedChangeOrder: 10000, milestones: planned().map(item => item.id === 'deposit' ? { ...item, invoiceId: '100501', actualAmount: 18750 } : item), invoices: [depositInvoice], onAcceptance: 'nothing', accepted: true },
  { id: 'acceptance-draft', label: 'On acceptance · Create draft', contractValue: 75000, milestones: planned(), invoices: [], onAcceptance: 'draft', accepted: false },
  { id: 'acceptance-retainage', label: 'Retainage — On acceptance', contractValue: 100000, retainageDefault: 10, milestones: [{ id: 'deposit', name: 'Deposit', percentage: 20 }, { id: 'rough-in', name: 'Rough-in', percentage: 30 }, { id: 'final', name: 'Final payment', percentage: 50 }], invoices: [], onAcceptance: 'draft', accepted: false },
  { id: 'acceptance-reordered', label: 'On acceptance · Reordered first milestone', contractValue: 75000, milestones: [planned()[1], planned()[0], planned()[2], planned()[3]], invoices: [], onAcceptance: 'draft', accepted: false },
  { id: 'acceptance-conflict', label: 'On acceptance · Existing draft conflict', contractValue: 75000, milestones: planned(), invoices: [{ id: '100500', status: 'Draft', milestoneId: 'existing-draft', milestoneName: 'Existing draft', amounts: { cabinets: 2000, drywall: 1500, flooring: 2500 } }], onAcceptance: 'draft', accepted: false },
]

export const cloneScheduleScenario = (id: ScheduleScenarioId): ScheduleScenario => {
  const source = scheduleScenarios.find(item => item.id === id) ?? scheduleScenarios[0]
  return { ...source, milestones: source.milestones.map(item => ({ ...item })), invoices: source.invoices.map(item => ({ ...item, amounts: { ...item.amounts } })) }
}

export const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
export const percent = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value) + '%'
export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
export const invoiceTotal = (invoice: ScheduleInvoice) => sum(Object.values(invoice.amounts))
export const milestonePercentageFromAmount = (amount: number, contractValue: number) => contractValue > 0 ? amount / contractValue * 100 : undefined
export const milestoneAmount = (milestone: ScheduleMilestone, contractValue: number) => {
  if (milestone.invoiceId) return Math.round(((milestone.actualAmount ?? 0) + Number.EPSILON) * 100) / 100
  if (milestone.percentage === undefined && milestone.plannedAmount === undefined) return 0
  if (milestone.plannedAmount !== undefined && milestone.amountContractValue === contractValue) return Math.round((milestone.plannedAmount + Number.EPSILON) * 100) / 100
  return Math.round((contractValue * (milestone.percentage ?? 0) / 100 + Number.EPSILON) * 100) / 100
}
