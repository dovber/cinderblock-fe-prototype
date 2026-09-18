import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui'
import s from './ProgressInvoices.module.css'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export function RetainageReleaseDialog({ held, onCancel, onCreate }: { held: number; onCancel: () => void; onCreate: (amount: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [value, setValue] = useState(held.toFixed(2))
  const amount = Number(value.replace(/[$,\s]/g, ''))
  const error = !Number.isFinite(amount) || amount <= 0 ? 'Enter an amount greater than $0' : amount > held ? `Amount cannot exceed ${money(held)}` : ''
  useEffect(() => { const element = dialog.current!; element.showModal(); heading.current?.focus(); return () => element.close() }, [])
  return <dialog ref={dialog} className={s.dialog} aria-labelledby="release-retainage-title" onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id="release-retainage-title" ref={heading} tabIndex={-1}>Release retainage</h2>
    <div className={s.releaseSummary}><span>Retainage held</span><strong>{money(held)}</strong></div>
    <label className={s.releaseField} htmlFor="retainage-release-amount">Amount to release</label>
    <div className={s.releaseAmount}><span>$</span><input id="retainage-release-amount" autoFocus inputMode="decimal" value={value} aria-invalid={!!error} onChange={event => setValue(event.target.value)}/></div>
    {error && <p className={s.error} role="alert">{error}</p>}
    <footer className={s.dialogFooter}><Button className={s.cancel} variant="text" onClick={onCancel}>Cancel</Button><Button disabled={!!error} onClick={() => onCreate(amount)}>Create invoice</Button></footer>
  </dialog>
}
