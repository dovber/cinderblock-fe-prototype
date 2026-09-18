import { useEffect, useRef, useState } from 'react'
import { IconFileDollar } from '@tabler/icons-react'
import { CheckCircle2, GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button, formatPaymentSchedulePercentage, IconButton, PaymentScheduleAllocationWarning, paymentScheduleAllocation, paymentSchedulePercentage, roundPaymentScheduleAmount } from '../../../shared/ui'
import { milestoneAmount, milestonePercentageFromAmount, money, percent, type OnAcceptanceAction, type ScheduleMilestone } from './model'
import type { ProgressInvoice } from '../model'
import s from './PaymentSchedule.module.css'

type InvoiceNameUpdate = { id: string; name: string }
type PendingSave = { items: ScheduleMilestone[]; invoiceNameUpdates: InvoiceNameUpdate[] }

const percentageInputPattern = /^\d*(?:\.\d{0,3})?$/
const amountInputPattern = /^\d*(?:\.\d{0,2})?$/
const amountInputValue = (value: number) => String(roundPaymentScheduleAmount(value))

function RenameMilestoneConfirmation({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    heading.current?.focus()
    return () => element.close()
  }, [])
  return <dialog ref={dialog} className={s.confirmDialog} aria-labelledby="rename-milestone-title" onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id="rename-milestone-title" ref={heading} tabIndex={-1}>Renaming milestone</h2>
    <p>Invoices that have already been paid will keep their original milestone name.</p>
    <footer><Button variant="text" onClick={onCancel}>Cancel</Button><Button onClick={onConfirm}>Rename</Button></footer>
  </dialog>
}

export function StandardInvoiceConfirmation({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    heading.current?.focus()
    return () => { element.close(); previous?.focus() }
  }, [])
  return <dialog ref={dialog} className={s.confirmDialog} aria-labelledby="standard-invoice-confirmation-title" onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id="standard-invoice-confirmation-title" ref={heading} tabIndex={-1}>Create standard invoice?</h2>
    <p>Creating a standard invoice will convert the full estimate and remove the payment schedule.</p>
    <footer><Button variant="text" onClick={onCancel}>Cancel</Button><Button onClick={onConfirm}>Create invoice</Button></footer>
  </dialog>
}

export function OversizedMilestoneInvoiceConfirmation({ milestoneName, plannedAmount, invoiceAmount, onBack, onConfirm }: { milestoneName: string; plannedAmount: number; invoiceAmount: number; onBack: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    heading.current?.focus()
    return () => element.close()
  }, [])
  return <dialog ref={dialog} className={s.confirmDialog} aria-labelledby="oversized-milestone-title" onCancel={event => { event.preventDefault(); onBack() }}>
    <h2 id="oversized-milestone-title" ref={heading} tabIndex={-1}>Invoice exceeds milestone</h2>
    <p>This invoice is {money(invoiceAmount - plannedAmount)} more than the {milestoneName} milestone. The invoice amount will become this milestone&apos;s actual amount. Other milestones will keep their percentage anchors.</p>
    <dl className={s.confirmSummary}>
      <div><dt>{milestoneName}</dt><dd>{money(plannedAmount)} → {money(invoiceAmount)}</dd></div>
    </dl>
    <footer><Button variant="text" onClick={onBack}>Back</Button><Button onClick={onConfirm}>Create invoice</Button></footer>
  </dialog>
}

export function ManageSchedule({ contractValue, milestones, invoices, onAcceptance, accepted, onCancel, onSave }: { contractValue: number; milestones: ScheduleMilestone[]; invoices: ProgressInvoice[]; onAcceptance: OnAcceptanceAction; accepted: boolean; onCancel: () => void; onSave: (items: ScheduleMilestone[], action: OnAcceptanceAction, invoiceNameUpdates: InvoiceNameUpdate[]) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const manageTable = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState(() => milestones.map(item => ({ ...item })))
  const [percentageInputs, setPercentageInputs] = useState<Record<string, string>>(() => Object.fromEntries(milestones.map(item => [item.id, item.percentage === undefined ? '' : formatPaymentSchedulePercentage(item.percentage)])))
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>(() => Object.fromEntries(milestones.map(item => [item.id, item.percentage === undefined && item.plannedAmount === undefined ? '' : amountInputValue(milestoneAmount(item, contractValue))])))
  const [acceptanceAction, setAcceptanceAction] = useState(onAcceptance)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  const update = (id: string, patch: Partial<ScheduleMilestone>) => setItems(current => current.map(item => item.id === id ? { ...item, ...patch } : item))
  const add = () => {
    const id = `milestone-${Date.now()}`
    setItems(current => [...current, { id, name: '' }])
  }
  const hasBlankName = items.some(item => !item.name.trim())
  const firstMilestone = items[0]
  const firstAmount = firstMilestone ? milestoneAmount(firstMilestone, contractValue) : 0
  const acceptanceInvalid = !accepted && acceptanceAction !== 'nothing' && firstAmount <= 0
  const invoiceById = new Map(invoices.map(invoice => [invoice.id, invoice]))
  const allocation = paymentScheduleAllocation(items, contractValue)
  function findDropIndex(pointerY: number) {
    const rows = Array.from(manageTable.current?.querySelectorAll<HTMLElement>('[data-milestone-row]') ?? [])
    const index = rows.findIndex(row => pointerY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2)
    return index < 0 ? rows.length : index
  }
  function reorder(targetIndex: number) {
    if (!draggedId) return
    setItems(current => {
      const sourceIndex = current.findIndex(item => item.id === draggedId)
      if (sourceIndex < 0) return current
      const next = [...current]
      const [moved] = next.splice(sourceIndex, 1)
      const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
      next.splice(insertionIndex, 0, moved)
      return next
    })
    setDraggedId(null)
    setDropIndex(null)
  }
  function requestSave() {
    const normalized = items.map(item => {
      const linkedInvoice = item.invoiceId ? invoiceById.get(item.invoiceId) : undefined
      const plannedAmount = !linkedInvoice && (item.percentage !== undefined || item.plannedAmount !== undefined) ? milestoneAmount(item, contractValue) : item.plannedAmount
      return { ...item, name: item.name.trim(), plannedAmount, amountContractValue: plannedAmount === undefined ? undefined : contractValue, ...(linkedInvoice ? { invoiceDate: linkedInvoice.invoiceDate } : {}) }
    })
    const renamed = normalized.flatMap(item => {
      const original = milestones.find(milestone => milestone.id === item.id)
      const invoice = item.invoiceId ? invoiceById.get(item.invoiceId) : undefined
      return original && invoice && original.name !== item.name ? [{ item, invoice }] : []
    })
    const invoiceNameUpdates = renamed.filter(({ invoice }) => invoice.status !== 'Paid' && invoice.status !== 'Canceled').map(({ item, invoice }) => ({ id: invoice.id, name: item.name }))
    const hasIssuedRename = renamed.some(({ invoice }) => invoice.status !== 'Draft' && invoice.status !== 'Canceled')
    if (hasIssuedRename) setPendingSave({ items: normalized, invoiceNameUpdates })
    else onSave(normalized, acceptanceAction, invoiceNameUpdates)
  }
  function confirmRename() {
    if (!pendingSave) return
    onSave(pendingSave.items, acceptanceAction, pendingSave.invoiceNameUpdates)
  }
  function changePercentage(item: ScheduleMilestone, value: string) {
    if (!percentageInputPattern.test(value)) return
    setPercentageInputs(current => ({ ...current, [item.id]: value }))
    if (value === '') {
      setAmountInputs(current => ({ ...current, [item.id]: '' }))
      update(item.id, { percentage: undefined, plannedAmount: undefined, amountContractValue: undefined })
      return
    }
    const percentage = Math.max(0, Number(value))
    const plannedAmount = roundPaymentScheduleAmount(contractValue * percentage / 100)
    setAmountInputs(current => ({ ...current, [item.id]: amountInputValue(plannedAmount) }))
    update(item.id, { percentage, plannedAmount, amountContractValue: contractValue })
  }
  function changeAmount(item: ScheduleMilestone, value: string) {
    if (!amountInputPattern.test(value)) return
    setAmountInputs(current => ({ ...current, [item.id]: value }))
    if (value === '') {
      setPercentageInputs(current => ({ ...current, [item.id]: '' }))
      update(item.id, { percentage: undefined, plannedAmount: undefined, amountContractValue: undefined })
      return
    }
    const plannedAmount = roundPaymentScheduleAmount(Math.max(0, Number(value)))
    const percentage = milestonePercentageFromAmount(plannedAmount, contractValue)
    setPercentageInputs(current => ({ ...current, [item.id]: percentage === undefined ? '' : formatPaymentSchedulePercentage(percentage) }))
    update(item.id, { percentage, plannedAmount, amountContractValue: contractValue })
  }
  return <><dialog ref={dialog} className={s.manageDialog} aria-labelledby="manage-schedule-title" onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id="manage-schedule-title">Payment schedule</h2>
    <div className={s.manageTable} ref={manageTable}>
      <div className={s.manageHeader}><span/><span/><span>Milestone name</span><span>Percentage</span><span>Amount</span><span>Date</span><span/></div>
      {items.map((item, index) => {
        const linkedInvoice = item.invoiceId ? invoiceById.get(item.invoiceId) : undefined
        const locked = !!linkedInvoice
        const hasDraftInvoice = linkedInvoice?.status === 'Draft'
        const isInvoiced = !!linkedInvoice && !hasDraftInvoice
        const calculatedPercentage = paymentSchedulePercentage(item, contractValue)
        const displayedPercentage = locked ? calculatedPercentage === undefined ? '' : formatPaymentSchedulePercentage(calculatedPercentage) : percentageInputs[item.id] ?? (calculatedPercentage === undefined ? '' : formatPaymentSchedulePercentage(calculatedPercentage))
        const calculatedAmount = item.percentage === undefined && item.plannedAmount === undefined ? undefined : milestoneAmount(item, contractValue)
        const displayedAmount = locked ? calculatedAmount === undefined ? '' : amountInputValue(calculatedAmount) : amountInputs[item.id] ?? (calculatedAmount === undefined ? '' : amountInputValue(calculatedAmount))
        const displayedDate = item.plannedDate ?? ''
        return <div data-milestone-row className={`${s.manageRow} ${hasDraftInvoice ? s.draftInvoiceRow : isInvoiced ? s.invoicedRow : ''} ${draggedId === item.id ? s.dragging : ''} ${dropIndex === index ? s.dropBefore : ''} ${dropIndex === index + 1 ? s.dropAfter : ''}`} key={item.id}>
        <button type="button" className={s.dragHandle} aria-label={`Drag ${item.name || `milestone ${index + 1}`} to reorder`} aria-grabbed={draggedId === item.id} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setDraggedId(item.id); setDropIndex(index) }} onPointerMove={event => { if (draggedId === item.id) setDropIndex(findDropIndex(event.clientY)) }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); reorder(dropIndex ?? index) }} onPointerCancel={() => { setDraggedId(null); setDropIndex(null) }}><GripVertical size={15}/></button><span>{index + 1}</span>
        <div className={s.nameInput}>{hasDraftInvoice ? <IconFileDollar aria-label="Draft invoice milestone" size={16}/> : isInvoiced ? <CheckCircle2 aria-label="Invoiced milestone" size={16}/> : null}<input aria-label={`Milestone name ${index + 1}`} placeholder="Milestone name" required aria-invalid={!item.name.trim()} value={item.name} onChange={event => update(item.id, { name: event.target.value })}/></div>
        <div className={`${s.percentInput} ${locked ? s.lockedField : ''}`}><input aria-label={`Percentage for ${item.name || `milestone ${index + 1}`}`} inputMode="decimal" disabled={locked} value={displayedPercentage} onChange={event => changePercentage(item, event.target.value)}/><span>%</span></div>
        <div className={`${s.amountInput} ${locked || contractValue <= 0 ? s.lockedField : ''}`}><span>$</span><input aria-label={`Amount for ${item.name || `milestone ${index + 1}`}`} inputMode="decimal" disabled={locked || contractValue <= 0} title={contractValue <= 0 ? 'Dollar entry is unavailable when Contract Value is $0.' : undefined} value={displayedAmount} onChange={event => changeAmount(item, event.target.value)}/></div>
        <input aria-label={`Planned date for ${item.name || `milestone ${index + 1}`}`} type="date" disabled={locked} value={displayedDate} onChange={event => update(item.id, { plannedDate: event.target.value || undefined })}/>
        <div className={s.rowActions}>{!locked && <IconButton label={`Remove ${item.name || 'milestone'}`} onClick={() => setItems(current => current.filter(candidate => candidate.id !== item.id))}><Trash2 size={14}/></IconButton>}</div>
      </div>})}
      <button className={s.addMilestone} type="button" onClick={add}><Plus size={16}/>Add milestone</button>
    </div>
    {allocation.exceedsContract
      ? <div className={s.scheduleWarning}><PaymentScheduleAllocationWarning contractValue={contractValue} milestones={items}/></div>
      : <section className={s.scheduleTotal} aria-live="polite"><strong>{percent(allocation.allocatedPercentage)} allocated</strong><span>{money(allocation.allocatedAmount)} of {money(contractValue)}</span></section>}
    {!accepted && <section className={s.acceptanceSetting}><label htmlFor="on-acceptance">On acceptance</label><select id="on-acceptance" value={acceptanceAction} onChange={event => setAcceptanceAction(event.target.value as OnAcceptanceAction)}><option value="nothing">Do nothing</option><option value="draft">Create draft invoice for milestone 1</option></select>{acceptanceInvalid && <small role="alert">Milestone 1 needs a valid amount before this action can be saved.</small>}</section>}
    <footer><Button variant="text" onClick={onCancel}>Cancel</Button><Button disabled={hasBlankName || acceptanceInvalid} onClick={requestSave}>Save changes</Button></footer>
  </dialog>
  {pendingSave && <RenameMilestoneConfirmation onCancel={() => setPendingSave(null)} onConfirm={confirmRename}/>}</>
}

