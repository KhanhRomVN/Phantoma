import { SectionLabel } from '../ui/SectionLabel'
import { TreeItem } from './TreeItem'
import { mockWordlists, mockCVEs } from '../PhantomLayout/mockData'

export function ArsenalPanel() {
  return (
    <>
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

      <SectionLabel>CVE Database</SectionLabel>
      {mockCVEs.map((cve) => (
        <TreeItem
          key={cve.id}
          label={cve.label}
          badge={cve.badge}
          badgeColor={cve.badgeColor}
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
              className={`w-3.5 h-3.5 ${cve.badgeColor === 'red' ? 'text-red-400' : cve.badgeColor === 'purple' ? 'text-purple-400' : 'text-amber-400'}`}
            >
              <path d="M8 1l6 3v4c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V4z"/>
            </svg>
          }
        />
      ))}
    </>
  )
}
