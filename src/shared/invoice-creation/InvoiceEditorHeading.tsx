import type { RefObject } from 'react'
import { X } from 'lucide-react'
import s from './ProgressInvoices.module.css'

type InvoiceKind = 'standard' | 'progress' | 'retainage-release'

type Props = {
  title: string
  kind: InvoiceKind
  milestoneName?: string
  closeLabel: string
  closeButton: RefObject<HTMLButtonElement | null>
  onClose: () => void
}

function subtitle(kind: InvoiceKind, milestoneName?: string) {
  if (kind === 'standard') return 'Job 1004 Kitchen Installation'
  if (kind === 'progress') return `${milestoneName} · Job 1004 Kitchen Installation`
  return 'Retainage release · Job 1004 Kitchen Installation'
}

export function InvoiceEditorHeading({ title, kind, milestoneName, closeLabel, closeButton, onClose }: Props) {
  return <div className={s.editorTitle}>
    <button ref={closeButton} className={s.closeEditor} aria-label={closeLabel} onClick={onClose}><X size={23}/></button>
    <div><h1>{title}</h1><p>{subtitle(kind, milestoneName)}</p></div>
  </div>
}
