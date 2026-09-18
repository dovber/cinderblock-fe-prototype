import { ProgressBar } from '../../shared/ui'
import { money, percent } from './model'
import s from './ContractProgressSummary.module.css'

export function ContractProgressSummary({ contract, previous, current }: { contract: number; previous: number; current: number }) {
  const projected = previous + current
  const over = Math.max(0, projected - contract)
  const progress = contract > 0 ? projected / contract * 100 : 0
  return <section className={s.summary} aria-label="Projected Contract progress">
    <div><span>Gross contract scope</span><strong>{money(contract)}</strong></div>
    <div><span>Previously billed</span><strong>{money(previous)}</strong></div>
    <div><span>This invoice</span><strong>{money(current)}</strong></div>
    <div><span>{over > 0 ? 'Over invoiced' : 'Remaining after invoice'}</span><strong>{money(over > 0 ? over : Math.max(0, contract - projected))}</strong></div>
    <div><span>Contract progress</span><strong>{percent(progress)}</strong></div>
    <div className={s.bar}><ProgressBar value={Math.min(100, progress)} label={`${percent(progress)} of gross contract scope invoiced after this invoice`}/></div>
  </section>
}
