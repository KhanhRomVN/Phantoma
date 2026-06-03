import { cn } from '../../../../../../shared/lib/utils'
import { CVSS_COLOR, CVSS_STROKE } from '../../../../constants/severity'
import { SeverityLevel } from '../../../../types/phantom'

interface CvssRingProps {
  score: number
  severity: SeverityLevel
}

const CIRCUMFERENCE = 163.4

export function CvssRing({ score, severity }: CvssRingProps) {
  const offset = CIRCUMFERENCE - (score / 10) * CIRCUMFERENCE
  return (
    <div className="flex flex-col items-center mb-4">
      <div className="relative w-16 h-16 flex items-center justify-center mb-1">
        <svg className="absolute inset-0" width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#252e42" strokeWidth="5" />
          <circle cx="32" cy="32" r="26" fill="none"
            stroke={CVSS_STROKE(score)} strokeWidth="5"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 32 32)"
          />
        </svg>
        <span className={cn('text-xl font-bold', CVSS_COLOR(score))}>{score}</span>
      </div>
      <div className="text-[9.5px] text-[#6b7a96]">CVSS 3.1 — {severity}</div>
    </div>
  )
}
