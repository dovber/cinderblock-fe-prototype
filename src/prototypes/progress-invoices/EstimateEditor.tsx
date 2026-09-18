import type { ReactNode } from 'react'
import { FilePlus2 } from 'lucide-react'
import { Button, ContractSummary, EstimateSurface, EstimateTextSection, EstimateDetailsSection, EstimateItemsSection, EstimateRetainageSetting } from '../../shared/ui'
import { acceptedValue, billingLines, contractDiscountPool, draftReservedValue, grossContractScope, hasDraft, invoiceAmounts, isPosted, taxCreditBalance, totalBilled, totalGrossBilled, type LifecycleState } from './lifecycle'
import { invoiceRetainageWithheld, sum, type ProgressInvoice } from './model'
import { ContractDetails } from './change-orders/ContractDetails'
import { openChangeOrderAdjustment, type ChangeOrder } from './change-orders/model'
import { ReplaceIcon } from './change-orders/ReplaceIcon'
import type { RetainageReleaseInvoice } from '../../shared/invoice-creation'
import { RetainageBlock } from './RetainageBlock'

type Props = {
  state: LifecycleState; mode: 'regular' | 'retainage'; initialSection: string; scenarioControl?: ReactNode; onClose: () => void
  onCreateInvoice: () => void; onCreateChangeOrder: () => void; onOpenChangeOrder: (order: ChangeOrder) => void
  onOpenInvoice: (invoice: ProgressInvoice) => void; onOpenStandardInvoice: () => void
  onOpenReleaseInvoice: (invoice: RetainageReleaseInvoice) => void; onRetainageDefaultChange: (value?: number) => void
  onCreateRetainageRelease: () => void
  onAcceptEstimate: () => void; paymentScheduleContent: ReactNode
}
export function EstimateEditor({ state, mode, initialSection, scenarioControl, onClose, onCreateInvoice, onCreateChangeOrder, onOpenChangeOrder, onOpenInvoice, onOpenStandardInvoice, onOpenReleaseInvoice, onRetainageDefaultChange, onCreateRetainageRelease, onAcceptEstimate, paymentScheduleContent }: Props) {
  const contract = acceptedValue(state)
  const invoiced = totalBilled(state)
  const grossScope = grossContractScope(state)
  const grossInvoiced = totalGrossBilled(state)
  const draft = hasDraft(state)
  const openOrder = state.orders.find(order => order.status === 'Draft' || order.status === 'Pending')
  const withheld = sum(state.invoices.filter(isPosted).map(invoiceRetainageWithheld))
  const released = sum(state.releases.filter(invoice => invoice.status !== 'Canceled' && invoice.status !== 'Draft').map(invoice => invoice.amount))
  const held = Math.max(0, withheld - released)
  const originalContractValue = acceptedValue({ ...state, orders: [] })
  const lines = billingLines(state)
  const showContractSummary = state.invoices.length > 0 || state.orders.length > 0 || state.releases.length > 0
  const status = state.standardInvoice ? 'CONVERTED' : !state.accepted ? state.preAcceptanceStatus ?? 'PENDING' : grossInvoiced >= grossScope ? 'CONVERTED' : grossInvoiced > 0 ? 'PARTIALLY CONVERTED' : 'ACCEPTED'
  const invoiceUnavailable = draft || (grossInvoiced >= grossScope && !(mode === 'retainage' && held > 0))
  const estimateLocked = state.invoices.length > 0 || state.orders.length > 0 || Boolean(state.standardInvoice)
  const estimateLockReason = state.standardInvoice
    ? 'This item is locked because this estimate has been converted to a Standard Invoice.'
    : state.invoices.length > 0 && state.orders.length > 0
      ? 'This item is locked because saved invoices and Change Orders exist for this estimate.'
      : state.invoices.length > 0
        ? 'This item is locked because an invoice has already been created from this estimate.'
        : state.orders.length > 0
          ? 'This item is locked because a Change Order has already been created from this estimate.'
          : undefined
  return <EstimateSurface estimateId="1008" initialSection={initialSection} scenarioControl={scenarioControl} focused={mode === 'retainage'} showHeaderActions={false} onClose={onClose}
    sections={[
      { id: 'details', label: 'Details', content: <EstimateDetailsSection status={status} linkedInvoices={[...state.invoices.map(invoice => ({ id: invoice.id, onOpen: () => onOpenInvoice(invoice) })), ...state.releases.map(invoice => ({ id: invoice.id, onOpen: () => onOpenReleaseInvoice(invoice) })), ...(state.standardInvoice ? [{ id: state.standardInvoice.id, onOpen: onOpenStandardInvoice }] : [])]}
        actions={<>{!state.accepted && <Button variant="text" onClick={onAcceptEstimate}>Accept estimate</Button>}{state.accepted && !state.standardInvoice && <><Button variant="text" icon={<FilePlus2 size={17}/>} disabled={invoiceUnavailable} title={draft ? 'A draft invoice already exists for this contract' : undefined} onClick={onCreateInvoice}>{grossInvoiced >= grossScope && held <= 0 ? 'Fully invoiced' : 'Create invoice'}</Button>{mode === 'regular' && <Button variant="text" icon={<ReplaceIcon size={17}/>} onClick={onCreateChangeOrder}>Create change order</Button>}</>}</>}>
        {showContractSummary && <ContractSummary contractValue={contract} totalInvoiced={invoiced} grossContractScope={grossScope} grossScopeInvoiced={grossInvoiced} reservedByDraft={draftReservedValue(state)} taxCreditBalance={taxCreditBalance(state)} contractValueDetail={mode === 'regular' ? openChangeOrderAdjustment(openOrder) : undefined} showOverInvoiced/>}
        {state.retainageEnabled && !state.standardInvoice && <EstimateRetainageSetting value={state.retainageDefault} hasHistory={state.invoices.length > 0 || state.releases.length > 0} onChange={onRetainageDefaultChange}/>}
        {mode === 'retainage' && (withheld > 0 || state.releases.length > 0) && <RetainageBlock withheld={withheld} releases={state.releases} onCreate={onCreateRetainageRelease} onOpen={onOpenReleaseInvoice}/>}
        {state.notice && <p role="status">{state.notice}</p>}
      </EstimateDetailsSection> },
      ...(mode === 'regular' && state.orders.length ? [{ id: 'contract', label: 'Contract details', content: <ContractDetails originalContractValue={originalContractValue} contractValue={contract} orders={state.orders} currentDocument={{ type: 'estimate' }} onOpenChangeOrder={onOpenChangeOrder}/> }] : []),
      { id: 'items', label: 'Items', content: <EstimateItemsSection lines={state.original} estimateLocked={estimateLocked} estimateLockReason={estimateLockReason} estimateDiscount={state.discount} contractDiscountPool={contractDiscountPool(state)} discountUsed={sum(state.invoices.filter(isPosted).map(invoice => invoice.discount))} discountReserved={sum(state.invoices.filter(invoice => invoice.status === 'Draft').map(invoice => invoice.discount))} draftByLine={state.original.map(line => sum(state.invoices.filter(invoice => invoice.status === 'Draft').map(invoice => invoiceAmounts(invoice, state.original)[line.id] ?? 0)))} lineContext={line => { const modified = lines.find(item => item.id === line.id)?.modifiedBy; const order = state.orders.find(item => `CO #${item.id}` === modified); return order ? <Button variant="text" onClick={() => onOpenChangeOrder(order)}>Modified by {modified}</Button> : null }}/>} ,
      ...(mode === 'regular' ? [
        { id: 'schedule', label: 'Payment schedule', content: paymentScheduleContent },
        { id: 'note', label: 'Public note', content: <EstimateTextSection title="Public note"><p>Thank you for the opportunity to provide this estimate.</p></EstimateTextSection> },
        { id: 'attachments', label: 'Attachments', content: null },
        { id: 'terms', label: 'Terms & Conditions', content: null },
      ] : []),
    ]}/>
}
