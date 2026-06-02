import { SectionLabel } from '../ui/SectionLabel'
import { Badge } from '../ui/Badge'
import { TreeItem } from './TreeItem'
import {
  mockTargets, mockWordlists, mockCredentials, mockCVEs,
} from '../PhantomLayout/mockData'

const TAG_ICON_COLOR: Record<string, string> = {
  green: 'text-green-400', red: 'text-red-400', amber: 'text-amber-400',
  cyan: 'text-cyan-400', purple: 'text-purple-400', gray: 'text-zinc-500',
}

export function TargetsPanel() {
  return (
    <>
      <SectionLabel>Active Targets</SectionLabel>
      {mockTargets.map((t) => (
        <TreeItem
          key={t.id}
          label={t.label}
          badge={t.badge}
          badgeColor={t.badgeColor}
          selected={t.id === '1'}
          selectedVariant={t.badgeColor === 'red' ? 'red' : 'cyan'}
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
              <rect x="2" y="3" width="12" height="10" rx="1.5"/>
            </svg>
          }
        />
      ))}

      <SectionLabel>Wordlists</SectionLabel>
      {mockWordlists.map((w) => (
        <TreeItem
          key={w.id}
          label={w.label}
          badge={w.badge}
          badgeColor={w.badgeColor}
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
              <path d="M3 2h10l1 3H2z"/><path d="M2 5h12v9H2z"/><path d="M5 8h6M5 11h4"/>
            </svg>
          }
        />
      ))}

      <SectionLabel>Credentials</SectionLabel>
      {mockCredentials.map((c) => (
        <TreeItem
          key={c.id}
          label={c.label}
          badge={c.badge}
          badgeColor={c.badgeColor}
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5 text-amber-500">
              <circle cx="8" cy="6" r="3"/><path d="M3 14c0-3 10-3 10 0"/>
            </svg>
          }
        />
      ))}

      <SectionLabel>CVE Database</SectionLabel>
      {mockCVEs.map((cve) => (
        <TreeItem
          key={cve.id}
          label={cve.label}
          badge={cve.badge}
          badgeColor={cve.badgeColor}
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className={`w-3.5 h-3.5 ${TAG_ICON_COLOR[cve.badgeColor]}`}>
              <path d="M8 1l6 3v4c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V4z"/>
            </svg>
          }
        />
      ))}
    </>
  )
}
