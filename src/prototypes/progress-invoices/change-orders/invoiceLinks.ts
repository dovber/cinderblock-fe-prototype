import type { ContractInvoice } from '../lifecycle'

export function invoiceLinksToSource(invoice: ContractInvoice, sourceId: string) {
  const prefix = sourceId === 'estimate' ? 'estimate:' : `${sourceId}:`
  return Object.entries(invoice.amounts).some(([key, value]) => key.startsWith(prefix) && value !== 0)
}
