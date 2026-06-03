import { SectionLabel } from '../ui/SectionLabel'
import { TreeItem } from './TreeItem'
import { mockTargets } from '../PhantomLayout/mockData'

export function TargetsPanel() {
  return (
    <>
      <SectionLabel>Active Targets</SectionLabel>
      {mockTargets.map((t, i) => (
        <TreeItem
          key={t.id}
          label={t.label}
          badge={t.badge}
          badgeColor={t.badgeColor}
          selected={i === 0}
          selectedVariant={t.badgeColor === 'red' ? 'red' : 'cyan'}
          icon={
            i === 3 ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
                <path d="M8 2L3 7v7h10V7z"/>
              </svg>
            ) : i === 2 ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
                <rect x="2" y="5" width="12" height="8" rx="1"/><path d="M5 5V4a3 3 0 0 1 6 0v1"/>
              </svg>
            ) : i === 1 ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
                <circle cx="8" cy="8" r="6"/>
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
                <rect x="2" y="3" width="12" height="10" rx="1.5"/>
              </svg>
            )
          }
        />
      ))}
    </>
  )
}
