import { formatPaymentSchedulePercentage, paymentScheduleAllocation } from './paymentScheduleMath'
import type { PaymentSchedulePercentageMilestone } from './paymentScheduleMath'
import s from './PaymentScheduleAllocationWarning.module.css'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const percent = (value: number) => formatPaymentSchedulePercentage(value) + '%'

export function PaymentScheduleAllocationWarning({ contractValue, milestones }: { contractValue: number; milestones: PaymentSchedulePercentageMilestone[] }) {
  const allocation = paymentScheduleAllocation(milestones, contractValue)
  if (!allocation.exceedsContract) return null

  const overPercentage = allocation.overPercentage < 0.01 ? '<0.01%' : percent(allocation.overPercentage)
  return <section className={s.warning} aria-live="polite">
    <h3>Payment schedule exceeds 100%</h3>
    <strong>{percent(allocation.allocatedPercentage)} allocated · {overPercentage} over</strong>
    <span>{money(allocation.allocatedAmount)} of {money(contractValue)}</span>
    <small>Invoice availability still determines what can be billed.</small>
  </section>
}
