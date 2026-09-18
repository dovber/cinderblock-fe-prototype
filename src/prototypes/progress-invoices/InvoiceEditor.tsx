import { Fragment, useEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { ChevronDown, ExternalLink, FileText, Info } from 'lucide-react'

import { acquireTopSurface, Avatar, Button, Card, EmptyValue, LineItemDescription, LineItemLockIndicator, StatusBadge } from '../../shared/ui'

import { billingError, buildInvoiceAllocationFacts, completion, consumesAllRemainingGrossScope, invoiceCostPlusAllocation, invoiceMilestoneName, invoiceTaxFromAllocations, money, normalizeCostPlusAllocations, parseAmount, percent, remaining, rounded, sum, type EstimateLine, type InvoiceColumnVisibility, type ProgressInvoice } from './model'

import { ProgressInvoicePreview, type PreviewMode } from './ProgressInvoicePreview'

import { InvoiceEditorHeading } from '../../shared/invoice-creation/InvoiceEditorHeading'
import s from '../../shared/invoice-creation/ProgressInvoices.module.css'



const sections = [

  { id: 'details', label: 'Details' }, { id: 'items', label: 'Items' },

  { id: 'note', label: 'Public note' }, { id: 'payments', label: 'Payments' },

  { id: 'attachments', label: 'Attachments' }, { id: 'terms', label: 'Terms & Conditions' },

]

type Visibility = InvoiceColumnVisibility
const defaultVisibility: Visibility = { contract: true, previous: true, current: true, completion: true, sku: false, code: false }

type Props = { contractValue?: number; contractPreviouslyBilled?: number; lines: EstimateLine[]; invoice: ProgressInvoice; priorInvoices?: ProgressInvoice[]; isNew?: boolean; financialEditingAllowed?: boolean; financialLockReason?: string; discountLimit?: number; taxCreditLimit?: number; retainageEnabled?: boolean; onClose: () => void; onSave: (invoice: ProgressInvoice) => void }

function OpenInvoiceEditWarning({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close() }, [])
  return createPortal(<dialog ref={dialog} className={s.editWarningDialog} aria-labelledby="open-invoice-edit-title" onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id="open-invoice-edit-title">Save changes to this invoice?</h2>
    <p>The customer may be unaware of these changes. Send or share the invoice again if you want them to receive the updated invoice.</p>
    <footer><Button variant="text" onClick={onCancel}>Cancel</Button><Button onClick={onConfirm}>Save changes</Button></footer>
  </dialog>, document.body)
}

function FinalDiscountWarning({ amount, onCancel, onConfirm }: { amount: number; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close() }, [])
  return createPortal(<dialog ref={dialog} className={s.editWarningDialog} aria-labelledby="final-discount-title" onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id="final-discount-title">Open invoice with unused discount?</h2>
    <p>{money(amount)} of the contract discount remains unapplied. Opening this final invoice will leave the contract over invoiced by that amount.</p>
    <footer><Button variant="text" onClick={onCancel}>Back</Button><Button onClick={onConfirm}>Open invoice</Button></footer>
  </dialog>, document.body)
}



export function InvoiceEditor({ contractValue, contractPreviouslyBilled, lines, invoice, priorInvoices = [], isNew = false, financialEditingAllowed = true, financialLockReason, discountLimit, taxCreditLimit, retainageEnabled = false, onClose, onSave }: Props) {

  const editable = financialEditingAllowed && (invoice.status === 'Draft' || invoice.status === 'Open')
  const locked = !editable

  const invoiceLockReason = !locked ? undefined
    : financialLockReason?.includes('contract changed')
      ? 'This item is locked because the contract changed after this invoice was posted.'
      : financialLockReason?.includes('subsequent tracked invoice')
        ? 'This item is locked because a subsequent tracked invoice exists.'
        : invoice.status === 'Canceled'
          ? 'This item is locked because this invoice was canceled.'
          : invoice.status === 'Partially paid' || invoice.status === 'Paid'
            ? 'This item is locked because payment activity has begun.'
            : 'This item is locked because this invoice is no longer financially editable.'

  const [amounts, setAmounts] = useState(invoice.lineAmounts.map(value => value.toFixed(2)))

  const descriptions = invoice.descriptions

  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null)

  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [confirmOpenEdit, setConfirmOpenEdit] = useState(false)
  const [confirmFinalDiscount, setConfirmFinalDiscount] = useState(false)

  const visible = invoice.editorVisibility ?? defaultVisibility
  const customerVisible = invoice.customerVisibility ?? defaultVisibility
  const [savedSignature, setSavedSignature] = useState(() => JSON.stringify({ ...invoice, editorVisibility: invoice.editorVisibility ?? defaultVisibility, customerVisibility: invoice.customerVisibility ?? defaultVisibility }))

  const [activeSection, setActiveSection] = useState('details')

  const [discount, setDiscount] = useState(String(invoice.discount))

  const [retainagePercent, setRetainagePercent] = useState(String(invoice.retainagePercent ?? 0))

  const [taxRate, setTaxRate] = useState(String(invoice.taxRate))

  const [invoiceDate, setInvoiceDate] = useState(invoice.invoiceDate)

  const [dueDate, setDueDate] = useState(invoice.dueDate)

  const [note, setNote] = useState(invoice.note)

  const [terms, setTerms] = useState(invoice.terms)

  const root = useRef<HTMLDivElement>(null)

  const closeButton = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  const errors = lines.map((line, index) => locked || line.scopeKind === 'cost-plus' ? '' : billingError(amounts[index], line))

  const enteredAmounts = lines.map((_, index) => errors[index] ? 0 : parseAmount(amounts[index]))
  const validAmounts = normalizeCostPlusAllocations(lines, enteredAmounts)

  const lineSubtotal = rounded(sum(validAmounts))

  const contract = contractValue ?? sum(lines.map(line => line.contract))

  const previouslyBilled = contractPreviouslyBilled ?? sum(lines.map(line => line.previous))

  const contractError = !locked && lineSubtotal > Math.max(0, contract - previouslyBilled) + .01 ? 'Exceeds remaining contract value' : ''

  const grouped = lines.some(line => line.sourceId && line.sourceId !== 'estimate')

  const feePercent = invoice.costPlus

  const discountAmount = parseAmount(discount)

  const taxPercent = parseAmount(taxRate)

  const retainageRate = parseAmount(retainagePercent)

  const fee = invoiceCostPlusAllocation(lines, validAmounts)

  const subtotal = lineSubtotal

  const discountError = !Number.isFinite(discountAmount) ? 'Enter zero or a positive amount' : discountLimit !== undefined && discountAmount > discountLimit ? 'Exceeds remaining discount pool' : discountAmount > subtotal ? 'Discount exceeds subtotal' : ''

  const taxError = !Number.isFinite(taxPercent) || taxPercent > 100 ? 'Enter a percentage from 0 to 100' : ''

  const retainageError = retainageEnabled && (!Number.isFinite(retainageRate) || retainageRate > 100) ? 'Enter a percentage from 0 to 100' : ''

  const retainageBase = Math.max(0, subtotal - (discountError ? 0 : discountAmount))

  const retainage = retainageEnabled ? rounded(retainageBase * (retainageError ? 0 : retainageRate) / 100) : 0

  const allocationFacts = buildInvoiceAllocationFacts(lines, validAmounts, discountError ? 0 : discountAmount, taxError ? 0 : taxPercent)
  const tax = invoiceTaxFromAllocations(allocationFacts)
  const taxCredit = Math.min(taxCreditLimit ?? invoice.taxCreditApplied ?? 0, tax)
  const total = rounded(retainageBase + tax - retainage - taxCredit)

  const dateError = !invoiceDate || !dueDate ? 'Invoice and due dates are required' : dueDate < invoiceDate ? 'Due date must be on or after invoice date' : ''

  const invalid = !!contractError || errors.some(Boolean) || !!discountError || !!retainageError || !!taxError || !!dateError || lineSubtotal <= 0

  const previewInvoice: ProgressInvoice = { ...invoice, lineAmounts: validAmounts, descriptions,

    invoiceDate, dueDate, costPlus: feePercent,

    discount: Number.isFinite(discountAmount) ? discountAmount : 0, allocationFacts,
    taxCreditApplied: taxCredit,

    ...(retainageEnabled && Number.isFinite(retainageRate) ? { retainagePercent: retainageRate } : {}),

    taxRate: Number.isFinite(taxPercent) ? taxPercent : 0, note, terms, editorVisibility: visible, customerVisibility: customerVisible }
  const dirty = JSON.stringify(previewInvoice) !== savedSignature



  useEffect(() => {

    const releaseInert = acquireTopSurface(root.current!, () => closeRef.current())

    const overflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    closeButton.current?.focus()

    return () => { releaseInert(); document.body.style.overflow = overflow }

  }, [])



  function goTo(id: string) {

    setActiveSection(id)

    if (id === 'details') root.current?.querySelector(`.${s.editorScroll}`)?.scrollTo({ top: 0 })

    else root.current?.querySelector(`#invoice-${id}`)?.scrollIntoView({ block: 'start' })

  }

  function persistSave(status = invoice.status) {

    if (invalid) return

    const saved: ProgressInvoice = { ...invoice, status, lineAmounts: validAmounts, descriptions,

      invoiceDate, dueDate, costPlus: feePercent, discount: discountAmount, taxCreditApplied: taxCredit, allocationFacts, ...(retainageEnabled ? { retainagePercent: retainageRate } : {}),

      taxRate: taxPercent, note, terms, editorVisibility: visible, customerVisibility: customerVisible }
    onSave(saved)
    setSavedSignature(JSON.stringify(saved))

  }

  function save(status = invoice.status) {
    if (invoice.status === 'Open' && status === 'Open' && dirty) { setConfirmOpenEdit(true); return }
    persistSave(status)
  }

  function openInvoice() {
    const unusedDiscount = Math.max(0, rounded((discountLimit ?? 0) - (Number.isFinite(discountAmount) ? discountAmount : 0)))
    const consumesRemainingScope = consumesAllRemainingGrossScope(subtotal, contract - previouslyBilled)
    if (unusedDiscount > 0 && consumesRemainingScope) { setConfirmFinalDiscount(true); return }
    save('Open')
  }

  const statusTone = invoice.status === 'Draft' ? 'neutral' : invoice.status === 'Open' ? 'pending' : 'success'

  const milestoneName = invoiceMilestoneName(invoice) ?? 'Invoice 1'

  return createPortal(<div ref={root} className={s.editor} role="main" aria-label="Progress invoice editor" tabIndex={-1}>

    <header className={s.editorHeader}>

      <InvoiceEditorHeading title={isNew ? 'New invoice' : `Invoice #${invoice.id}`} kind="progress" milestoneName={milestoneName} closeLabel="Close progress invoice" closeButton={closeButton} onClose={onClose}/>

      <div className={s.saveActions}><div className={s.previewActions}><Button variant="secondary" icon={<FileText size={16}/>} onClick={() => setPreviewMode('pdf')}>PDF preview</Button><Button variant="secondary" icon={<ExternalLink size={16}/>} onClick={() => setPreviewMode('web')}>Customer web preview</Button></div>{locked && <span className={s.lockedMessage}>{financialLockReason ?? 'Financial fields are locked'}</span>}{isNew ? <Button onClick={() => save()} disabled={invalid}>Create invoice</Button> : dirty && editable ? <Button onClick={() => save()} disabled={invalid}>Save changes</Button> : null}</div>

    </header>

    <div className={s.editorLayout}>

      <div className={s.editorMain}>

        <nav aria-label="Invoice sections" className={s.sectionNav}>{sections.map(section => <button key={section.id} aria-current={activeSection === section.id ? 'location' : undefined} onClick={() => goTo(section.id)}>{section.label}</button>)}</nav>

        <div className={s.editorScroll}>

          <Card className={s.detailsCard} title="Invoice details" actions={!isNew ? invoice.status === 'Draft' ? <div className={s.statusControl}><button type="button" className={s.statusBadgeButton} aria-haspopup="menu" aria-expanded={statusMenuOpen} onClick={() => setStatusMenuOpen(open => !open)}><StatusBadge variant="editor" tone={statusTone}>{invoice.status}<ChevronDown size={14}/></StatusBadge></button>{statusMenuOpen && <div className={s.statusMenu} role="menu" aria-label="Change invoice status"><button type="button" role="menuitem" disabled={invalid} onClick={() => { openInvoice(); setStatusMenuOpen(false) }}>Open</button></div>}</div> : <StatusBadge variant="editor" tone={statusTone}>{invoice.status}</StatusBadge> : undefined}>

            <div id="invoice-details" className={s.detailsGrid}>

              <div><span className={s.label}>Customer</span><strong>Standard Charter Customer</strong><p>(972) 553-3764</p></div>

              <div><label className={s.label} htmlFor="invoice-date">Invoice date</label><input className={s.dateInput} id="invoice-date" type="date" value={invoiceDate} disabled={locked} onChange={event => setInvoiceDate(event.target.value)} aria-invalid={!!dateError}/></div>

              <div><span className={s.label}>Salesperson</span><div className={s.salesperson}><Avatar name={invoice.salesperson} size="small"/><span>{invoice.salesperson}</span></div></div>

              <div><span className={s.label}>Job</span><strong><span className={s.jobMarker}/>#1004 Kitchen Installation</strong><p>4508 Worthington Drive, Eureka,<br/>California, 95503</p></div>

              <div><label className={s.label} htmlFor="invoice-due">Due date</label><input className={s.dateInput} id="invoice-due" type="date" value={dueDate} min={invoiceDate} disabled={locked} onChange={event => setDueDate(event.target.value)} aria-invalid={!!dateError}/>{dateError && <p className={s.error} role="alert">{dateError}</p>}</div>

              <div><span className={s.label}>Linked estimate</span><p>Estimate #1008</p></div>

            </div>

          </Card>

          {invoice.cancellationReason && <Card title="Invoice canceled"><p>{invoice.cancellationReason}</p><p>{invoice.canceledAt}</p></Card>}

          {contractError && <p className={s.error} role="alert">{contractError}</p>}

          <section id="invoice-items" className={s.itemCard} aria-label="Invoice items">

            <div className={s.tableOverflow}><table className={s.editorTable}><caption className={s.srOnly}>Progress invoice line items</caption>

              {!grouped && <thead><tr><th className={s.rowNumber}><span className={s.srOnly}>Line</span></th><th className={s.itemName}>Item name</th><th>Qty</th>{visible.contract && <th className={s.numeric}>Contract Amount</th>}{visible.previous && <th className={s.numeric}>Previously Billed</th>}{visible.current && <th className={s.numeric}>This Invoice</th>}{visible.completion && <th className={s.numeric}>% Complete</th>}</tr></thead>}

              <tbody>{lines.map((line, index) => {
                const lineLockReason = invoiceLockReason
                  ?? (line.kind === 'superseded' ? 'This item is locked because it was superseded by an accepted Change Order.'
                    : line.kind === 'removal' ? 'This item is locked because it records scope removed by an accepted Change Order.'
                      : line.scopeKind === 'cost-plus' ? 'This item is locked because Cost Plus billing is calculated from its related contract item.'
                        : remaining(line) === 0 ? 'This item is locked because it has already been fully invoiced.'
                          : undefined)
                return <Fragment key={line.id}>{grouped && (index === 0 || lines[index - 1].sourceId !== line.sourceId) && <><tr className={s.sourceGroup}><th colSpan={7}>{line.sourceLabel}</th></tr><tr className={s.sourceColumns}><th/><th>Item name</th><th>Qty</th>{visible.contract && <th>Contract Amount</th>}{visible.previous && <th>Previously Billed</th>}{visible.current && <th>This Invoice</th>}{visible.completion && <th>% Complete</th>}</tr></>}<tr data-line={line.id} className={remaining(line) === 0 ? s.completedLine : ''}>

                <td className={s.rowNumber}>{index + 1}</td><td className={s.itemName}><div style={line.kind === 'removal' ? { textDecoration: 'line-through' } : undefined}>{line.name}{lineLockReason && <LineItemLockIndicator reason={lineLockReason}/>}</div>{line.modifiedBy && <small>Modified by {line.modifiedBy}</small>}{line.originatedFrom && <small>Originated from {line.originatedFrom}</small>}<LineItemDescription description={descriptions[index]} className={s.itemDescription}/>{visible.sku && <small>SKU: {line.sku}</small>}{visible.code && <small>Item code: {line.code}</small>}{remaining(line) === 0 && (!line.kind || line.kind === 'active') && <small>Fully invoiced</small>}</td>

                <td className={s.historical}>{line.qty}</td>{visible.contract && <td className={`${s.numeric} ${s.historical}`}>{money(line.contract)}</td>}{visible.previous && <td className={`${s.numeric} ${s.historical}`}>{line.kind === 'removal' ? <EmptyValue/> : money(line.previous)}</td>}

                {visible.current && <td className={s.currentCell}>{line.kind === 'removal' ? <EmptyValue/> : line.kind === 'superseded' || locked || line.scopeKind === 'cost-plus' ? <span className={s.lockedAmount}>{money(validAmounts[index])}</span> : <><div className={s.moneyInput}><span>$</span><input inputMode="decimal" aria-label={`This Invoice for ${line.name}`} aria-invalid={!!errors[index]} aria-describedby={errors[index] ? `line-error-${line.id}` : undefined} disabled={remaining(line) === 0} value={amounts[index]} onChange={event => setAmounts(amounts.map((amount, i) => i === index ? event.target.value : amount))} onBlur={() => { if (!errors[index]) setAmounts(amounts.map((amount, i) => i === index ? parseAmount(amount).toFixed(2) : amount)) }}/></div>{!errors[index] && remaining(line) > 0 && validAmounts[index] < remaining(line) && <button type="button" className={s.applyRemaining} onClick={() => setAmounts(amounts.map((amount, i) => i === index ? remaining(line).toFixed(2) : amount))}>Apply remaining</button>}{errors[index] && <small id={`line-error-${line.id}`} className={s.error} role="alert">{errors[index]}</small>}</>}</td>}

                {visible.completion && <td className={s.numeric}><span className={completion(line, validAmounts[index]) === 100 ? s.complete : ''}>{line.kind === 'removal' || errors[index] ? <EmptyValue/> : percent(completion(line, validAmounts[index]))}</span></td>}

              </tr></Fragment>
              })}</tbody>

            </table></div>

            {errors.some(Boolean) && <p className={s.validationSummary} role="alert">Correct the highlighted invoice amounts before saving.</p>}

            <div className={s.totalsArea}><dl className={s.invoiceTotals}>

              {feePercent > 0 && <><div><dt>Cost plus</dt><dd>{percent(feePercent)}</dd></div>

              <div><dt>Cost plus fee</dt><dd>{money(fee)}</dd></div></>}

              <div><dt>{retainageEnabled ? 'Subtotal billed' : 'Subtotal'} <Info size={13} aria-label="Line amounts including allocated Cost Plus scope"/></dt><dd>{money(subtotal)}</dd></div>

              {(discountLimit !== undefined || invoice.discount > 0) && <div><dt><label htmlFor="discount">Discount</label></dt><dd><div className={s.adjustment}><span>$</span><input id="discount" inputMode="decimal" value={discount} disabled={locked} aria-invalid={!!discountError} onChange={event => setDiscount(event.target.value)}/></div>{discountError && <small className={s.error}>{discountError}</small>}</dd></div>}

              {retainageEnabled && <div><dt><label htmlFor="retainage-rate">Retainage</label></dt><dd><div className={s.adjustment}><span>%</span><input id="retainage-rate" inputMode="decimal" aria-label="Retainage percentage" value={retainagePercent} disabled={locked} aria-invalid={!!retainageError} onChange={event => setRetainagePercent(event.target.value)}/></div>{retainageError && <small className={s.error}>{retainageError}</small>}</dd></div>}

              {retainageEnabled && <div><dt>Retainage amount</dt><dd>−{money(retainage)}</dd></div>}

              {invoice.taxRate > 0 && <div><dt><label htmlFor="tax-rate">Sales tax</label><div className={`${s.adjustment} ${s.taxInput}`} title="Inherited from the accepted Estimate or contract"><input id="tax-rate" inputMode="decimal" aria-label="Sales tax percentage inherited from the accepted Estimate or contract" value={taxRate} disabled aria-invalid={!!taxError} onChange={event => setTaxRate(event.target.value)}/><span>%</span></div></dt><dd>{money(tax)}</dd></div>}

              {invoice.taxRate > 0 && taxError && <div className={s.error}>{taxError}</div>}

              {taxCredit > 0 && <div><dt>Tax credit balance</dt><dd>−{money(taxCredit)}</dd></div>}

              <div className={s.total}><dt>{retainageEnabled ? 'Total due' : 'Total'}</dt><dd aria-live="polite">{money(total)}</dd></div>

            </dl>{lineSubtotal <= 0 && <p className={s.error}>Enter an invoice amount greater than zero to save.</p>}</div>

          </section>

          <section id="invoice-note" className={s.textCard}><h2>Public note</h2><textarea aria-label="Public note" rows={3} value={note} disabled={locked} onChange={event => setNote(event.target.value)}/></section>

          <section id="invoice-payments" className={s.textCard}><h2>Payments</h2><p className={s.muted}>No payments recorded.</p></section>

          <section id="invoice-attachments" className={s.textCard}><h2>Attachments</h2><p className={s.muted}>No attachments.</p></section>

          <section id="invoice-terms" className={s.textCard}><h2>Terms & Conditions</h2><textarea aria-label="Terms and conditions" rows={3} value={terms} disabled={locked} onChange={event => setTerms(event.target.value)}/></section>

        </div>

      </div>

    </div>

    {previewMode && <ProgressInvoicePreview mode={previewMode} invoice={previewInvoice} lines={lines} priorInvoices={priorInvoices} retainageEnabled={retainageEnabled} contractValue={contract} contractPreviouslyBilled={previouslyBilled} visibility={customerVisible} onClose={() => setPreviewMode(null)}/>} 
    {confirmOpenEdit && <OpenInvoiceEditWarning onCancel={() => setConfirmOpenEdit(false)} onConfirm={() => { setConfirmOpenEdit(false); persistSave('Open') }}/>} 
    {confirmFinalDiscount && <FinalDiscountWarning amount={Math.max(0, rounded((discountLimit ?? 0) - discountAmount))} onCancel={() => setConfirmFinalDiscount(false)} onConfirm={() => { setConfirmFinalDiscount(false); save('Open') }}/>} 

  </div>, document.body)

}


