import type { ReactNode } from 'react';
import { cn } from '@renderer/shared/utils/cn';

export type TargetType = 'person' | 'website' | 'domain' | 'phone' | 'company' | 'other';

/** Nhãn + màu accent cho từng loại mục tiêu (dùng chung cho LeftPanel và ContentPanel). */
export const TYPE_META: Record<TargetType, { label: string; color: string }> = {
  person: { label: 'Person', color: '#3686ff' },
  website: { label: 'Website', color: '#a855f7' },
  domain: { label: 'Domain', color: '#22c55e' },
  phone: { label: 'Phone', color: '#f97316' },
  company: { label: 'Company', color: '#eab308' },
  other: { label: 'Other', color: '#9ca3af' },
};

export const TYPE_ORDER = Object.keys(TYPE_META) as TargetType[];

/** Chuẩn hoá type thô (từ _index.recon hoặc ReconTarget) về TargetType, mặc định 'other'. */
export function resolveType(raw?: string): TargetType {
  const key = (raw || '').toLowerCase();
  return key in TYPE_META ? (key as TargetType) : 'other';
}

/** Gắn alpha (0-1) vào màu hex #rrggbb. */
export function withAlpha(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
}

/** Icon theo loại mục tiêu. */
export function TypeIcon({ type, size = 14 }: { type: TargetType; size?: number }) {
  let shape: ReactNode;
  switch (type) {
    case 'person':
      shape = (
        <>
          <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
          <circle cx='12' cy='7' r='4' />
        </>
      );
      break;
    case 'website':
      shape = (
        <>
          <circle cx='12' cy='12' r='10' />
          <line x1='2' y1='12' x2='22' y2='12' />
          <path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' />
        </>
      );
      break;
    case 'domain':
      shape = (
        <>
          <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' />
          <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' />
        </>
      );
      break;
    case 'phone':
      shape = (
        <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' />
      );
      break;
    case 'company':
      shape = (
        <>
          <rect x='4' y='2' width='16' height='20' rx='2' />
          <path d='M9 22v-4h6v4' />
          <path d='M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01' />
        </>
      );
      break;
    default:
      shape = <circle cx='12' cy='12' r='3' />;
  }

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {shape}
    </svg>
  );
}

/**
 * Badge icon bo góc: nền = màu type giảm opacity, không outline.
 * Mặc định 32px (card LeftPanel); truyền className để đổi kích thước/bo góc (vd. header ContentPanel).
 */
export function TypeBadgeIcon({
  type,
  className,
  iconSize = 16,
}: {
  type: TargetType;
  className?: string;
  iconSize?: number;
}) {
  const { color } = TYPE_META[type];
  return (
    <div
      className={cn('flex items-center justify-center shrink-0', className ?? 'w-8 h-8 rounded-md')}
      style={{ backgroundColor: withAlpha(color, 0.15), color }}
    >
      <TypeIcon type={type} size={iconSize} />
    </div>
  );
}