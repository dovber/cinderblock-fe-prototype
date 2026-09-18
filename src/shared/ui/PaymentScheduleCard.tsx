import type { ReactNode } from 'react'
import { IconFileDollar } from '@tabler/icons-react'
import { CheckCircle2, Link2 } from 'lucide-react'
import { formatPaymentSchedulePercentage, paymentScheduleAmount, paymentSchedulePercentage } from './paymentScheduleMath'
import { PaymentScheduleAllocationWarning } from './PaymentScheduleAllocationWarning'
import { EmptyValue } from './components'
import s from './PaymentScheduleCard.module.css'

export type PaymentScheduleCardMilestone = {
  id: string
  name: string
  percentage?: number
  plannedDate?: string
  invoiceDate?: string
  invoiceId?: string
  invoiceStatus?: 'Draft' | 'Open' | 'Partially paid' | 'Paid' | 'Canceled'
  actualAmount?: number
  plannedAmount?: number
  amountContractValue?: number
}

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const percent = (value: number) => formatPaymentSchedulePercentage(value) + '%'

export function PaymentScheduleCard({ contractValue, milestones, action, context, completionSummary, createDisabled = false, createDisabledReason, onCreateInvoice, onOpenInvoice }: { contractValue: number; milestones: PaymentScheduleCardMilestone[]; action?: ReactNode; context?: ReactNode; completionSummary?: ReactNode; createDisabled?: boolean; createDisabledReason?: string; onCreateInvoice?: (milestoneId: string) => void; onOpenInvoice?: (invoiceId: string) => void }) {
  const amount = (milestone: PaymentScheduleCardMilestone) => paymentScheduleAmount(milestone, contractValue)
  return <section className={s.scheduleCard}>
    <div className={s.cardTitle}><div><h2>Payment schedule</h2>{context}{completionSummary && <div className={s.completionSummary}>{completionSummary}</div>}</div>{action && <div>{action}</div>}</div>
    <table className={s.scheduleTable}><thead><tr><th/><th>Milestone</th><th>Percentage</th><th>Amount</th><th>Date</th><th>Invoice</th></tr></thead><tbody>{milestones.map((milestone, index) => {
      const displayedPercentage = paymentSchedulePercentage(milestone, contractValue)
      const displayedAmount = amount(milestone)
      const hasDraftInvoice = !!milestone.invoiceId && milestone.invoiceStatus === 'Draft'
      const isInvoiced = !!milestone.invoiceId && !hasDraftInvoice
      const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const dates = milestone.plannedDate || milestone.invoiceDate ? <span className={s.dateStack}>{milestone.plannedDate && <span>Planned: {formatDate(milestone.plannedDate)}</span>}{milestone.invoiceDate && <span>Invoice: {formatDate(milestone.invoiceDate)}</span>}</span> : <EmptyValue/>
      return <tr key={milestone.id} className={hasDraftInvoice ? s.draftInvoiceRow : isInvoiced ? s.fulfilledRow : undefined}><td>{index + 1}</td><td><strong className={s.milestoneName}>{hasDraftInvoice ? <IconFileDollar aria-hidden="true" size={16}/> : isInvoiced ? <CheckCircle2 aria-hidden="true" size={16}/> : null}<span>{milestone.name}</span></strong></td><td>{displayedPercentage === undefined ? <EmptyValue/> : percent(displayedPercentage)}</td><td>{displayedAmount === undefined ? <EmptyValue/> : money(displayedAmount)}</td><td>{dates}</td><td>{milestone.invoiceId ? <button className={s.invoiceLink} onClick={() => onOpenInvoice?.(milestone.invoiceId!)}><Link2 size={14}/>Invoice #{milestone.invoiceId}{hasDraftInvoice && <span className={s.draftBadge}>Draft</span>}</button> : <button className={s.createLink} disabled={createDisabled || !onCreateInvoice} title={createDisabledReason} onClick={() => onCreateInvoice?.(milestone.id)}>Create invoice</button>}</td></tr>
    })}</tbody></table>
    <div className={s.allocationWarning}><PaymentScheduleAllocationWarning contractValue={contractValue} milestones={milestones}/></div>
  </section>
}
