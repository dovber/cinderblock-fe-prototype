import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronDown, FilePlus2, Link2, MoreVertical, Plus, X } from 'lucide-react'
import { addedLineFixture } from '../../../shared/invoice-creation/addedLineFixtures'
import { acquireTopSurface, Button, ContractSummary, EmptyValue, IconButton, LineItemLockIndicator, StatusBadge } from '../../../shared/ui'
import { ContractDetails } from './ContractDetails'
import { ReplaceIcon } from './ReplaceIcon'
import type { ContractInvoice } from '../lifecycle'
import { invoiceLinksToSource } from './invoiceLinks'
import {
  amount,
  changeOrderCostPlus,
  changeOrderImpact,
  changeOrderLineSubtotal,
  estimateId,
  hasMeaningfulAdjustment,
  money,
  openChangeOrderAdjustment,
  type AdjustmentLine,
  type ChangeOrder,
} from './model'
import s from './ChangeOrders.module.css'

type Props = {
  notice?: string
  originalContractValue: number
  contractValue: number
  totalInvoiced: number
  reservedByDraft: number
  contractDiscountPool: number
  taxCreditBalance?: number
  invoiceDisabled: boolean
  order: ChangeOrder
  orders: ChangeOrder[]
  invoices: ContractInvoice[]
  openOrder?: ChangeOrder
  isPersisted: boolean
  createChangeOrderDisabled: boolean
  onCreateChangeOrder: () => void
  onCreateInvoice: () => void
  onOpenChangeOrder: (order: ChangeOrder) => void
  onOpenEstimate: () => void
  onOpenInvoice: (invoice: ContractInvoice) => void
  onChange: (order: ChangeOrder) => void
  onClose: () => void
  onDelete: () => void
  onSave: () => void
  onSend: () => void
  onAccept: () => void
  onDecline: () => void
  onCancelStatus: () => void
}

const numericValue = (value: string) => Number(value) || 0
function LifecycleConfirmation({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    element.querySelector<HTMLButtonElement>('button')?.focus()
    return () => element.close()
  }, [])
  return createPortal(<dialog ref={dialog} className={s.lifecycleDialog} aria-labelledby="co-lifecycle-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id="co-lifecycle-title">Delete Change Order?</h2>
    <p>This Change Order will be permanently deleted.</p>
    <footer className={s.lifecycleDialogFooter}>
      <Button variant="text" onClick={onClose}>Cancel</Button>
      <Button className={s.dangerButton} onClick={onConfirm}>Delete</Button>
    </footer>
  </dialog>, document.body)
}

export function ChangeOrderEditor({ notice, originalContractValue, contractValue, totalInvoiced, reservedByDraft, contractDiscountPool, taxCreditBalance = 0, invoiceDisabled, order, orders, invoices, openOrder, isPersisted, createChangeOrderDisabled, onCreateChangeOrder, onCreateInvoice, onOpenChangeOrder, onOpenEstimate, onOpenInvoice, onChange, onClose, onDelete, onSave, onSend, onAccept, onDecline, onCancelStatus }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const addedLineCount = useRef(0)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  const overflow = useRef<HTMLDivElement>(null)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [lifecycleAction, setLifecycleAction] = useState(false)
  const [discountInput, setDiscountInput] = useState(() => String(order.discount))
  const lineSubtotal = changeOrderLineSubtotal(order)
  const costPlus = changeOrderCostPlus(order)
  const total = changeOrderImpact(order)
  const parsedDiscount = discountInput.trim() === '' ? 0 : Number(discountInput)
  const minimumDiscount = contractDiscountPool > 0 ? -contractDiscountPool : 0
  const discountError = !Number.isFinite(parsedDiscount)
    ? 'Enter a valid discount adjustment.'
    : contractDiscountPool + parsedDiscount < 0
      ? `Discount cannot reduce the contract discount pool below $0.00. The minimum adjustment is ${money(minimumDiscount)}.`
      : ''
  const canPersist = hasMeaningfulAdjustment(order) && !discountError
  const [savedSignature, setSavedSignature] = useState(() => JSON.stringify(order))
  const dirty = JSON.stringify(order) !== savedSignature
  const linkedInvoices = invoices.filter(invoice => invoiceLinksToSource(invoice, order.id))
  const closed = order.status === 'Declined' || order.status === 'Canceled'
  const locked = closed || order.status === 'Accepted'
  const hasEditableLine = order.lines.some(line => !line.sourceEstimateLineId && !line.sourceChangeOrderLineId)
  const openAdjustment = openChangeOrderAdjustment(openOrder)
  const noticeIsError = notice?.startsWith('This Change Order cannot') || notice?.startsWith('This discount adjustment')

  const updateLine = (lineId: string, patch: Partial<AdjustmentLine>) => {
    onChange({ ...order, lines: order.lines.map(line => line.id === lineId ? { ...line, ...patch } : line) })
  }
  const addLine = () => {
    const sequence = addedLineCount.current + 1
    const fixture = addedLineFixture(sequence)
    addedLineCount.current = sequence
    onChange({
      ...order,
      lines: [...order.lines, {
        id: `mock-added-${order.id}-${sequence}`,
        name: fixture.name,
        description: fixture.description,
        cost: Math.round(fixture.price * 0.7 * 100) / 100,
        markup: 42.86,
        price: fixture.price,
        qty: fixture.qty,
      }],
    })
  }
  const saveChanges = () => {
    if (!canPersist) return
    setSavedSignature(JSON.stringify(order))
    onSave()
  }
  const sendChangeOrder = () => {
    if (!canPersist) return
    setSavedSignature(JSON.stringify({ ...order, status: 'Pending' }))
    onSend()
  }

  useEffect(() => {
    const releaseInert = acquireTopSurface(surface.current!, () => closeRef.current())
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    return () => { releaseInert(); document.body.style.overflow = oldOverflow }
  }, [])

  useEffect(() => {
    if (!overflowOpen) return
    const closeMenu = (event: PointerEvent) => {
      if (!overflow.current?.contains(event.target as Node)) setOverflowOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverflowOpen(false)
    }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [overflowOpen])

  const lifecycleMenuAction = isPersisted && order.status !== 'Accepted'
    ? { label: 'Delete Change Order' }
    : null

  return createPortal(<div ref={surface} className={s.editor} role="main" aria-label="Change Order editor" tabIndex={-1}>
    <header className={s.editorHeader}>
      <div className={s.editorTitle}><button ref={closeButton} className={s.closeEditor} aria-label="Close Change Order" onClick={onClose}><X size={22}/></button><div><h1>Change Order #{order.id}</h1><p>Estimate #{estimateId} · Job #1004 Kitchen Installation</p></div></div>
      <div className={s.saveActions}>{isPersisted && order.status === 'Draft' && <Button variant="secondary" disabled={!canPersist || dirty} title={dirty ? 'Save changes before sending this Change Order' : undefined} onClick={sendChangeOrder}>Send Change Order</Button>}{!closed && order.status !== 'Accepted' && (!isPersisted || dirty) && <Button disabled={!canPersist || (isPersisted && !dirty)} onClick={saveChanges}>{isPersisted ? 'Save changes' : 'Save Change Order'}</Button>}{lifecycleMenuAction && <div ref={overflow} className={s.headerOverflow}><IconButton label="More Change Order actions" aria-haspopup="menu" aria-expanded={overflowOpen} onClick={() => setOverflowOpen(open => !open)}><MoreVertical size={20}/></IconButton>{overflowOpen && <div className={s.overflowMenu} role="menu"><button role="menuitem" onClick={() => { setOverflowOpen(false); setLifecycleAction(true) }}>{lifecycleMenuAction.label}</button></div>}</div>}</div>
    </header>
    <div className={`${s.editorLayout} ${s.noRail}`}>
      <main className={s.editorMain}>
        <nav className={s.sectionNav} aria-label="Change Order sections"><span aria-current="page">Details</span><span>Items</span><span>Public note</span><span>Attachments</span><span>Terms &amp; Conditions</span></nav>
        <div className={s.editorScroll}>
          <section className={s.detailsCard + ' ' + s.estimateDetails}>
            <div className={s.estimateSectionHeading}><h2>Change Order details</h2>{isPersisted && ((order.status === 'Draft' || order.status === 'Pending') ? <div className={s.statusControl}><button type="button" aria-haspopup="menu" aria-expanded={statusMenuOpen} onClick={() => setStatusMenuOpen(open => !open)}><StatusBadge variant="editor" tone={order.status === 'Pending' ? 'pending' : 'neutral'}>{order.status.toUpperCase()}</StatusBadge><ChevronDown size={14}/></button>{statusMenuOpen && <div className={s.statusMenu} role="menu">{dirty && <p className={s.statusMenuHint}>Save changes before changing status.</p>}<button role="menuitem" disabled={dirty || !canPersist} onClick={() => { setStatusMenuOpen(false); sendChangeOrder() }}>Pending</button><button role="menuitem" disabled={dirty || !canPersist} onClick={() => { setStatusMenuOpen(false); onAccept() }}>Accept</button><button role="menuitem" disabled={dirty} onClick={() => { setStatusMenuOpen(false); onDecline() }}>Decline</button><button role="menuitem" disabled={dirty} onClick={() => { setStatusMenuOpen(false); onCancelStatus() }}>Cancel</button></div>}</div> : <StatusBadge variant="editor" tone={order.status === 'Accepted' ? 'success' : 'neutral'}>{order.status.toUpperCase()}</StatusBadge>)}</div>
            <div className={s.detailsGrid}><div><span className={s.label}>Customer</span><strong>Standard Charter Customer</strong></div><div><span className={s.label}>Change Order date</span><strong><CalendarDays size={16}/>Fri, September 11 2026</strong></div><div><span className={s.label}>Job</span><strong><span className={s.jobMarker}/>#1004 Kitchen Installation</strong><p>4508 Worthington Drive, Eureka, CA 95503</p></div><div><span className={s.label}>PO Number</span><strong>{order.poNumber || <EmptyValue/>}</strong></div><div><span className={s.label}>Customer Reference</span><strong>{order.customerReference || <EmptyValue/>}</strong></div><div><span className={s.label}>Salesperson</span><strong>Diana Johnston</strong></div>{order.status === 'Accepted' && order.acceptedAt && <div><span className={s.label}>Acceptance</span><strong>{order.acceptedBy}</strong><p>{new Date(order.acceptedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · Version {order.version}</p></div>}{linkedInvoices.length > 0 && <div className={s.linkedTo}><span className={s.label}>Linked to</span><div className={s.linkedList}>{linkedInvoices.map(invoice => <button key={invoice.id} onClick={() => onOpenInvoice(invoice)}><Link2 size={14}/><span>Invoice #{invoice.id}</span></button>)}</div></div>}</div>
            {notice && <p className={noticeIsError ? s.validationSummary : undefined} role={noticeIsError ? 'alert' : 'status'}>{notice}</p>}
            {isPersisted && <ContractSummary contractValue={contractValue} totalInvoiced={totalInvoiced} reservedByDraft={reservedByDraft} taxCreditBalance={taxCreditBalance} contractValueDetail={openAdjustment} showOverInvoiced/>}
            {order.status === 'Accepted' && <footer className={s.estimateDetailsActions}><Button variant="text" icon={<FilePlus2 size={17}/>} disabled={invoiceDisabled} onClick={onCreateInvoice}>Create invoice</Button><span className={createChangeOrderDisabled ? s.disabledCoAction : undefined} title={createChangeOrderDisabled ? 'Save this Change Order before creating another one' : undefined}><Button variant="text" icon={<ReplaceIcon size={17}/>} disabled={createChangeOrderDisabled} onClick={onCreateChangeOrder}>Create change order</Button></span></footer>}
          </section>

          {isPersisted && <ContractDetails originalContractValue={originalContractValue} contractValue={contractValue} orders={orders} currentDocument={{ type: 'change-order', id: order.id }} onOpenChangeOrder={onOpenChangeOrder} onOpenEstimate={onOpenEstimate}/>} 

          <section className={s.estimateItemCard} aria-label="Change Order items">
            <div className={s.tableOverflow}>
              <table className={s.normalEstimateTable + ' ' + s.changeOrderItemsTable}>
                <thead><tr><th/><th>Item name</th><th className={s.numeric}>Price</th><th className={s.numeric}>Qty</th><th className={s.numeric}>Amount</th><th/></tr></thead>
                <tbody>{order.lines.map((line, index) => {
                  const carried = Boolean(line.sourceEstimateLineId || line.sourceChangeOrderLineId)
                  const rowLocked = locked || carried
                  const lineLockReason = carried
                    ? undefined
                    : order.status === 'Accepted'
                    ? 'This item is locked because this Change Order has been accepted.'
                    : order.status === 'Declined'
                      ? 'This item is locked because this Change Order was declined.'
                      : order.status === 'Canceled'
                        ? 'This item is locked because this Change Order was canceled.'
                        : undefined
                  const lineLabel = line.name || 'line ' + (index + 1)
                  return <tr key={line.id} className={carried ? s.negativeAdjustmentLine : ''}>
                    <td className={s.rowNumber}>{index + 1}</td>
                    <td className={s.estimateItemName + ' ' + s.changeOrderItemName}>
                      {rowLocked ? <><strong>{line.name}{lineLockReason && <LineItemLockIndicator reason={lineLockReason}/>}</strong><span>{line.description}</span></> : <><input aria-label={'Item name for line ' + (index + 1)} placeholder="Item name" value={line.name} onChange={event => updateLine(line.id, { name: event.target.value })}/><textarea aria-label={'Description for ' + lineLabel} placeholder="Add description" value={line.description} onChange={event => updateLine(line.id, { description: event.target.value })}/></>}
                    </td>
                    <td className={s.numeric}>{rowLocked ? money(line.price) : <input className={s.tableNumberInput} aria-label={'Price for ' + lineLabel} inputMode="decimal" value={line.price} onChange={event => updateLine(line.id, { price: numericValue(event.target.value) })}/>}</td>
                    <td className={s.numeric}>{rowLocked ? line.qty : <input className={s.tableNumberInput + ' ' + s.qtyTableInput} aria-label={'Quantity for ' + lineLabel} inputMode="decimal" value={line.qty} onChange={event => updateLine(line.id, { qty: numericValue(event.target.value) })}/>}</td>
                    <td className={s.numeric}><strong>{money(amount(line))}</strong></td>
                    <td className={s.menuColumn}>{!locked && <IconButton label={'Remove ' + (line.name || 'line')} onClick={() => onChange({ ...order, lines: order.lines.filter(item => item.id !== line.id) })}><X size={16}/></IconButton>}</td>
                  </tr>
                })}{!locked && !hasEditableLine && <tr className={s.addItemPromptRow}><td className={s.rowNumber}>{order.lines.length + 1}</td><td colSpan={5}><Button variant="text" icon={<Plus size={16}/>} onClick={addLine}>Add item</Button></td></tr>}</tbody>
              </table>
            </div>
            <div className={s.estimateItemFooter}>
              <div className={s.lineActions}>{!locked && hasEditableLine && <Button variant="secondary" icon={<Plus size={16}/>} onClick={addLine}>Add item</Button>}</div>
              <dl className={s.normalEstimateTotals}>
                <div><dt>Subtotal</dt><dd>{money(lineSubtotal)}</dd></div>
                {order.costPlusPercent > 0 && <><div><dt>Cost plus</dt><dd>{order.costPlusPercent}%</dd></div><div><dt>Cost plus fee</dt><dd>{money(costPlus)}</dd></div></>}
                {(order.discount !== 0 || contractDiscountPool > 0) && <div><dt>Discount</dt><dd>{locked ? money(order.discount) : <div className={s.adjustment}><span>$</span><input aria-label="Change Order discount" aria-invalid={Boolean(discountError)} aria-describedby={discountError ? 'change-order-discount-error' : undefined} inputMode="decimal" value={discountInput} onBlur={() => { if (discountInput.trim() === '') setDiscountInput('0'); else if (!Number.isFinite(parsedDiscount)) setDiscountInput(String(order.discount)) }} onChange={event => { const value = event.target.value; setDiscountInput(value); const parsed = value.trim() === '' ? 0 : Number(value); if (Number.isFinite(parsed)) onChange({ ...order, discount: parsed }) }}/></div>}</dd></div>}
                <div className={s.total}><dt>Contract change</dt><dd>{money(total)}</dd></div>
              </dl>
            </div>
            {discountError && <p id="change-order-discount-error" className={s.validationSummary} role="alert">{discountError}</p>}
          </section>

          <section className={s.textCard}><h2>Public note</h2><textarea value={order.publicNote} onChange={event => onChange({ ...order, publicNote: event.target.value })}/></section>
          <section className={s.textCard}><h2>Attachments</h2><p>No attachments.</p></section>
          <section className={s.textCard}><h2>Terms &amp; Conditions</h2><textarea disabled={locked} value={order.terms} onChange={event => onChange({ ...order, terms: event.target.value })}/></section>
        </div>
      </main>
    </div>
    {lifecycleAction && <LifecycleConfirmation onClose={() => setLifecycleAction(false)} onConfirm={() => { setLifecycleAction(false); onDelete() }}/>} 
  </div>, document.body)
}
