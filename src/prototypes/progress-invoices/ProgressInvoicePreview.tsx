import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileText, Link2, LockKeyhole, Printer, X } from 'lucide-react'
import { buildInvoiceAllocationFacts, completion, invoiceCostPlusAllocation, invoiceMilestoneName, invoiceTaxFromAllocations, money, percent, rounded, sum, type EstimateLine, type InvoiceColumnVisibility, type ProgressInvoice } from './model'
import { acquireTopSurface, EmptyValue } from '../../shared/ui'
import s from './ProgressInvoicePreview.module.css'

export type PreviewMode = 'pdf' | 'web'
type Props = { contractValue?: number; contractPreviouslyBilled?: number; mode: PreviewMode; invoice: ProgressInvoice; lines: EstimateLine[]; priorInvoices?: ProgressInvoice[]; retainageEnabled?: boolean; visibility?: InvoiceColumnVisibility; onClose: () => void }
const defaultVisibility: InvoiceColumnVisibility = { contract: true, previous: true, current: true, completion: true, sku: false, code: false }

const date = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))

function MerchantHeader() {
  return <header className={s.merchantHeader}>
    <div className={s.merchantMark} aria-label="Decked in Shade"><strong>DS</strong><span>DECKED IN SHADE</span></div>
    <div><strong>Decked in Shade</strong><span>3511 West Commercial Boulevard</span><span>Fort Lauderdale, FL 33309</span><span>dov+decking@cinderblock.com</span><span>(786) 512-9336</span></div>
  </header>
}

const lineDescriptions: Record<string, string> = {
  faucet: 'Supply and install two-handle kitchen faucets, including connections and final fixture testing.',
  drywall: 'Hang, tape, finish, and sand drywall in designated kitchen work areas.',
  flooring: 'Install finished flooring with underlayment, trim, and jobsite cleanup.',
}

function ProgressTable({ invoice, lines, tone, showAll = true, contractValue, visibility = defaultVisibility }: { invoice: ProgressInvoice; lines: EstimateLine[]; tone: 'pdf' | 'web'; showAll?: boolean; contractValue?: number; visibility?: InvoiceColumnVisibility }) {
  const grouped = lines.some(line => line.sourceId && line.sourceId !== 'estimate')
  const complete = sum(lines.map(line => line.previous)) + sum(invoice.lineAmounts) >= (contractValue ?? sum(lines.map(line => line.contract))) - .01
  const offset = lines.some(line => line.kind === 'superseded' && line.previous > 0)
  const asterisk = (line: EstimateLine, current: number) => complete && offset && line.kind === 'active' && line.sourceId !== 'estimate' && completion(line, current) < 99.999
  const columnCount = 2 + [visibility.contract, visibility.previous, visibility.current, visibility.completion].filter(Boolean).length
  const columns = <tr><th>Item name</th><th>Qty</th>{visibility.contract && <th>Contract Amount</th>}{visibility.previous && <th>Previously Billed</th>}{visibility.current && <th>This Invoice</th>}{visibility.completion && <th>% Complete</th>}</tr>
  const visible = lines.map((line, index) => ({ line, index, current: invoice.lineAmounts[index] ?? 0 })).filter(({ current }) => showAll || current > 0)
  return <><div className={`${s.tableWrap} ${s[tone]}`}><table className={s.progressTable}>
    <caption>Progress invoice line items</caption>
    {!grouped && <thead>{columns}</thead>}
    <tbody>{visible.map(({ line, index, current }, position) => <Fragment key={line.id}>
      {grouped && (position === 0 || visible[position - 1].line.sourceId !== line.sourceId) && <><tr className={s.sourceGroup}><th colSpan={columnCount}>{line.sourceLabel}</th></tr>{columns}</>}
      <tr className={current > 0 ? undefined : s.notBilled}><td><strong style={line.kind === 'removal' ? { textDecoration: 'line-through' } : undefined}>{line.name}</strong><span>{invoice.descriptions[index] || line.description || lineDescriptions[line.id]}</span>{visibility.sku && line.sku && <span>SKU: {line.sku}</span>}{visibility.code && line.code && <span>Item code: {line.code}</span>}{line.modifiedBy && <span>Removed by {line.modifiedBy}</span>}</td><td>{line.qty}</td>{visibility.contract && <td>{money(line.contract)}</td>}{visibility.previous && <td>{line.kind === 'removal' ? <EmptyValue/> : money(line.previous)}</td>}{visibility.current && <td>{line.kind === 'removal' ? <EmptyValue/> : money(current)}</td>}{visibility.completion && <td>{line.kind === 'removal' ? <EmptyValue/> : `${percent(completion(line, current))}${asterisk(line, current) ? '*' : ''}`}</td>}</tr>
    </Fragment>)}</tbody>
  </table></div>{visible.some(({ line, current }) => asterisk(line, current)) && <p className={s.asteriskNote}>* This percentage is offset by billing previously applied to scope removed by a Change Order.</p>}</>
}
function CustomerContractSummary({ invoice, lines, contractValue, contractPreviouslyBilled }: Pick<Props, 'invoice' | 'lines' | 'contractValue' | 'contractPreviouslyBilled'>) {
  const contract = contractValue ?? sum(lines.map(line => line.contract))
  const billed = (contractPreviouslyBilled ?? sum(lines.map(line => line.previous))) + sum(invoice.lineAmounts)
  const taxApplies = invoiceTaxFromAllocations(invoice.allocationFacts ?? buildInvoiceAllocationFacts(lines, invoice.lineAmounts, invoice.discount, invoice.taxRate)) > 0
  const processingFeesApply = (invoice.processingFee ?? 0) > 0
  const qualifier = taxApplies && processingFeesApply
    ? 'before tax and processing fees'
    : taxApplies
      ? 'before tax'
      : processingFeesApply
        ? 'before processing fees'
        : ''
  return <section className={s.contractSummary} aria-label="Contract progress summary"><h2>Contract progress{qualifier && <span className={s.contractSummaryQualifier}> ({qualifier})</span>}</h2><dl><div><dt>Gross contract scope</dt><dd>{money(contract)}</dd></div><div><dt>Billed so far</dt><dd>{money(billed)}</dd></div><div><dt>% Complete</dt><dd>{percent(contract ? billed / contract * 100 : 0)}</dd></div></dl></section>
}

function Details({ invoice }: { invoice: ProgressInvoice }) {
  return <section className={s.details}>
    <div><span>CUSTOMER</span><strong>Standard Charter Customer</strong><p>4508 Worthington Drive, Eureka, CA 95503</p><span>JOB #1004</span><strong>Kitchen Installation</strong><p>4508 Worthington Drive, Eureka, CA 95503</p></div>
    <div><span>DATE</span><strong>{date(invoice.invoiceDate)}</strong><span>DUE</span><strong>{date(invoice.dueDate)}</strong></div>
  </section>
}

function invoiceTotal(invoice: ProgressInvoice, lines: EstimateLine[], retainageEnabled = false) {
  const subtotal = rounded(sum(invoice.lineAmounts))
  const totalAfterDiscount = Math.max(0, subtotal - invoice.discount)
  const retainage = retainageEnabled ? rounded(totalAfterDiscount * (invoice.retainagePercent ?? 0) / 100) : 0
  const tax = invoiceTaxFromAllocations(invoice.allocationFacts ?? buildInvoiceAllocationFacts(lines, invoice.lineAmounts, invoice.discount, invoice.taxRate))
  const taxCredit = Math.min(invoice.taxCreditApplied ?? 0, tax)
  return rounded(totalAfterDiscount + tax - retainage - taxCredit)
}

function InvoiceTotals({ invoice, lines, compact = false, retainageEnabled = false }: { invoice: ProgressInvoice; lines: EstimateLine[]; compact?: boolean; retainageEnabled?: boolean }) {
  const lineSubtotal = rounded(sum(invoice.lineAmounts))
  const subtotal = lineSubtotal
  const retainageBase = Math.max(0, subtotal - invoice.discount)
  const retainage = retainageEnabled ? rounded(retainageBase * (invoice.retainagePercent ?? 0) / 100) : 0
  const tax = invoiceTaxFromAllocations(invoice.allocationFacts ?? buildInvoiceAllocationFacts(lines, invoice.lineAmounts, invoice.discount, invoice.taxRate))
  const taxCredit = Math.min(invoice.taxCreditApplied ?? 0, tax)
  const costPlus = invoiceCostPlusAllocation(lines, invoice.lineAmounts)
  const total = invoiceTotal(invoice, lines, retainageEnabled)
  const paid = invoice.status === 'Paid' ? total : invoice.status === 'Partially paid' ? rounded(total * .25) : 0
  const balance = rounded(total - paid)
  return <dl className={`${s.previewTotals} ${compact ? s.compactTotals : ''}`}>
    <div><dt>{retainageEnabled ? 'Subtotal billed' : 'Subtotal'}</dt><dd>{money(subtotal)}</dd></div>
    {invoice.costPlus > 0 && <><div><dt>Cost plus</dt><dd>{percent(invoice.costPlus)}</dd></div><div><dt>Cost plus fee</dt><dd>{money(costPlus)}</dd></div></>}
    {invoice.discount > 0 && <div><dt>Discount</dt><dd>−{money(invoice.discount)}</dd></div>}
    {retainageEnabled && (invoice.retainagePercent ?? 0) > 0 && <div><dt>Retainage ({invoice.retainagePercent}%)</dt><dd>−{money(retainage)}</dd></div>}
    {invoice.taxRate > 0 && <div><dt>Tax ({invoice.taxRate}%)</dt><dd>{money(tax)}</dd></div>}
    {taxCredit > 0 && <div><dt>Tax credit balance</dt><dd>−{money(taxCredit)}</dd></div>}
    <div className={s.previewTotal}><dt>{retainageEnabled ? 'Total due' : 'Total'}</dt><dd>{money(total)}</dd></div>
    {paid > 0 && <div className={s.paid}><dt>Amount paid</dt><dd>−{money(paid)}</dd></div>}
    <div className={s.balance}><dt>Balance Due</dt><dd>{money(balance)}</dd></div>
  </dl>
}

function InvoiceHistory({ invoices = [], lines, retainageEnabled = false }: { invoices?: ProgressInvoice[]; lines: EstimateLine[]; retainageEnabled?: boolean }) {
  if (!invoices.length) return null
  return <section className={s.invoiceHistory} aria-labelledby="invoice-history-title">
    <h2 id="invoice-history-title">Invoice history</h2>
    <div className={s.invoiceHistoryTable}><table>
      <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>{invoices.map(priorInvoice => {
        const historicalLines = priorInvoice.lineSnapshot ?? lines
        return <tr key={priorInvoice.id}><td>Invoice #{priorInvoice.id}</td><td>{date(priorInvoice.invoiceDate)}</td><td>{money(invoiceTotal(priorInvoice, historicalLines, retainageEnabled))}</td><td>{priorInvoice.status}</td></tr>
      })}</tbody>
    </table></div>
  </section>
}

function PaymentHistory({ invoice }: { invoice: ProgressInvoice }) {
  const hasPayment = invoice.status === 'Paid' || invoice.status === 'Partially paid'
  return <section className={s.paymentHistory}><h2>PAYMENT HISTORY</h2><div><span>DATE</span><span>METHOD</span><span>REFERENCE</span><span>AMOUNT</span></div>{hasPayment ? <div className={s.paymentRow}><span>{date(invoice.invoiceDate)}</span><span>Card</span><span>Mock payment</span><strong>{invoice.status === 'Paid' ? 'Paid in full' : 'Partial payment'}</strong></div> : <p>No payments recorded.</p>}</section>
}

function PdfPreview({ invoice, lines, priorInvoices, retainageEnabled, contractValue, contractPreviouslyBilled, visibility }: Omit<Props, 'mode' | 'onClose'>) {
  const milestoneName = invoiceMilestoneName(invoice)
  return <div className={s.pdfCanvas}>
    <article className={s.pdfPage} aria-label="Progress invoice PDF-style preview page 1">
      <MerchantHeader/>
      <section className={s.documentTitle}><div><h1>Invoice</h1><p>#{invoice.id}</p>{milestoneName && <p className={s.milestoneName}>{milestoneName}</p>}<p><Link2 size={13}/>Linked to <strong>Estimate 1008</strong></p></div><span className={s.documentStatus}>{invoice.status}</span></section>
      <div className={s.paymentStrip}><button type="button">Pay invoice</button><span>go.cinderblock.com/progress-invoice-{invoice.id}</span><i aria-label="QR code preview"/></div>
      <Details invoice={invoice}/>
      <ProgressTable invoice={invoice} lines={lines} tone="pdf" contractValue={contractValue} visibility={visibility}/>
      <InvoiceTotals invoice={invoice} lines={lines} retainageEnabled={retainageEnabled}/><CustomerContractSummary invoice={invoice} lines={lines} contractValue={contractValue} contractPreviouslyBilled={contractPreviouslyBilled}/>
      <footer className={s.pageFooter}><span>Page 1 of 2</span><span>Invoice {invoice.id}</span></footer>
    </article>
    <article className={s.pdfPage} aria-label="Progress invoice PDF-style preview page 2">
      <section className={s.printBox}><h2>NOTE</h2><p>{invoice.note || 'Thank you for your business.'}</p></section>
      <section className={s.printBox}><h2>TERMS &amp; CONDITIONS</h2><p>{invoice.terms || 'Payment is due according to the terms shown on this invoice.'}</p><h3>Progress billing</h3><p>This invoice reflects work billed against the linked estimate. Contract progress is shown for context.</p></section>
      <PaymentHistory invoice={invoice}/>
      <InvoiceHistory invoices={priorInvoices} lines={lines} retainageEnabled={retainageEnabled}/>
      <footer className={s.pageFooter}><span>Page 2 of 2</span><span>Invoice {invoice.id}</span></footer>
    </article>
  </div>
}

function WebPreview({ invoice, lines, priorInvoices, retainageEnabled, contractValue, contractPreviouslyBilled, visibility }: Omit<Props, 'mode' | 'onClose'>) {
  const [hideUnbilled, setHideUnbilled] = useState(false)
  const hasUnbilledContractItem = lines.some((line, index) => line.kind !== 'removal' && rounded(invoice.lineAmounts[index] ?? 0) === 0)
  const lineSubtotal = rounded(sum(invoice.lineAmounts))
  const subtotal = lineSubtotal
  const retainageBase = Math.max(0, subtotal - invoice.discount)
  const retained = retainageEnabled ? rounded(retainageBase * (invoice.retainagePercent ?? 0) / 100) : 0
  const tax = invoiceTaxFromAllocations(invoice.allocationFacts ?? buildInvoiceAllocationFacts(lines, invoice.lineAmounts, invoice.discount, invoice.taxRate))
  const total = rounded(retainageBase + tax - retained - Math.min(invoice.taxCreditApplied ?? 0, tax))
  const paid = invoice.status === 'Paid' ? total : invoice.status === 'Partially paid' ? rounded(total * .25) : 0
  const balance = rounded(total - paid)
  const milestoneName = invoiceMilestoneName(invoice)
  return <div className={s.webCanvas}>
    <article className={s.webSheet} aria-label="Progress invoice customer web preview">
      <MerchantHeader/>
      <section className={s.webTitle}><div><h1>Invoice</h1><p>#{invoice.id}</p>{milestoneName && <p className={s.milestoneName}>{milestoneName}</p>}<p><Link2 size={14}/>Linked to&nbsp; · &nbsp;<strong>Estimate #1008</strong></p></div><div className={s.documentTools}><span><Printer size={20}/>Print</span><span><Download size={20}/>PDF</span></div></section>
      <section className={s.amountBanner}><div><strong>{money(balance)}</strong><p>of {money(total)} total</p></div><div><button type="button">Pay Now</button><span><LockKeyhole size={13}/>Secured by Stripe</span></div></section>
      <Details invoice={invoice}/>
      {hasUnbilledContractItem && <label className={s.contractToggle}><span>Hide items not billed in this invoice</span><input type="checkbox" role="switch" checked={hideUnbilled} onChange={event => setHideUnbilled(event.target.checked)}/><i/></label>}
      <ProgressTable invoice={invoice} lines={lines} tone="web" showAll={!hideUnbilled} contractValue={contractValue} visibility={visibility}/>
      <InvoiceTotals invoice={invoice} lines={lines} compact retainageEnabled={retainageEnabled}/><CustomerContractSummary invoice={invoice} lines={lines} contractValue={contractValue} contractPreviouslyBilled={contractPreviouslyBilled}/>
      <section className={s.webNote}><h2>NOTE</h2><p>{invoice.note || 'Thank you for your business.'}</p></section>
      <details className={s.webTerms}><summary>TERMS &amp; CONDITIONS</summary><p>{invoice.terms}</p></details>
      <PaymentHistory invoice={invoice}/>
      <InvoiceHistory invoices={priorInvoices} lines={lines} retainageEnabled={retainageEnabled}/>
    </article>
    <footer className={s.poweredBy}><FileText size={16}/><span>Powered by <strong>Cinderblock</strong></span><small>© 2026 Cinderblock Inc.</small><div><span>Terms of Service</span><i/> <span>Privacy Policy</span></div></footer>
  </div>
}

export function ProgressInvoicePreview({ contractValue, contractPreviouslyBilled, mode, invoice, lines, priorInvoices = [], retainageEnabled = false, visibility = invoice.customerVisibility ?? defaultVisibility, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const release = acquireTopSurface(surface.current!, () => closeRef.current())
    closeButton.current?.focus()
    return release
  }, [])
  return createPortal(<div ref={surface} className={s.preview} role="dialog" aria-modal="true" aria-label={mode === 'pdf' ? 'PDF-style progress invoice preview' : 'Customer web progress invoice preview'} tabIndex={-1}>
    <div className={s.previewChrome}><span>{mode === 'pdf' ? 'PDF-style preview' : 'Customer web preview'}</span><button ref={closeButton} type="button" onClick={onClose}><X size={18}/>Close preview</button></div>
    {mode === 'pdf' ? <PdfPreview contractValue={contractValue} contractPreviouslyBilled={contractPreviouslyBilled} invoice={invoice} lines={lines} priorInvoices={priorInvoices} retainageEnabled={retainageEnabled} visibility={visibility}/> : <WebPreview contractValue={contractValue} contractPreviouslyBilled={contractPreviouslyBilled} invoice={invoice} lines={lines} priorInvoices={priorInvoices} retainageEnabled={retainageEnabled} visibility={visibility}/>} 
  </div>, document.body)
}
