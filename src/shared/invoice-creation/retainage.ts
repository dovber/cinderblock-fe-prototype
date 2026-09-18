export type RetainageReleaseInvoice = {
  id: string
  status: 'Draft' | 'Open' | 'Partially paid' | 'Paid' | 'Canceled'
  amount: number
  invoiceDate: string
  dueDate: string
  note: string
  terms?: string
  poNumber?: string
  customerReference?: string
  salesperson?: string
  amountPaid?: number
  availableRetainage?: number
  estimateId?: string
}

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
export const retainageBase = (progressBilled: number, discount = 0) => roundMoney(Math.max(0, progressBilled - discount))
export const retainageAmount = (progressBilled: number, discount: number, retainagePercent: number) =>
  roundMoney(retainageBase(progressBilled, discount) * Math.max(0, Math.min(100, retainagePercent)) / 100)
export const retainageHeld = (withheld: number, released: number) => roundMoney(Math.max(0, withheld - released))
export function retainageReleaseMetrics(withheld: number, invoices: RetainageReleaseInvoice[]) {
  const active = invoices.filter(invoice => invoice.status !== 'Canceled')
  const released = roundMoney(active.filter(invoice => invoice.status !== 'Draft').reduce((total, invoice) => total + invoice.amount, 0))
  const draftReserved = roundMoney(active.filter(invoice => invoice.status === 'Draft').reduce((total, invoice) => total + invoice.amount, 0))
  const held = retainageHeld(withheld, released)
  return { released, held, draftReserved, available: retainageHeld(held, draftReserved) }
}
