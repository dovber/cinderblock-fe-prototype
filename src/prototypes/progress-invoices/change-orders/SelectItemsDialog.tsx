import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, LineItemLockIndicator } from '../../../shared/ui'
import { amount, estimateLines, money, type EstimateLine } from './model'
import s from './ChangeOrders.module.css'

type SelectableItem = Pick<EstimateLine, 'id' | 'name' | 'description' | 'qty' | 'price'>
type UnavailableItem = { orderId: string; message: string }

type Props = {
  items?: SelectableItem[]
  sourceLabel?: string
  unavailableByItemId?: Record<string, UnavailableItem>
  onOpenChangeOrder?: (id: string) => void
  onCancel: () => void
  onCreate: (ids: string[]) => void
}

export function SelectItemsDialog({ items = estimateLines, sourceLabel = 'Estimate', unavailableByItemId = {}, onOpenChangeOrder, onCancel, onCreate }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const all = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<string[]>([])
  const eligibleItems = items.filter(item => !unavailableByItemId[item.id])
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close() }, [])
  useEffect(() => { if (all.current) all.current.indeterminate = selected.length > 0 && selected.length < eligibleItems.length }, [eligibleItems.length, selected])
  return createPortal(<dialog ref={dialog} className={`${s.dialog} ${s.selectionDialog}`} aria-labelledby="co-select-title" onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id="co-select-title">Select items to remove</h2>
    <p className={s.coDialogIntro}>{sourceLabel === 'Estimate' ? 'Select items to remove from this estimate. To only add new items, leave all items unselected and click “Create change order.”' : `Select items from ${sourceLabel} to remove from the contract. You can add new items on the Change Order.`}</p>
    <div className={s.selectionBody}><table className={s.selectionTable}><caption className={s.srOnly}>{sourceLabel} items available for a Change Order</caption><thead><tr><th className={s.checkCell}><input ref={all} type="checkbox" aria-label={`Select all ${sourceLabel} items`} disabled={eligibleItems.length === 0} checked={eligibleItems.length > 0 && selected.length === eligibleItems.length} onChange={event => setSelected(event.target.checked ? eligibleItems.map(line => line.id) : [])}/></th><th colSpan={2}>{selected.length} of {eligibleItems.length} selected</th><th>Qty</th><th className={s.numeric}>Amount</th></tr></thead><tbody>{items.map((line, index) => {
      const unavailable = unavailableByItemId[line.id]
      return <tr key={line.id} className={unavailable ? s.unavailableSelectionRow : undefined}><td className={s.checkCell}><input type="checkbox" aria-label={`Select ${line.name}`} disabled={Boolean(unavailable)} checked={selected.includes(line.id)} onChange={event => setSelected(event.target.checked ? [...selected, line.id] : selected.filter(id => id !== line.id))}/></td><td className={s.rowNumber}>{index + 1}</td><td><strong>{line.name}{unavailable && <LineItemLockIndicator reason={unavailable.message}/>}</strong><small>{line.description}</small>{unavailable && <button className={s.existingCoReference} onClick={() => onOpenChangeOrder?.(unavailable.orderId)}>{unavailable.message}</button>}</td><td>{line.qty}</td><td className={s.numeric}>{money(amount(line))}</td></tr>
    })}</tbody></table></div>
    <footer className={s.dialogFooter}><Button className={s.cancel} variant="text" onClick={onCancel}>Cancel</Button><Button onClick={() => onCreate(selected)}>Create change order</Button></footer>
  </dialog>, document.body)
}
