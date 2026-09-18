import { StatusBadge } from '../../../shared/ui'
import { changeOrderContractValueImpact, estimateId, money, type ChangeOrder } from './model'
import s from './ChangeOrders.module.css'

type Props = {
  originalContractValue: number
  contractValue: number
  orders: ChangeOrder[]
  currentDocument: { type: 'estimate' } | { type: 'change-order'; id: string }
  onOpenChangeOrder: (order: ChangeOrder) => void
  onOpenEstimate?: () => void
}

const tone = (status: ChangeOrder['status']) => status === 'Accepted' ? 'success' : status === 'Pending' ? 'pending' : 'neutral'
const contractChange = (value: number) => value > 0 ? `+${money(value)}` : money(value)

export function ContractDetails({ originalContractValue, contractValue, orders, currentDocument, onOpenChangeOrder, onOpenEstimate }: Props) {
  const viewingEstimate = currentDocument.type === 'estimate'

  return <section className={s.changeOrderHistory} aria-label="Contract details">
    <h2>Contract details</h2>
    <div className={s.changeOrderHistoryList}>
      <div className={`${s.changeOrderHistoryRow} ${s.contractValueRow} ${viewingEstimate ? s.activeContractDocumentRow : ''}`}>
        {viewingEstimate
          ? <span><span className={s.lineageLabel}>Original contract:</span> <span className={s.lineageDocumentId}>Estimate #{estimateId}</span></span>
          : <span><span className={s.lineageLabel}>Original contract:</span> <button className={s.contractSourceLink} onClick={onOpenEstimate}>Estimate #{estimateId}</button></span>}
        <strong>{money(originalContractValue)}</strong>
      </div>
      {orders.map((order, index) => {
        const displayedChange = contractChange(changeOrderContractValueImpact(order))
        const isCurrentOrder = currentDocument.type === 'change-order' && currentDocument.id === order.id
        return <div className={`${s.changeOrderHistoryRow} ${isCurrentOrder ? s.activeContractDocumentRow : ''}`} key={order.id}>
          {isCurrentOrder
            ? <span><span className={s.lineageLabel}>Change Order {index + 1}:</span> <span className={s.lineageDocumentId}>CO #{order.id}</span></span>
            : <span><span className={s.lineageLabel}>Change Order {index + 1}:</span> <button className={s.changeOrderHistoryLink} onClick={() => onOpenChangeOrder(order)}>CO #{order.id}</button></span>}
          <span className={s.changeOrderStatusSlot}>{order.status !== 'Accepted' && <StatusBadge tone={tone(order.status)}>{order.status}</StatusBadge>}</span>
          <strong className={s.changeOrderHistoryAmount} title={`Contract change: ${displayedChange}`}>{displayedChange}</strong>
        </div>
      })}
      <div className={`${s.changeOrderHistoryRow} ${s.currentContractRow}`}>
        <strong>Current contract</strong>
        <strong>{money(contractValue)}</strong>
      </div>
    </div>
  </section>
}
