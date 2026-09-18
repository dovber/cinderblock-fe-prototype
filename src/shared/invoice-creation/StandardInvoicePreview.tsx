import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileText, Link2, LockKeyhole, Printer, X } from 'lucide-react'
import { acquireTopSurface } from '../ui'
import type { StandardCustomerVisibility, StandardInvoice } from './CopyInvoiceEditor'
import s from './StandardInvoicePreview.module.css'

export type StandardPreviewMode = 'pdf' | 'web'
type Props = { mode: StandardPreviewMode; invoice: StandardInvoice; estimateId: string; visibility: StandardCustomerVisibility; onClose: () => void }
const number = (value: string) => Number(value.replace(/[$,\s]/g, '')) || 0
const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const date = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))

function CustomerDocument({ invoice, estimateId, visibility, web }: Omit<Props, 'mode' | 'onClose'> & { web: boolean }) {
  const amounts = invoice.lines.map(line => number(line.price) * number(line.qty))
  const subtotal = amounts.reduce((total, value) => total + value, 0)
  const discount = Math.min(number(invoice.discount), subtotal)
  const tax = Math.max(0, subtotal - discount) * Math.min(100, number(invoice.taxRate)) / 100
  const total = subtotal - discount + tax
  return <article className={web ? s.webSheet : s.pdfSheet} aria-label={web ? 'Standard invoice customer web preview' : 'Standard invoice PDF-style preview'}>
    <header className={s.merchant}><div className={s.mark}><strong>DS</strong><span>DECKED IN SHADE</span></div><div><strong>Decked in Shade</strong><span>3511 West Commercial Boulevard</span><span>Fort Lauderdale, FL 33309</span><span>dov+decking@cinderblock.com</span><span>(786) 512-9336</span></div></header>
    <section className={s.title}><div><h1>Invoice</h1><p>#{invoice.id}</p><p><Link2 size={14}/>Linked to · <strong>Estimate #{estimateId}</strong></p></div>{web && <div className={s.tools}><span><Printer size={20}/>Print</span><span><Download size={20}/>PDF</span></div>}</section>
    {web && <section className={s.banner}><div><strong>{money(total)}</strong><p>of {money(total)} total</p></div><div><button>Pay Now</button><span><LockKeyhole size={13}/>Secured by Stripe</span></div></section>}
    <section className={s.details}><div><span>CUSTOMER</span><strong>Standard Charter Customer</strong><p>4508 Worthington Drive, Eureka, CA 95503</p><span>JOB #1004</span><strong>Kitchen Installation</strong></div><div><span>DATE</span><strong>{date(invoice.invoiceDate)}</strong><span>DUE</span><strong>{date(invoice.dueDate)}</strong></div></section>
    <div className={s.tableWrap}><table><thead><tr><th>Item name</th>{visibility.price && <th>Price</th>}{visibility.qty && <th>Qty</th>}{visibility.amount && <th>Amount</th>}</tr></thead><tbody>{invoice.lines.map((line, index) => <tr key={line.id}><td><strong>{line.name}</strong>{line.description && <span>{line.description}</span>}</td>{visibility.price && <td>{money(number(line.price))}</td>}{visibility.qty && <td>{line.qty}</td>}{visibility.amount && <td>{money(amounts[index])}</td>}</tr>)}</tbody></table></div>
    <dl className={s.totals}><div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>{discount > 0 && <div><dt>Discount</dt><dd>−{money(discount)}</dd></div>}<div><dt>Tax ({number(invoice.taxRate)}%)</dt><dd>{money(tax)}</dd></div><div className={s.total}><dt>Total</dt><dd>{money(total)}</dd></div></dl>
    <section className={s.note}><h2>NOTE</h2><p>{invoice.note}</p></section>
    <section className={s.note}><h2>TERMS &amp; CONDITIONS</h2><p>{invoice.terms}</p></section>
  </article>
}

export function StandardInvoicePreview({ mode, invoice, estimateId, visibility, onClose }: Props) {
  const surface = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const release = acquireTopSurface(surface.current!, () => closeRef.current())
    closeButton.current?.focus()
    return release
  }, [])
  return createPortal(<div ref={surface} className={s.preview} role="dialog" aria-modal="true" aria-label={mode === 'pdf' ? 'PDF-style standard invoice preview' : 'Customer web standard invoice preview'} tabIndex={-1}>
    <div className={s.chrome}><span>{mode === 'pdf' ? 'PDF-style preview' : 'Customer web preview'}</span><button ref={closeButton} onClick={onClose}><X size={18}/>Close preview</button></div>
    <main className={mode === 'pdf' ? s.pdfCanvas : s.webCanvas}><CustomerDocument invoice={invoice} estimateId={estimateId} visibility={visibility} web={mode === 'web'}/></main>
    {mode === 'web' && <footer className={s.powered}><FileText size={16}/>Powered by <strong>Cinderblock</strong></footer>}
  </div>, document.body)
}
