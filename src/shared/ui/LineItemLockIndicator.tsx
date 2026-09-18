import { IconLock } from '@tabler/icons-react'

import s from './LineItemLockIndicator.module.css'

type Props = {
  reason: string
}

export function LineItemLockIndicator({ reason }: Props) {
  return <span className={s.indicator} aria-label={reason} tabIndex={0}>
    <IconLock size={14} stroke={1.8} aria-hidden="true"/>
    <span className={s.tooltip} role="tooltip">{reason}</span>
  </span>
}
