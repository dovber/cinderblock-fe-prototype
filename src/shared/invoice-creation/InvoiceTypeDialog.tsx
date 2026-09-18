import { useEffect, useRef, useState } from 'react'
import { Button, Radio } from '../ui'
import s from './ProgressInvoices.module.css'

export type InvoiceType = 'standard' | 'progress' | 'retainage-release'
type Props = {
  showStandard?: boolean
  disableStandard?: boolean
  showProgress?: boolean
  showRetainageRelease?: boolean
  onCancel: () => void
  onContinue: (type: InvoiceType) => void
}

export function InvoiceTypeDialog({ showStandard = true, disableStandard = false, showProgress = true, showRetainageRelease = false, onCancel, onContinue }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [type, setType] = useState<InvoiceType>(() => showStandard && !disableStandard ? 'standard' : showProgress ? 'progress' : 'retainage-release')

  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    heading.current?.focus()
    return () => { element.close(); previous?.focus() }
  }, [])

  return <dialog ref={dialog} className={s.dialog} aria-labelledby="invoice-type-heading" onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id="invoice-type-heading" ref={heading} tabIndex={-1}>What do you want to invoice?</h2>
    <form onSubmit={event => { event.preventDefault(); onContinue(type) }}>
      <fieldset className={s.choices}>
        <legend className={s.srOnly}>Invoice type</legend>
        {showStandard && <div>
          <Radio name="invoice-type" label="Standard invoice" disabled={disableStandard} checked={type === 'standard'} onChange={() => setType('standard')}/>
          {type === 'standard' && <p className={s.remainingHelper}>Invoice the full estimate without progress tracking</p>}
        </div>}
        {showProgress && <div>
          <Radio name="invoice-type" label="Progress invoice" checked={type === 'progress'} onChange={() => setType('progress')}/>
          {type === 'progress' && <p className={s.remainingHelper}>Invoice part of the estimate</p>}
        </div>}
        {showRetainageRelease && <div>
          <Radio name="invoice-type" label="Retainage release" checked={type === 'retainage-release'} onChange={() => setType('retainage-release')}/>
          {type === 'retainage-release' && <p className={s.remainingHelper}>Release withheld funds</p>}
        </div>}
      </fieldset>
      <footer className={s.dialogFooter}><Button className={s.cancel} variant="text" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={disableStandard && type === 'standard'}>{type === 'standard' ? 'Create invoice' : 'Continue'}</Button></footer>
    </form>
  </dialog>
}
