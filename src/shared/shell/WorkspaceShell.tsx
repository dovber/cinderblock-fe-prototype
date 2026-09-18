import { navigation, type WorkspaceSection } from './navigation'
import type { ReactNode } from 'react'
import { Bell, CircleHelp, PanelLeftClose, Plus, Settings } from 'lucide-react'
import { ProgressBar } from '../ui'
import s from './WorkspaceShell.module.css'

type WorkspaceShellProps = {
  activeSection: WorkspaceSection
  onNavigate: (section: WorkspaceSection) => void
  children: ReactNode
  headerSearch?: ReactNode
  onUtilityAction: (action: string) => void
}

export function WorkspaceShell({ activeSection, onNavigate, children, onUtilityAction, headerSearch }: WorkspaceShellProps) {
  return <div className={s.shell}>
    <a className={s.skipLink} href="#workspace-content">Skip to content</a>
    <aside className={s.sidebar} aria-label="Workspace sidebar">
      <div className={s.brandRow}>
        <div className={s.brand} aria-label="Cinderblock">
          <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true"><path fill="#d4d5d5" d="M13 0 26 7.5v15L13 30 0 22.5v-15Z"/><path fill="#494b4b" d="m13 4 9 5-9 5-9-5Z"/><path fill="#959797" d="m14 16 9-5v10l-9 5Z"/><path fill="#c1c3c3" d="m3 11 9 5v10l-9-5Z"/></svg>
          <span>cinderblock</span>
        </div>
        <button className={s.utilityButton} aria-label="Collapse sidebar" onClick={() => onUtilityAction('Sidebar collapse')}><PanelLeftClose size={17}/></button>
      </div>
      <button className={s.createButton} onClick={() => onUtilityAction('Create new')}><span className={s.plusCircle}><Plus size={12}/></span>Create new</button>
      <nav aria-label="Main navigation" className={s.navigation}>
        {navigation.map((group, index) => <div className={s.navGroup} key={index}>{group.map(({ id, label, icon: Icon }) => <button key={id} aria-current={activeSection === id ? 'page' : undefined} onClick={() => onNavigate(id)} className={s.navItem}><Icon size={19} strokeWidth={1.9}/>{label}</button>)}</div>)}
      </nav>
      <div className={s.onboarding}><div><span>Onboarding</span><button onClick={() => onUtilityAction('Onboarding')}>Continue</button></div><ProgressBar value={20} label="Onboarding: 1 of 5 tasks completed"/><p>1/5 tasks completed</p></div>
    </aside>
    <div className={s.workspace}>
      <header className={s.header}>
        {headerSearch}
        <button className={s.help} onClick={() => onUtilityAction('Help')}><CircleHelp size={18}/>Help</button>
        <button className={`${s.utilityButton} ${s.notification}`} aria-label="Notifications, 3 unread" onClick={() => onUtilityAction('Notifications')}><Bell size={22}/><span>3</span></button>
        <button className={s.utilityButton} aria-label="Settings" onClick={() => onUtilityAction('Settings')}><Settings size={22}/></button>
        <button className={s.avatar} aria-label="Account: Jennifer Nguyen" onClick={() => onUtilityAction('Account')}>JN</button>
      </header>
      <main id="workspace-content" tabIndex={-1} className={s.content}>{children}</main>
    </div>
  </div>
}
