import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, FileText, Link2, Plus, Trash2 } from 'lucide-react'
import { acquireTopSurface, Avatar, Button, Card, IconButton, LineItemDescription, StatusBadge } from '../ui'
import { InvoiceEditorHeading } from './InvoiceEditorHeading'
import { StandardInvoicePreview, type StandardPreviewMode } from './StandardInvoicePreview'
import { addedLineFixture } from './addedLineFixtures'
import s from './ProgressInvoices.module.css'

type NormalLine = { id: string; name: string; description: string; price: string; qty: string; taxable?: boolean }
export type StandardInvoiceSourceLine = { id: string; name: string; qty: number; contract: number; taxable?: boolean }
export type StandardInvoice = {
  id: string
  lines: NormalLine[]
  invoiceDate: string
  dueDate: string
  discount: string
  taxRate: string
  costPlusPercent?: number
  note: string
  terms: string
  showSku: boolean
  showCode: boolean
  customerVisibility?: StandardCustomerVisibility
}
export type StandardCustomerVisibility = { price: boolean; qty: boolean; amount: boolean }
type Props = { sourceLines: StandardInvoiceSourceLine[]; estimateId?: string; invoice?: StandardInvoice; defaultDiscount?: string; defaultTaxRate?: string; costPlusPercent?: number; onClose: () => void; onSave: (invoice: StandardInvoice) => void }

const rounded = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const sum = (values: number[]) => rounded(values.reduce((total, value) => total + value, 0))
const parseAmount = (value: string) => Number(value.replace(/[$,\s]/g, ''))
const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const sections = [
  { id: 'details', label: 'Details' }, { id: 'items', label: 'Items' },
  { id: 'note', label: 'Public note' }, { id: 'payments', label: 'Payments' },
  { id: 'attachments', label: 'Attachments' }, { id: 'terms', label: 'Terms & Conditions' },
]

function copiedLines(sourceLines: StandardInvoiceSourceLine[]): NormalLine[] {
  return sourceLines.map(line => ({ id: line.id, name: line.name, description: '', price: (line.contract / line.qty).toFixed(2), qty: String(line.qty), taxable: line.taxable }))
}

export function CopyInvoiceEditor({ sourceLines, estimateId = '1008', invoice, defaultDiscount = '0', defaultTaxRate = '0', costPlusPercent = 0, onClose, onSave }: Props) {
  const defaultCustomerVisibility: StandardCustomerVisibility = { price: true, qty: true, amount: true }
  const [lines, setLines] = useState(() => invoice ? invoice.lines.map(line => ({ ...line })) : copiedLines(sourceLines))
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoiceDate ?? '2026-09-10')
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? '2026-10-10')
  const [discount, setDiscount] = useState(invoice?.discount ?? defaultDiscount)
  const [taxRate] = useState(invoice?.taxRate ?? defaultTaxRate)
  const [note, setNote] = useState(invoice?.note ?? 'Thank you for your business.')
  const [terms, setTerms] = useState(invoice?.terms ?? 'Payment is due on the date shown on this invoice.')
  const showSku = invoice?.showSku ?? false
  const showCode = invoice?.showCode ?? false
  const [activeSection, setActiveSection] = useState('details')
  const [previewMode, setPreviewMode] = useState<StandardPreviewMode | null>(null)
  const customerVisibility = invoice?.customerVisibility ?? defaultCustomerVisibility
  const [savedSignature, setSavedSignature] = useState(() => invoice ? JSON.stringify({ ...invoice, customerVisibility: invoice.customerVisibility ?? defaultCustomerVisibility }) : '')
  const root = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const addedLineCount = useRef(0)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  const amounts = lines.map(line => rounded((Number.isFinite(parseAmount(line.price)) ? parseAmount(line.price) : 0) * (Number.isFinite(parseAmount(line.qty)) ? parseAmount(line.qty) : 0)))
  const lineSubtotal = rounded(sum(amounts))
  const effectiveCostPlusPercent = invoice?.costPlusPercent ?? costPlusPercent
  const costPlus = rounded(lineSubtotal * effectiveCostPlusPercent / 100)
  const subtotal = rounded(lineSubtotal + costPlus)
  const discountAmount = Number.isFinite(parseAmount(discount)) ? Math.min(parseAmount(discount), subtotal) : 0
  const taxable = Math.max(0, sum(amounts.filter((_, index) => lines[index].taxable !== false)) - discountAmount)
  const taxPercent = Number.isFinite(parseAmount(taxRate)) ? Math.min(parseAmount(taxRate), 100) : 0
  const tax = rounded(taxable * taxPercent / 100)
  const total = rounded(subtotal - discountAmount + tax)
  const valid = lines.length > 0 && lines.every(line => line.name.trim() && Number.isFinite(parseAmount(line.price)) && Number.isFinite(parseAmount(line.qty))) && !!invoiceDate && !!dueDate && dueDate >= invoiceDate
  const currentInvoice = (): StandardInvoice => ({ id: invoice?.id ?? '100501', lines: lines.map(line => ({ ...line })), invoiceDate, dueDate, discount, taxRate, costPlusPercent: effectiveCostPlusPercent, note, terms, showSku, showCode, customerVisibility })
  const dirty = invoice ? JSON.stringify(currentInvoice()) !== savedSignature : false

  useEffect(() => {
    const releaseInert = acquireTopSurface(root.current!, () => closeRef.current())
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    return () => { releaseInert(); document.body.style.overflow = overflow }
  }, [])

  function updateLine(id: string, patch: Partial<NormalLine>) {
    setLines(current => current.map(line => line.id === id ? { ...line, ...patch } : line))
  }
  function addLine() {
    const sequence = addedLineCount.current + 1
    addedLineCount.current = sequence
    const fixture = addedLineFixture(sequence)
    setLines(current => [...current, { id: `mock-added-${sequence}`, ...fixture, price: fixture.price.toFixed(2), qty: String(fixture.qty) }])
  }
  function goTo(id: string) {
    setActiveSection(id)
    if (id === 'details') root.current?.querySelector(`.${s.editorScroll}`)?.scrollTo({ top: 0 })
    else root.current?.querySelector(`#standard-invoice-${id}`)?.scrollIntoView({ block: 'start' })
  }
  function save() {
    const saved = currentInvoice()
    onSave(saved)
    setSavedSignature(JSON.stringify(saved))
  }

  return createPortal(<div ref={root} className={s.editor} role="main" aria-label="Standard invoice editor" tabIndex={-1}>
    <header className={s.editorHeader}>
      <InvoiceEditorHeading title={invoice ? `Invoice #${invoice.id}` : 'New invoice'} kind="standard" closeLabel="Close standard invoice" closeButton={closeButton} onClose={onClose}/>
      <div className={s.saveActions}><div className={s.previewActions}><Button variant="secondary" icon={<FileText size={16}/>} onClick={() => setPreviewMode('pdf')}>PDF preview</Button><Button variant="secondary" icon={<ExternalLink size={16}/>} onClick={() => setPreviewMode('web')}>Customer web preview</Button></div>{!invoice ? <Button onClick={save} disabled={!valid}>Create invoice</Button> : dirty ? <Button onClick={save} disabled={!valid}>Save changes</Button> : null}</div>
    </header>
    <div className={s.editorLayout}>
      <div className={s.editorMain}>
        <nav aria-label="Invoice sections" className={s.sectionNav}>{sections.map(section => <button key={section.id} aria-current={activeSection === section.id ? 'location' : undefined} onClick={() => goTo(section.id)}>{section.label}</button>)}</nav>
        <div className={s.editorScroll}>
          <Card className={s.detailsCard} title="Invoice details" actions={<StatusBadge variant="editor">DRAFT</StatusBadge>}>
            <div id="standard-invoice-details" className={s.detailsGrid}>
              <div><span className={s.label}>Customer</span><strong>Standard Charter Customer</strong><p>(972) 553-3764</p></div>
              <div><label className={s.label} htmlFor="standard-invoice-date">Invoice date</label><input className={s.dateInput} id="standard-invoice-date" type="date" value={invoiceDate} onChange={event => setInvoiceDate(event.target.value)}/></div>
              <div><span className={s.label}>Salesperson</span><div className={s.salesperson}><Avatar name="Diana Johnston" size="small"/><span>Diana Johnston</span></div></div>
              <div><span className={s.label}>Job</span><strong><span className={s.jobMarker}/>#1004 Kitchen Installation</strong><p>4508 Worthington Drive, Eureka,<br/>California, 95503</p></div>
              <div><label className={s.label} htmlFor="standard-invoice-due">Due date</label><input className={s.dateInput} id="standard-invoice-due" type="date" value={dueDate} min={invoiceDate} onChange={event => setDueDate(event.target.value)}/></div>
              <div className={s.normalLinkedDocument}><span className={s.label}>Linked to</span><span><Link2 size={14}/>Estimate #{estimateId}</span></div>
            </div>
          </Card>
          <section id="standard-invoice-items" className={s.itemCard} aria-label="Standard invoice items">
            <div className={s.tableOverflow}><table className={`${s.editorTable} ${s.standardEditorTable}`}><caption className={s.srOnly}>Copied invoice line items</caption><thead><tr><th className={s.rowNumber}/><th>Item name</th><th className={s.numeric}>Price</th><th className={s.numeric}>Qty</th><th className={s.numeric}>Amount</th><th className={s.menuColumn}/></tr></thead>
              <tbody>{lines.map((line, index) => <tr key={line.id}><td className={s.rowNumber}>{index + 1}</td><td className={s.standardItemName}><input aria-label={`Item name for line ${index + 1}`} value={line.name} onChange={event => updateLine(line.id, { name: event.target.value })}/><LineItemDescription description={line.description} className={s.standardItemDescription}/>{showSku && <small>SKU</small>}{showCode && <small>Item code</small>}</td><td><div className={s.moneyInput}><span>$</span><input aria-label={`Price for ${line.name}`} inputMode="decimal" value={line.price} onChange={event => updateLine(line.id, { price: event.target.value })}/></div></td><td><input className={s.quantityInput} aria-label={`Quantity for ${line.name}`} inputMode="decimal" value={line.qty} onChange={event => updateLine(line.id, { qty: event.target.value })}/></td><td className={s.numeric}>{money(amounts[index])}</td><td><IconButton label={`Remove ${line.name}`} onClick={() => setLines(current => current.filter(item => item.id !== line.id))}><Trash2 size={16}/></IconButton></td></tr>)}</tbody>
            </table></div>
            <div className={s.standardInvoiceFooter}><div className={s.lineActions}><Button variant="secondary" icon={<Plus size={16}/>} onClick={addLine}>Add item</Button></div><dl className={s.invoiceTotals}><div><dt>Subtotal</dt><dd>{money(lineSubtotal)}</dd></div>{effectiveCostPlusPercent > 0 && <><div><dt>Cost plus</dt><dd>{effectiveCostPlusPercent}%</dd></div><div><dt>Cost plus fee</dt><dd>{money(costPlus)}</dd></div></>}{discountAmount > 0 && <div><dt><label htmlFor="standard-discount">Discount</label></dt><dd><div className={s.adjustment}><span>$</span><input id="standard-discount" inputMode="decimal" value={discount} onChange={event => setDiscount(event.target.value)}/></div></dd></div>}{taxPercent > 0 && <div><dt><label htmlFor="standard-tax">Sales tax</label><div className={`${s.adjustment} ${s.taxInput}`} title="Inherited from the accepted Estimate"><input id="standard-tax" inputMode="decimal" value={taxRate} disabled/><span>%</span></div></dt><dd>{money(tax)}</dd></div>}<div className={s.total}><dt>Total</dt><dd>{money(total)}</dd></div></dl></div>
          </section>
          <section id="standard-invoice-note" className={s.textCard}><h2>Public note</h2><textarea aria-label="Public note" rows={3} value={note} onChange={event => setNote(event.target.value)}/></section>
          <section id="standard-invoice-payments" className={s.textCard}><h2>Payments</h2><p className={s.muted}>No payments recorded.</p></section>
          <section id="standard-invoice-attachments" className={s.textCard}><h2>Attachments</h2><p className={s.muted}>No attachments.</p></section>
          <section id="standard-invoice-terms" className={s.textCard}><h2>Terms &amp; Conditions</h2><textarea aria-label="Terms and conditions" rows={3} value={terms} onChange={event => setTerms(event.target.value)}/></section>
        </div>
      </div>
    </div>
    {previewMode && <StandardInvoicePreview mode={previewMode} invoice={currentInvoice()} estimateId={estimateId} visibility={customerVisibility} onClose={() => setPreviewMode(null)}/>} 
  </div>, document.body)
}
