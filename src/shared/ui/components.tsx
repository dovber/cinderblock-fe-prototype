import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, ChevronsUpDown, MoreVertical, Search, X } from 'lucide-react'
import s from './ui.module.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'neutral' | 'text'; icon?: ReactNode }
export function Button({ variant = 'primary', icon, children, className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`${s.button} ${s[variant]} ${className}`} {...props}>{icon}{children}</button>
}
export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" aria-label={label} title={label} className={`${s.iconButton} ${className}`} {...props}>{children}</button>
}
export function SplitButton({ children, onClick, onMenuClick, disabled = false, variant = 'primary' }: { children: ReactNode; onClick?: () => void; onMenuClick?: () => void; disabled?: boolean; variant?: ButtonProps['variant'] }) {
  return <div className={s.split}><Button variant={variant} disabled={disabled} onClick={onClick}>{children}</Button><Button variant={variant} disabled={disabled} onClick={onMenuClick} aria-label={`${typeof children === 'string' ? children : 'Action'} options`}><ChevronDown size={16} /></Button></div>
}
export function PageHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <div className={s.pageHeading}><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className={s.actions}>{actions}</div>}</div>
}
export function Card({ title, description, actions, children, className = '' }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`${s.card} ${className}`}>{(title || actions) && <div className={s.cardHeading}><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{actions}</div>}{children}</section>
}
export function MetricCard({ label, count, value, muted }: { label: string; count?: number; value: string; muted?: boolean }) {
  return <div className={s.metric}><div>{label} {count !== undefined && <span>{count}</span>}</div><strong className={muted ? s.muted : ''}>{value}</strong></div>
}
export type StatusTone = 'neutral' | 'pending' | 'success' | 'info'
export function StatusBadge({ children, tone = 'neutral', variant = 'table' }: { children: ReactNode; tone?: StatusTone; variant?: 'table' | 'editor' | 'customer' }) {
  return <span className={`${s.badge} ${s[`tone_${tone}`]} ${s[`badge_${variant}`]}`}>{variant === 'customer' && <span className={s.statusDot} />}{children}</span>
}
export function Avatar({ name, size = 'normal' }: { name: string; size?: 'small' | 'normal' }) {
  return <span className={`${s.avatar} ${size === 'small' ? s.avatarSmall : ''}`} aria-label={name} title={name}>{name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
}
export function Tag({ children, tone = 'teal', onRemove }: { children: ReactNode; tone?: 'teal' | 'red'; onRemove?: () => void }) {
  return <span className={`${s.tag} ${s[`tag_${tone}`]}`}>{children}{onRemove && <button type="button" onClick={onRemove} aria-label={`Remove ${children}`}><X size={13} /></button>}</span>
}
export function ProgressBar({ value, label, overage = 0 }: { value: number; label: string; overage?: number }) {
  const normalizedValue = Math.max(0, Math.min(100, value))
  const normalizedOverage = Math.max(0, overage)
  const total = 100 + normalizedOverage
  return <div className={`${s.progress} ${normalizedOverage > 0 ? s.overInvoicedProgress : ''}`} role="progressbar" aria-label={label} aria-valuetext={label} aria-valuenow={normalizedValue} aria-valuemin={0} aria-valuemax={100}>
    {normalizedOverage > 0 ? <><span style={{ width: `${100 / total * 100}%` }}/><span style={{ width: `${normalizedOverage / total * 100}%` }}/></> : <span style={{ width: `${normalizedValue}%` }}/>}
  </div>
}
export function ContractSummary({ contractValue, totalInvoiced, grossContractScope = contractValue, grossScopeInvoiced = totalInvoiced, reservedByDraft = 0, taxCreditBalance = 0, contractValueDetail, showOverInvoiced = false, retainageWithheld = 0, retainageReleased = 0, onReleaseRetainage, releaseDisabled = false, releaseDisabledReason }: { contractValue: number; totalInvoiced: number; grossContractScope?: number; grossScopeInvoiced?: number; reservedByDraft?: number; taxCreditBalance?: number; contractValueDetail?: ReactNode; showOverInvoiced?: boolean; retainageWithheld?: number; retainageReleased?: number; onReleaseRetainage?: () => void; releaseDisabled?: boolean; releaseDisabledReason?: string }) {
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
  const remaining = Math.max(0, contractValue - totalInvoiced)
  const overInvoiced = showOverInvoiced && totalInvoiced > contractValue
  const overInvoicedAmount = Math.max(0, totalInvoiced - contractValue)
    const progress = grossContractScope > 0 ? grossScopeInvoiced / grossContractScope * 100 : 0
  const formattedProgress = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(progress) + '%'
    const progressDisplay = formattedProgress
  const held = Math.max(0, retainageWithheld - retainageReleased)
  return <section className={s.contractSummary} aria-label="Contract summary">
    <div className={s.contractSummaryMetrics}>
      <div><span>Contract value</span><strong>{currency.format(contractValue)}</strong>{contractValueDetail && <small className={s.contractValueDetail}>{contractValueDetail}</small>}</div>
      <div><span>Total invoiced</span><strong>{currency.format(totalInvoiced)}</strong>{reservedByDraft > 0 && <small className={s.contractValueDetail}>{currency.format(reservedByDraft)} reserved by a draft</small>}</div>
      {overInvoiced ? <><div><span>Contract progress</span><strong>{progressDisplay}</strong></div><div><span>Over invoiced</span><strong>{currency.format(overInvoicedAmount)}</strong></div></> : <><div><span>Remaining</span><strong>{currency.format(remaining)}</strong></div><div><span>Contract progress</span><strong>{progressDisplay}</strong></div></>}
    </div>
      <ProgressBar value={Math.min(100, progress)} overage={Math.max(0, progress - 100)} label={`${formattedProgress} of gross contract scope invoiced`}/>
    {taxCreditBalance > 0 && <div className={s.retainageSummary}><div><span>Tax credit balance</span><strong>{currency.format(taxCreditBalance)}</strong><small className={s.contractValueDetail}>Automatically applied to future invoices</small></div></div>}
    {(retainageWithheld > 0 || retainageReleased > 0) && <div className={s.retainageSummary}><div><span>Total retained</span><strong>{currency.format(retainageWithheld)}</strong></div><div><span>Retainage released</span><strong>{currency.format(retainageReleased)}</strong></div><div><span>Retainage held</span><strong>{currency.format(held)}</strong></div>{held > 0 && onReleaseRetainage && <Button variant="secondary" disabled={releaseDisabled} title={releaseDisabledReason} onClick={onReleaseRetainage}>Release retainage</Button>}</div>}
  </section>
}
export function Field({ label, hint, prefix, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; prefix?: string }) {
  const generatedId = useId(); const fieldId = id ?? generatedId
  return <div className={s.field}><label htmlFor={fieldId}>{label}</label><div className={s.inputWrap}>{prefix && <span className={s.prefix}>{prefix}</span>}<input id={fieldId} aria-describedby={hint ? `${fieldId}-hint` : undefined} {...props} /></div>{hint && <small id={`${fieldId}-hint`}>{hint}</small>}</div>
}
export function TextArea({ label, id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const generatedId = useId(); const fieldId = id ?? generatedId
  return <div className={s.field}><label htmlFor={fieldId}>{label}</label><textarea id={fieldId} {...props} /></div>
}
export function SelectField({ label, options, id, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: { value: string; label: string }[] }) {
  const generatedId = useId(); const fieldId = id ?? generatedId
  return <div className={s.field}><label htmlFor={fieldId}>{label}</label><div className={s.selectWrap}><select id={fieldId} {...props}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={15} /></div></div>
}
export function SearchField(props: InputHTMLAttributes<HTMLInputElement> & { 'aria-label': string }) {
  return <div className={s.search}><Search size={17} /><input type="search" {...props} /></div>
}
export function FilterSelect({ label, options, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options?: string[] }) {
  return <div className={s.filter}><select aria-label={label} {...props}><option value="">{label}</option>{options?.map(o => <option key={o}>{o}</option>)}</select><ChevronDown size={13} /></div>
}
export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className={s.checkbox}><input type="checkbox" aria-label={label} {...props} /><Check size={13} aria-hidden="true" /></label>
}
export function Radio({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className={s.radio}><input type="radio" {...props} /><span>{label}</span></label>
}
export function Switch({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <div className={s.switchRow}><span>{label}</span><button type="button" className={s.switchButton} role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}><span className={checked ? s.visible : ''}>{checked ? 'Visible' : 'Hidden'}</span><span className={`${s.switchTrack} ${checked ? s.switchOn : ''}`}><span /></span></button></div>
}
export function Tabs({ tabs, value, onChange, variant = 'underline', label, children }: { tabs: { id: string; label: string; icon?: ReactNode; count?: number }[]; value: string; onChange: (id: string) => void; variant?: 'underline' | 'segmented'; label: string; children: ReactNode }) {
  const id = useId()
  return <div><div role="tablist" aria-label={label} className={`${s.tabs} ${s[variant]}`}>{tabs.map((tab, index) => <button type="button" role="tab" id={`${id}-${tab.id}`} key={tab.id} aria-selected={value === tab.id} aria-controls={`${id}-panel`} tabIndex={value === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={event => { let next: number; if (event.key === 'ArrowRight') next = (index + 1) % tabs.length; else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length; else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = tabs.length - 1; else return; event.preventDefault(); onChange(tabs[next].id); document.getElementById(`${id}-${tabs[next].id}`)?.focus() }}>{tab.icon}{tab.label}{tab.count !== undefined && <span className={s.count}>{tab.count}</span>}</button>)}</div><div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${value}`} tabIndex={0} className={s.tabPanel}>{children}</div></div>
}
export type TableColumn<T> = { key: string; label: string; render: (row: T) => ReactNode; align?: 'left' | 'right'; sortAppearance?: 'none' | 'ascending' | 'descending'; width?: string }
export function DataTable<T>({ label, columns, rows, rowKey, footer, selected, onSelectionChange, onRowMenu }: { label: string; columns: TableColumn<T>[]; rows: T[]; rowKey: (row: T) => string; footer?: ReactNode; selected?: string[]; onSelectionChange?: (keys: string[]) => void; onRowMenu?: (row: T) => void }) {
  const hasSelection = selected !== undefined && onSelectionChange !== undefined
  const colSpan = columns.length + (hasSelection ? 1 : 0) + (onRowMenu ? 1 : 0)
  return <div className={s.tableScroll}><table className={s.table}><caption className={s.srOnly}>{label}</caption><thead><tr>{hasSelection && <th className={s.checkCell}><Checkbox label="Select all sample rows" checked={rows.length > 0 && rows.every(row => selected.includes(rowKey(row)))} onChange={e => onSelectionChange(e.target.checked ? rows.map(rowKey) : [])} /></th>}{columns.map(col => <th key={col.key} style={{ width: col.width }} className={col.align === 'right' ? s.alignRight : ''}><span className={s.columnLabel}>{col.label}{col.sortAppearance && (col.sortAppearance === 'none' ? <ChevronsUpDown size={12} /> : col.sortAppearance === 'ascending' ? <ArrowUp size={12} className={s.activeSort} /> : <ArrowDown size={12} className={s.activeSort} />)}</span></th>)}{onRowMenu && <th className={s.menuCell}><span className={s.srOnly}>Actions</span></th>}</tr></thead><tbody>{rows.map(row => { const key = rowKey(row); return <tr key={key} className={selected?.includes(key) ? s.selectedRow : ''}>{hasSelection && <td className={s.checkCell}><Checkbox label={`Select sample row ${key}`} checked={selected.includes(key)} onChange={e => onSelectionChange(e.target.checked ? [...selected, key] : selected.filter(k => k !== key))} /></td>}{columns.map(col => <td key={col.key} className={col.align === 'right' ? s.alignRight : ''}>{col.render(row)}</td>)}{onRowMenu && <td className={s.menuCell}><IconButton label={`Options for sample row ${key}`} onClick={() => onRowMenu(row)}><MoreVertical size={16} /></IconButton></td>}</tr> })}</tbody>{footer && <tfoot><tr><td colSpan={colSpan}>{footer}</td></tr></tfoot>}</table></div>
}
export function Pagination({ children }: { children: ReactNode }) {
  return <div className={s.pagination}><span>{children}</span><div><span>25 per page <ChevronDown size={12} /></span><i /><span>Page 1</span><IconButton label="Previous page" disabled><ArrowLeft size={16} /></IconButton><IconButton label="Next page" disabled><ArrowRight size={16} /></IconButton></div></div>
}
export function Modal({ open, title, children, onClose, footer }: { open: boolean; title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId()
  useEffect(() => { const dialog = ref.current; if (open && !dialog?.open) dialog?.showModal(); else if (!open && dialog?.open) dialog.close() }, [open])
  return <dialog ref={ref} className={s.modal} aria-labelledby={id} onCancel={onClose} onClose={onClose}><div className={s.modalHeading}><h2 id={id}>{title}</h2><IconButton label="Close dialog" onClick={onClose}><X size={20} /></IconButton></div><div className={s.modalBody}>{children}</div>{footer && <div className={s.modalFooter}>{footer}</div>}</dialog>
}
export function EmptyState({ children }: { children: ReactNode }) {
  return <div className={s.emptyState}>{children}</div>
}
export function EmptyValue({ label = 'Not set' }: { label?: string }) {
  return <span className={s.emptyValue} aria-label={label}>—</span>
}
export function AmountBanner({ amount, detail, tone = 'info', action }: { amount: string; detail?: string; tone?: 'info' | 'success'; action?: ReactNode }) {
  return <div className={`${s.amountBanner} ${tone === 'success' ? s.amountSuccess : ''}`}><div><strong>{amount}</strong>{detail && <p>{detail}</p>}</div>{action}</div>
}
