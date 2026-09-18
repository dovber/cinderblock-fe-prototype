import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileText, Link2, LockKeyhole, Printer, X } from 'lucide-react'
import type { RetainageReleaseInvoice } from '../../shared/invoice-creation'
import { acquireTopSurface } from '../../shared/ui'
import s from './ProgressInvoicePreview.module.css'

type PreviewMode = 'pdf' | 'web'
type Props = { mode: PreviewMode; invoice: RetainageReleaseInvoice; onClose: () => void }
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const date = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))

function MerchantHeader() {
  return <header className={s.merchantHeader}><div className={s.merchantMark} aria-label="Decked in Shade"><strong>DS</strong><span>DECKED IN SHADE</span></div><div><strong>Decked in Shade</strong><span>3511 West Commercial Boulevard</span><span>Fort Lauderdale, FL 33309</span><span>dov+decking@cinderblock.com</span><span>(786) 512-9336</span></div></header>
}
function Details({ invoice }: { invoice: RetainageReleaseInvoice }) {
  return <section className={s.details}><div><span>CUSTOMER</span><strong>Standard Charter Customer</strong><p>4508 Worthington Drive, Eureka, CA 95503</p><span>JOB #1004</span><strong>Kitchen Installation</strong><p>4508 Worthington Drive, Eureka, CA 95503</p>{invoice.poNumber && <><span>PO NUMBER</span><strong>{invoice.poNumber}</strong></>}{invoice.customerReference && <><span>CUSTOMER REFERENCE</span><strong>{invoice.customerReference}</strong></>}</div><div><span>DATE</span><strong>{date(invoice.invoiceDate)}</strong><span>DUE</span><strong>{date(invoice.dueDate)}</strong></div></section>
}
function ReleaseAmount({ invoice }: { invoice: RetainageReleaseInvoice }) {
  const estimateId = invoice.estimateId ?? '1008'
  return <section className={s.retainageCustomerContent} aria-labelledby="customer-retainage-release"><h2 id="customer-retainage-release">RETAINAGE RELEASE</h2><div><div><strong>Retainage release</strong><span>Estimate #{estimateId}</span></div><strong>{money(invoice.amount)}</strong></div></section>
}
function Totals({ invoice, compact = false }: { invoice: RetainageReleaseInvoice; compact?: boolean }) {
  const paid = Math.max(0, Math.min(invoice.amountPaid ?? 0, invoice.amount))
  const balance = Math.max(0, invoice.amount - paid)
  return <dl className={`${s.previewTotals} ${compact ? s.compactTotals : ''}`}><div className={s.previewTotal}><dt>Total</dt><dd>{money(invoice.amount)}</dd></div>{paid > 0 && <div className={s.paid}><dt>Amount Paid</dt><dd>−{money(paid)}</dd></div>}<div className={s.balance}><dt>Balance Due</dt><dd>{money(balance)}</dd></div></dl>
}
function PaymentHistory({ invoice }: { invoice: RetainageReleaseInvoice }) {
  const paid = invoice.amountPaid ?? 0
  return <section className={s.paymentHistory}><h2>PAYMENT HISTORY</h2><div><span>DATE</span><span>METHOD</span><span>REFERENCE</span><span>AMOUNT</span></div>{paid > 0 ? <div className={s.paymentRow}><span>{date(invoice.invoiceDate)}</span><span>Card</span><span>Mock payment</span><strong>{money(paid)}</strong></div> : <p>No payments recorded.</p>}</section>
}
function PdfPreview({ invoice }: { invoice: RetainageReleaseInvoice }) {
  const estimateId = invoice.estimateId ?? '1008'
  return <div className={s.pdfCanvas}><article className={s.pdfPage} aria-label="Retainage invoice PDF-style preview page 1"><MerchantHeader/><section className={s.documentTitle}><div><h1>Invoice</h1><p>#{invoice.id}</p><p><Link2 size={13}/>Linked to <strong>Estimate #{estimateId}</strong></p></div><span className={s.documentStatus}>{invoice.status}</span></section><div className={s.paymentStrip}><button type="button">Pay invoice</button><span>go.cinderblock.com/invoice-{invoice.id}</span><i aria-label="QR code preview"/></div><Details invoice={invoice}/><ReleaseAmount invoice={invoice}/><Totals invoice={invoice}/><footer className={s.pageFooter}><span>Page 1 of 2</span><span>Invoice {invoice.id}</span></footer></article><article className={s.pdfPage} aria-label="Retainage invoice PDF-style preview page 2"><section className={s.printBox}><h2>NOTE</h2><p>{invoice.note || 'Thank you for your business.'}</p></section><section className={s.printBox}><h2>TERMS &amp; CONDITIONS</h2><p>{invoice.terms || 'Payment is due on the date shown on this invoice.'}</p></section><PaymentHistory invoice={invoice}/><footer className={s.pageFooter}><span>Page 2 of 2</span><span>Invoice {invoice.id}</span></footer></article></div>
}
function WebPreview({ invoice }: { invoice: RetainageReleaseInvoice }) {
  const paid = Math.max(0, Math.min(invoice.amountPaid ?? 0, invoice.amount))
  const balance = Math.max(0, invoice.amount - paid)
  const estimateId = invoice.estimateId ?? '1008'
  return <div className={s.webCanvas}><article className={s.webSheet} aria-label="Retainage invoice customer web preview"><MerchantHeader/><section className={s.webTitle}><div><h1>Invoice</h1><p>#{invoice.id}</p><p><Link2 size={14}/>Linked to&nbsp; · &nbsp;<strong>Estimate #{estimateId}</strong></p></div><div className={s.documentTools}><span><Printer size={20}/>Print</span><span><Download size={20}/>PDF</span></div></section><section className={s.amountBanner}><div><strong>{money(balance)}</strong><p>of {money(invoice.amount)} total</p></div><div><button type="button">Pay Now</button><span><LockKeyhole size={13}/>Secured by Stripe</span></div></section><Details invoice={invoice}/><ReleaseAmount invoice={invoice}/><Totals invoice={invoice} compact/><section className={s.webNote}><h2>NOTE</h2><p>{invoice.note || 'Thank you for your business.'}</p></section><details className={s.webTerms}><summary>TERMS &amp; CONDITIONS</summary><p>{invoice.terms}</p></details><PaymentHistory invoice={invoice}/></article><footer className={s.poweredBy}><FileText size={16}/><span>Powered by <strong>Cinderblock</strong></span><small>© 2026 Cinderblock Inc.</small><div><span>Terms of Service</span><i/><span>Privacy Policy</span></div></footer></div>
}
export function RetainageInvoicePreview({ mode, invoice, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => { const release = acquireTopSurface(surface.current!, () => closeRef.current()); closeButton.current?.focus(); return release }, [])
  return createPortal(<div ref={surface} className={s.preview} role="dialog" aria-modal="true" aria-label={mode === 'pdf' ? 'PDF-style retainage invoice preview' : 'Customer web retainage invoice preview'} tabIndex={-1}><div className={s.previewChrome}><span>{mode === 'pdf' ? 'PDF-style preview' : 'Customer web preview'}</span><button ref={closeButton} type="button" onClick={onClose}><X size={18}/>Close preview</button></div>{mode === 'pdf' ? <PdfPreview invoice={invoice}/> : <WebPreview invoice={invoice}/>}</div>, document.body)
}
