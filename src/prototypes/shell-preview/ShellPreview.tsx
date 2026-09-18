import { useState, type ReactNode } from 'react'
import { WorkspaceShell, type WorkspaceSection } from '../../shared/shell'
import { PageHeading } from '../../shared/ui'
import s from './ShellPreview.module.css'

type ShellPreviewProps = {
  onOpenRegularEstimate?: () => void
  onOpenRetainageEstimate?: () => void
  onNavigate?: () => void
  estimatesContent?: ReactNode
  headerSearch?: ReactNode
}

export function ShellPreview({ onOpenRegularEstimate, onOpenRetainageEstimate, onNavigate, estimatesContent, headerSearch }: ShellPreviewProps) {
  const [section, setSection] = useState<WorkspaceSection>('estimates')
  const navigate = (next: WorkspaceSection) => {
    if (next !== 'estimates') return
    setSection(next)
    onNavigate?.()
  }
  return <WorkspaceShell activeSection={section} onNavigate={navigate} onUtilityAction={() => {}} headerSearch={headerSearch}>
    {estimatesContent ?? <section className={s.launcher} aria-label="Estimate prototypes">
      <PageHeading title="Estimate Prototypes"/>
      <div className={s.prototypeGrid}>
        {onOpenRegularEstimate && <button className={s.prototypeCard} onClick={onOpenRegularEstimate}><strong>Regular Estimate</strong><span>General estimate and contract lifecycle</span><ul><li>Create standard invoice</li><li>Create progress invoice</li><li>Create change order</li><li>Manage payment schedule</li></ul></button>}
        {onOpenRetainageEstimate && <button className={s.prototypeCard} onClick={onOpenRetainageEstimate}><strong>Estimate w/ Retainage</strong><span>Focused retainage billing lifecycle</span><ul><li>Manage retainage rule</li><li>Create invoice with retainage</li><li>Create release invoice</li></ul></button>}
      </div>
    </section>}
  </WorkspaceShell>
}
