import { useState } from 'react'
import { Plus } from 'lucide-react'
import { WorkspaceShell, workspaceLabels, type WorkspaceSection } from '../../shared/shell'
import { Button, Card, Modal, PageHeading } from '../../shared/ui'
import s from './ShellPreview.module.css'

export function ShellPreview() {
  const [section, setSection] = useState<WorkspaceSection>('estimates')
  const [action, setAction] = useState<string | null>(null)
  return <WorkspaceShell activeSection={section} onNavigate={setSection} onUtilityAction={setAction}>
    <PageHeading title={workspaceLabels[section]} actions={<Button icon={<Plus size={17}/>} onClick={() => setAction('Create new')}>Create new</Button>}/>
    <div className={s.placeholder}><Card title="Your workspace"><p>This page is ready for your content.</p><p className={s.caption}>Select a section in the sidebar to explore the workspace.</p></Card></div>
    <Modal open={action !== null} title={action ?? ''} onClose={() => setAction(null)} footer={<Button onClick={() => setAction(null)}>Got it</Button>}><p>This action is not available in this preview yet.</p></Modal>
  </WorkspaceShell>
}
