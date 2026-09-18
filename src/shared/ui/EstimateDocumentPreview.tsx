import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileText, Link2, Printer, X } from 'lucide-react'
import { acquireTopSurface } from './inert'
import s from './EstimateDocumentPreview.module.css'

export type EstimateDocumentPreviewMode = 'pdf' | 'web'

export type EstimateDocumentItem = {
  id: string
  name: string
  description?: string
  price: number
  qty: number
  amount: number
}

export type EstimateFamilyDocument = {
  type: 'Estimate' | 'Change Order'
  number: string
  linkedEstimateId?: string
  status: string
  date: string
  expirationDate?: string
  poNumber?: string
  customerReference?: string
  items: EstimateDocumentItem[]
  subtotal: number
  discount?: number
  costPlusPercent?: number
  costPlusFee?: number
  taxRate?: number
  tax?: number
  total: number
  publicNote?: string
  attachments?: string[]
  terms?: string
  acceptedAt?: string
  acceptedBy?: string
  version?: number
}

type Props = { mode: EstimateDocumentPreviewMode; document: EstimateFamilyDocument; onClose: () => void }
const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const date = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))

function MerchantHeader() {
  return <header className={s.merchant}><div className={s.mark}><strong>DS</strong><span>DECKED IN SHADE</span></div><div><strong>Decked in Shade</strong><span>3511 West Commercial Boulevard</span><span>Fort Lauderdale, FL 33309</span><span>dov+decking@cinderblock.com</span><span>(786) 512-9336</span></div></header>
}

function DocumentTitle({ document, web }: { document: EstimateFamilyDocument; web: boolean }) {
  return <section className={s.title}><div><h1>{document.type}</h1><p>#{document.number}</p>{document.linkedEstimateId && <p className={s.linked}><Link2 size={14}/>Linked to · <strong>Estimate #{document.linkedEstimateId}</strong></p>}</div>{web ? <div className={s.tools}><span><Printer size={20}/>Print</span><span><Download size={20}/>PDF</span></div> : <span className={s.status}>{document.status}</span>}</section>
}

function StatusBanner({ document }: { document: EstimateFamilyDocument }) {
  const status = document.status.toLowerCase()
  const accepted = status === 'accepted'
  const awaiting = status === 'pending'
  return <section className={`${s.banner} ${accepted ? s.acceptedBanner : awaiting ? s.pendingBanner : s.neutralBanner}`}><div><strong>{money(document.total)}</strong><p>{document.type} total</p></div>{accepted ? <span className={s.acceptedPill}>Signed &amp; Accepted</span> : awaiting ? <div className={s.customerActions}><button type="button" className={s.decline}>Decline</button><button type="button">Accept</button></div> : <span className={s.statusPill}>{document.status}</span>}</section>
}

function Details({ document }: { document: EstimateFamilyDocument }) {
  return <section className={s.details}><div><span>CUSTOMER</span><strong>Standard Charter Customer</strong><p>4508 Worthington Drive, Eureka, CA 95503</p><span>JOB #1004</span><strong>Kitchen Installation</strong><p>4508 Worthington Drive, Eureka, CA 95503</p>{document.poNumber && <><span>PO NUMBER</span><strong>{document.poNumber}</strong></>}{document.customerReference && <><span>CUSTOMER REFERENCE</span><strong>{document.customerReference}</strong></>}</div><div><span>DATE</span><strong>{date(document.date)}</strong>{document.expirationDate && <><span>EXPIRY</span><strong>{date(document.expirationDate)}</strong></>}</div></section>
}

function Items({ document }: { document: EstimateFamilyDocument }) {
  return <div className={s.tableWrap}><table><thead><tr><th>Item name</th><th>Price</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{document.items.map(item => <tr key={item.id}><td><strong>{item.name}</strong>{item.description && <span>{item.description}</span>}</td><td>{money(item.price)}</td><td>{item.qty}</td><td>{money(item.amount)}</td></tr>)}</tbody></table></div>
}

function Totals({ document }: { document: EstimateFamilyDocument }) {
  const discount = document.discount ?? 0
  const costPlus = document.costPlusFee ?? 0
  const tax = document.tax ?? 0
  return <dl className={s.totals}><div><dt>Subtotal</dt><dd>{money(document.subtotal)}</dd></div>{costPlus !== 0 && <><div><dt>Cost plus</dt><dd>{document.costPlusPercent}%</dd></div><div><dt>Cost plus fee</dt><dd>{money(costPlus)}</dd></div></>}{discount !== 0 && <div><dt>Discount</dt><dd>{discount > 0 ? `−${money(discount)}` : `+${money(Math.abs(discount))}`}</dd></div>}{tax !== 0 && <div><dt>Tax{document.taxRate ? ` (${document.taxRate}%)` : ''}</dt><dd>{money(tax)}</dd></div>}<div className={s.total}><dt>Total</dt><dd>{money(document.total)}</dd></div></dl>
}

function SupportingContent({ document, web }: { document: EstimateFamilyDocument; web: boolean }) {
  return <>{document.publicNote && <section className={web ? s.webBox : s.printBox}><h2>NOTE</h2><p>{document.publicNote}</p></section>}{document.attachments && document.attachments.length > 0 && <section className={web ? s.webBox : s.printBox}><h2>ATTACHMENTS</h2><ul>{document.attachments.map(attachment => <li key={attachment}>{attachment}</li>)}</ul></section>}{document.terms && (web ? <details className={s.webTerms}><summary>TERMS &amp; CONDITIONS</summary><p>{document.terms}</p></details> : <section className={s.printBox}><h2>TERMS &amp; CONDITIONS</h2><p>{document.terms}</p></section>)}{document.status === 'Accepted' && document.acceptedAt && <section className={s.acceptance}><h2>ACCEPTANCE</h2><span>Signed &amp; accepted</span><strong>{document.acceptedBy ?? 'Customer'}</strong><p>{date(document.acceptedAt)}{document.version && ` · Version ${document.version}`}</p></section>}</>
}

function PdfDocument({ document }: { document: EstimateFamilyDocument }) {
  const awaiting = document.status === 'Pending'
  const accepted = document.status === 'Accepted'
  return <div className={s.pdfCanvas}><article className={s.pdfPage} aria-label={`${document.type} PDF-style preview page 1`}><MerchantHeader/><DocumentTitle document={document} web={false}/><div className={s.acceptStrip}>{awaiting ? <button type="button">Accept {document.type.toLowerCase()}</button> : <span className={accepted ? s.acceptedPill : s.statusPill}>{accepted ? 'Signed & Accepted' : document.status}</span>}<span>go.cinderblock.com/{document.type === 'Estimate' ? 'estimate' : 'change-order'}-{document.number}</span><i aria-label="QR code preview"/></div><Details document={document}/><Items document={document}/><Totals document={document}/><footer className={s.pageFooter}><span>Page 1 of 2</span><span>{document.type} {document.number}</span></footer></article><article className={s.pdfPage} aria-label={`${document.type} PDF-style preview page 2`}><SupportingContent document={document} web={false}/><footer className={s.pageFooter}><span>Page 2 of 2</span><span>{document.type} {document.number}</span></footer></article></div>
}

function WebDocument({ document }: { document: EstimateFamilyDocument }) {
  return <div className={s.webCanvas}><article className={s.webSheet} aria-label={`${document.type} customer web preview`}><MerchantHeader/><DocumentTitle document={document} web/><StatusBanner document={document}/><Details document={document}/><Items document={document}/><Totals document={document}/><SupportingContent document={document} web/></article><footer className={s.powered}><FileText size={16}/>Powered by <strong>Cinderblock</strong></footer></div>
}

export function EstimateDocumentPreview({ mode, document, onClose }: Props) {
  const surface = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const release = acquireTopSurface(surface.current!, () => closeRef.current())
    closeButton.current?.focus()
    return release
  }, [])
  return createPortal(<div ref={surface} className={s.preview} role="dialog" aria-modal="true" aria-label={mode === 'pdf' ? `PDF-style ${document.type} preview` : `${document.type} customer web preview`} tabIndex={-1}><div className={s.chrome}><span>{mode === 'pdf' ? 'PDF-style preview' : 'Customer web preview'}</span><button ref={closeButton} type="button" onClick={onClose}><X size={18}/>Close preview</button></div>{mode === 'pdf' ? <PdfDocument document={document}/> : <WebDocument document={document}/>}</div>, globalThis.document.body)
}
