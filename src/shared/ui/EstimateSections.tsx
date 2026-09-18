import type { ReactNode } from 'react'
import { CalendarDays, Link2 } from 'lucide-react'
import { EmptyValue, StatusBadge } from './components'
import { LineItemLockIndicator } from './LineItemLockIndicator'
import s from './EstimateSections.module.css'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const percent = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) + '%'
type EstimateItem = { id: string; name: string; qty: number; contract: number }

export function EstimateDetailsSection({ status, linkedInvoices = [], actions, children }: { status: string; linkedInvoices?: { id: string; onOpen: () => void }[]; actions?: ReactNode; children?: ReactNode }) {
  return (
<section className={s.estimateDetails}>
            <div className={s.estimateSectionHeading}><h2>Estimate details</h2><StatusBadge variant="editor" tone={status === 'ACCEPTED' ? 'success' : 'info'}>{status}</StatusBadge></div>
            <div className={s.detailsGrid}>
              <div><span className={s.label}>Customer</span><strong>Standard Charter Customer</strong></div>
              <div><span className={s.label}>Estimate date</span><strong><CalendarDays size={16}/>Tue, September 8 2026</strong></div>
              <div><span className={s.label}>Expiration date</span><strong><CalendarDays size={16}/>Thu, October 8 2026</strong></div>
              <div><span className={s.label}>Job</span><strong><span className={s.jobMarker}/>#1004 Kitchen Installation</strong><p>4508 Worthington Drive, Eureka, CA 95503</p></div>
              <div><span className={s.label}>PO number</span><strong><EmptyValue/></strong></div>
              <div><span className={s.label}>Customer reference</span><strong><EmptyValue/></strong></div>
              <div><span className={s.label}>Salesperson</span><strong>Diana Johnston</strong></div>
              {linkedInvoices.length > 0 && <div className={s.linkedTo}><span className={s.label}>Linked to</span><div className={s.linkedList}>{linkedInvoices.map(invoice => <button key={invoice.id} onClick={invoice.onOpen}><Link2 size={14}/><span>Invoice #{invoice.id}</span></button>)}</div></div>}
            </div>
            {children}
            {actions && <footer className={s.estimateDetailsActions}>{actions}</footer>}
          </section>
  )
}

export function EstimateItemsSection({ lines, draftByLine = [], estimateLocked = false, estimateLockReason, estimateDiscount = 0, contractDiscountPool = estimateDiscount, discountUsed = 0, discountReserved = 0, lineContext }: { lines: EstimateItem[]; lineContext?: (line: EstimateItem) => ReactNode; draftByLine?: number[]; estimateLocked?: boolean; estimateLockReason?: string; estimateDiscount?: number; contractDiscountPool?: number; discountUsed?: number; discountReserved?: number }) {
  const contract = lines.reduce((total, line) => total + line.contract, 0)
  const lineCost = contract * .7
  return (
<section className={s.estimateItemCard} aria-label="Estimate items" data-locked={estimateLocked || undefined}>
            <div className={s.tableOverflow}><table className={s.normalEstimateTable}><thead><tr><th className={s.rowNumber}/><th>Item name</th><th className={s.numeric}>Price</th><th className={s.numeric}>Qty</th><th className={s.numeric}>Amount</th><th className={s.menuColumn}/></tr></thead>
              <tbody>{lines.map((line, index) => <tr key={line.id}><td className={s.rowNumber}>{index + 1}</td><td className={s.estimateItemName}><strong>{line.name}{estimateLocked && estimateLockReason && <LineItemLockIndicator reason={estimateLockReason}/>}</strong><span>Add description</span>{lineContext?.(line)}{draftByLine[index] > 0 && <small>{money(draftByLine[index])} reserved by draft</small>}</td><td className={s.numeric}>{money(line.contract / line.qty)}</td><td className={s.numeric}>{line.qty}</td><td className={s.numeric}>{money(line.contract)}</td><td/></tr>)}</tbody>
            </table></div>
            <div className={s.estimateItemFooter}><div className={s.lineActions}/>
              <dl className={s.normalEstimateTotals}><div><dt>Subtotal</dt><dd>{money(contract)}</dd></div><div><dt>Discount</dt><dd>{estimateDiscount > 0 ? `−${money(estimateDiscount)}` : money(0)}</dd></div>{contractDiscountPool > 0 && (contractDiscountPool !== estimateDiscount || discountUsed > 0 || discountReserved > 0) && <>{contractDiscountPool !== estimateDiscount && <div className={s.discountPoolNote}><dt>Contract discount pool</dt><dd>{money(contractDiscountPool)}</dd></div>}<div className={s.discountPoolNote}><dt>Discount consumed</dt><dd>{money(discountUsed)}</dd></div>{discountReserved > 0 && <div className={s.discountPoolNote}><dt>Reserved by Draft</dt><dd>{money(discountReserved)}</dd></div>}<div className={s.discountPoolNote}><dt>Discount available</dt><dd>{money(Math.max(0, contractDiscountPool - discountUsed - discountReserved))}</dd></div></>}<div><dt>Tax (0%)</dt><dd>{money(0)}</dd></div><div className={s.total}><dt>Total</dt><dd>{money(contract - estimateDiscount)}</dd></div><div className={s.costDivider}><dt>Line items cost</dt><dd>{money(lineCost)}</dd></div><div><dt>Line items total</dt><dd>{money(contract)}</dd></div><div><dt>Discount</dt><dd>{estimateDiscount > 0 ? `−${money(estimateDiscount)}` : money(0)}</dd></div><div><dt>Gross margin</dt><dd>{percent((contract - estimateDiscount - lineCost) / (contract - estimateDiscount) * 100)}</dd></div><div><dt>Gross profit</dt><dd>{money(contract - estimateDiscount - lineCost)}</dd></div></dl>
            </div>
          </section>
  )
}

export function EstimateRetainageSetting({ value, hasHistory = false, onChange }: { value?: number; hasHistory?: boolean; onChange: (value?: number) => void }) {
  return <section className={s.retainageSetting} aria-labelledby="estimate-retainage-label"><div><label id="estimate-retainage-label" htmlFor="estimate-retainage">Retainage</label><div className={s.retainageInput}><input id="estimate-retainage" inputMode="decimal" aria-label="Retainage percentage" value={value ?? ''} placeholder="0" onChange={event => { const next = event.target.value; onChange(next === '' ? undefined : Math.max(0, Math.min(100, Number(next) || 0))) }}/><span>%</span></div></div><p>Retainage percentage for progress invoices</p>{hasHistory && <small>Changes to this field apply to future invoices only. Retainage already withheld remains unchanged.</small>}</section>
}
