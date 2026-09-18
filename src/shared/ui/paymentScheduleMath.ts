export type PaymentSchedulePercentageMilestone = {
  invoiceId?: string
  actualAmount?: number
  percentage?: number
  plannedAmount?: number
  amountContractValue?: number
}

export type PaymentScheduleAllocation = {
  allocatedAmount: number
  allocatedPercentage: number
  overAmount: number
  overPercentage: number
  exceedsContract: boolean
}

export const roundPaymentScheduleAmount = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export const formatPaymentSchedulePercentage = (value: number) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 3,
  useGrouping: false,
}).format(value)

export function paymentSchedulePercentage(milestone: PaymentSchedulePercentageMilestone, contractValue: number) {
  if (!milestone.invoiceId) return milestone.percentage
  return contractValue > 0 ? (milestone.actualAmount ?? 0) / contractValue * 100 : 0
}

export function paymentScheduleAmount(milestone: PaymentSchedulePercentageMilestone, contractValue: number) {
  if (milestone.invoiceId) return roundPaymentScheduleAmount(milestone.actualAmount ?? 0)
  if (milestone.percentage === undefined && milestone.plannedAmount === undefined) return undefined
  if (milestone.plannedAmount !== undefined && milestone.amountContractValue === contractValue) return roundPaymentScheduleAmount(milestone.plannedAmount)
  return roundPaymentScheduleAmount(contractValue * (milestone.percentage ?? 0) / 100)
}

export function paymentScheduleAllocation(milestones: PaymentSchedulePercentageMilestone[], contractValue: number): PaymentScheduleAllocation {
  const allocatedAmount = roundPaymentScheduleAmount(milestones.reduce((total, milestone) => total + (paymentScheduleAmount(milestone, contractValue) ?? 0), 0))
  const allocatedPercentage = contractValue > 0 ? allocatedAmount / contractValue * 100 : 0
  const overAmount = Math.max(0, allocatedAmount - contractValue)
  const overPercentage = contractValue > 0 ? overAmount / contractValue * 100 : 0
  return { allocatedAmount, allocatedPercentage, overAmount, overPercentage, exceedsContract: contractValue > 0 && overAmount > 0.005 }
}

export function manualAllocationOverage(lockedAmount: number, plannedAmount: number, contractValue: number) {
  return Math.max(0, plannedAmount - Math.max(0, contractValue - lockedAmount))
}
