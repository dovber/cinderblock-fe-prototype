import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ExternalLink, FileText, Link2 } from 'lucide-react'
import { acquireTopSurface, Avatar, Button, Card, StatusBadge } from '../ui'
import { InvoiceEditorHeading } from './InvoiceEditorHeading'
import type { RetainageReleaseInvoice } from './retainage'
import s from './ProgressInvoices.module.css'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const parseAmount = (value: string) => Number(value.replace(/[$,\s]/g, ''))
const sections = [
  { id: 'details', label: 'Details' }, { id: 'release', label: 'Retainage release' },
  { id: 'note', label: 'Public note' }, { id: 'payments', label: 'Payments' },
  { id: 'attachments', label: 'Attachments' }, { id: 'terms', label: 'Terms & Conditions' },
]

type Props = {
  invoice: RetainageReleaseInvoice
  estimateId: string
  heldAtCreation: number
  isNew?: boolean
  onClose: () => void
  onSave: (invoice: RetainageReleaseInvoice) => void
  onDelete?: () => void
  onPreview?: (mode: 'pdf' | 'web', invoice: RetainageReleaseInvoice) => void
}

export function RetainageReleaseEditor({ invoice, estimateId, heldAtCreation, isNew = false, onClose, onSave, onDelete, onPreview }: Props) {
  const locked = invoice.status !== 'Draft'
  const [amount, setAmount] = useState(invoice.amount.toFixed(2))
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoiceDate)
  const [dueDate, setDueDate] = useState(invoice.dueDate)
  const [poNumber, setPoNumber] = useState(invoice.poNumber ?? '')
  const [customerReference, setCustomerReference] = useState(invoice.customerReference ?? '')
  const [note, setNote] = useState(invoice.note)
  const [terms, setTerms] = useState(invoice.terms ?? 'Payment is due on the date shown on this invoice.')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('details')
  const root = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  const releaseAmount = parseAmount(amount)
  const amountError = !Number.isFinite(releaseAmount) || releaseAmount <= 0
    ? 'Enter an amount greater than $0'
    : releaseAmount > heldAtCreation
      ? `Amount cannot exceed ${money(heldAtCreation)}`
      : ''
  const dateError = !invoiceDate || !dueDate
    ? 'Invoice and due dates are required'
    : dueDate < invoiceDate
      ? 'Due date must be on or after invoice date'
      : ''
  const invalid = !!amountError || !!dateError
  const paid = Math.max(0, Math.min(invoice.amountPaid ?? 0, Number.isFinite(releaseAmount) ? releaseAmount : 0))
  const balance = Math.max(0, (Number.isFinite(releaseAmount) ? releaseAmount : 0) - paid)
  const statusTone = invoice.status === 'Draft' || invoice.status === 'Canceled' ? 'neutral' : invoice.status === 'Open' ? 'pending' : 'success'

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
    else root.current?.querySelector(`#retainage-invoice-${id}`)?.scrollIntoView({ block: 'start' })
  }
  function save() {
    if (invalid || locked) return
    onSave({ ...invoice, amount: releaseAmount, invoiceDate, dueDate, poNumber, customerReference, note, terms,
      salesperson: invoice.salesperson ?? 'Diana Johnston', amountPaid: invoice.amountPaid ?? 0,
      availableRetainage: invoice.availableRetainage ?? heldAtCreation, estimateId })
  }
  function currentInvoice(): RetainageReleaseInvoice {
    return { ...invoice, amount: Number.isFinite(releaseAmount) ? releaseAmount : 0, invoiceDate, dueDate, poNumber, customerReference, note, terms,
      salesperson: invoice.salesperson ?? 'Diana Johnston', amountPaid: invoice.amountPaid ?? 0,
      availableRetainage: invoice.availableRetainage ?? heldAtCreation, estimateId }
  }

  return createPortal(<div ref={root} className={s.editor} role="main" aria-label="Retainage invoice editor" tabIndex={-1}>
    <header className={s.editorHeader}>
      <InvoiceEditorHeading title={isNew ? 'New invoice' : `Invoice #${invoice.id}`} kind="retainage-release" closeLabel="Close retainage invoice" closeButton={closeButton} onClose={onClose}/>
      <div className={s.saveActions}><div className={s.previewActions}><Button variant="secondary" icon={<FileText size={16}/>} disabled={invalid} onClick={() => onPreview?.('pdf', currentInvoice())}>PDF preview</Button><Button variant="secondary" icon={<ExternalLink size={16}/>} disabled={invalid} onClick={() => onPreview?.('web', currentInvoice())}>Customer web preview</Button></div>{isNew && <Button onClick={save} disabled={invalid}>Create invoice</Button>}</div>
    </header>
    <div className={s.editorLayout}>
      <div className={s.editorMain}>
        <nav aria-label="Invoice sections" className={s.sectionNav}>{sections.map(section => <button key={section.id} aria-current={activeSection === section.id ? 'location' : undefined} onClick={() => goTo(section.id)}>{section.label}</button>)}</nav>
        <div className={s.editorScroll}>
          <Card className={s.detailsCard} title="Invoice details" actions={!isNew ? invoice.status === 'Draft' ? <div className={s.statusControl}><button type="button" className={s.statusBadgeButton} aria-haspopup="menu" aria-expanded={statusMenuOpen} onClick={() => setStatusMenuOpen(open => !open)}><StatusBadge variant="editor" tone={statusTone}>{invoice.status.toUpperCase()}<ChevronDown size={14}/></StatusBadge></button>{statusMenuOpen && <div className={s.statusMenu} role="menu" aria-label="Change retainage invoice status"><button type="button" role="menuitem" disabled={invalid} onClick={() => { onSave({ ...currentInvoice(), status: 'Open' }); setStatusMenuOpen(false) }}>Open</button><button type="button" role="menuitem" onClick={() => { onSave({ ...currentInvoice(), status: 'Canceled' }); setStatusMenuOpen(false) }}>Cancel invoice</button>{onDelete && <button type="button" role="menuitem" onClick={onDelete}>Delete draft</button>}</div>}</div> : <StatusBadge variant="editor" tone={statusTone}>{invoice.status.toUpperCase()}</StatusBadge> : undefined}>
            <div id="retainage-invoice-details" className={s.detailsGrid}>
              <div><span className={s.label}>Customer</span><strong>Standard Charter Customer</strong><p>(972) 553-3764</p></div>
              <div><label className={s.label} htmlFor="retainage-invoice-date">Invoice date</label><input className={s.dateInput} id="retainage-invoice-date" type="date" value={invoiceDate} disabled={locked} aria-invalid={!!dateError} onChange={event => setInvoiceDate(event.target.value)}/></div>
              <div><span className={s.label}>Salesperson</span><div className={s.salesperson}><Avatar name={invoice.salesperson ?? 'Diana Johnston'} size="small"/><span>{invoice.salesperson ?? 'Diana Johnston'}</span></div></div>
              <div><span className={s.label}>Job</span><strong><span className={s.jobMarker}/>#1004 Kitchen Installation</strong><p>4508 Worthington Drive, Eureka,<br/>California, 95503</p></div>
              <div><label className={s.label} htmlFor="retainage-invoice-due">Due date</label><input className={s.dateInput} id="retainage-invoice-due" type="date" value={dueDate} min={invoiceDate} disabled={locked} aria-invalid={!!dateError} onChange={event => setDueDate(event.target.value)}/>{dateError && <p className={s.error} role="alert">{dateError}</p>}</div>
              <div className={s.normalLinkedDocument}><span className={s.label}>Linked to</span><span><Link2 size={14}/>Estimate #{estimateId}</span></div>
              <div><label className={s.label} htmlFor="retainage-po-number">PO number</label><input className={s.metadataInput} id="retainage-po-number" value={poNumber} disabled={locked} placeholder="Add PO number" onChange={event => setPoNumber(event.target.value)}/></div>
              <div><label className={s.label} htmlFor="retainage-customer-reference">Customer reference</label><input className={s.metadataInput} id="retainage-customer-reference" value={customerReference} disabled={locked} placeholder="Add customer reference" onChange={event => setCustomerReference(event.target.value)}/></div>
            </div>
          </Card>
          <section id="retainage-invoice-release" className={s.itemCard} aria-labelledby="retainage-release-heading">
            <div className={s.retainageReleaseContent}><h2 id="retainage-release-heading">Retainage release</h2>{!locked && <div className={s.releaseEditorFields}><div><span>Retainage held</span><strong>{money(heldAtCreation)}</strong></div><div><label htmlFor="retainage-editor-amount">Amount to release</label><div className={s.releaseAmount}><span>$</span><input id="retainage-editor-amount" inputMode="decimal" value={amount} aria-invalid={!!amountError} aria-describedby={amountError ? 'retainage-editor-error' : undefined} onChange={event => setAmount(event.target.value)} onBlur={() => { if (!amountError) setAmount(releaseAmount.toFixed(2)) }}/></div>{amountError && <small id="retainage-editor-error" className={s.error} role="alert">{amountError}</small>}</div></div>}</div>
            {!isNew && <div className={s.totalsArea}><dl className={s.invoiceTotals}><div><dt>Total</dt><dd>{money(Number.isFinite(releaseAmount) ? releaseAmount : 0)}</dd></div>{paid > 0 && <div><dt>Amount paid</dt><dd>−{money(paid)}</dd></div>}<div className={s.total}><dt>Balance due</dt><dd aria-live="polite">{money(balance)}</dd></div></dl></div>}
          </section>
          <section id="retainage-invoice-note" className={s.textCard}><h2>Public note</h2><textarea aria-label="Public note" rows={3} value={note} disabled={locked} onChange={event => setNote(event.target.value)}/></section>
          <section id="retainage-invoice-payments" className={s.textCard}><h2>Payments</h2><dl className={s.paymentSummary}><div><dt>Amount paid</dt><dd>{money(paid)}</dd></div><div><dt>Balance</dt><dd>{money(balance)}</dd></div></dl>{paid === 0 && <p className={s.muted}>No payments recorded.</p>}</section>
          <section id="retainage-invoice-attachments" className={s.textCard}><h2>Attachments</h2><p className={s.muted}>No attachments.</p></section>
          <section id="retainage-invoice-terms" className={s.textCard}><h2>Terms &amp; Conditions</h2><textarea aria-label="Terms and conditions" rows={3} value={terms} disabled={locked} onChange={event => setTerms(event.target.value)}/></section>
        </div>
      </div>
    </div>
  </div>, document.body)
}
