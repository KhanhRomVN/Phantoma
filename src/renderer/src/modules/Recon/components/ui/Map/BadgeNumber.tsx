import { cn } from '@renderer/shared/utils/cn';

interface Props {
  index: number;
  color: string;
  size?: 'sm' | 'md';
}

const SIZE_CLASS = {
  sm: 'w-5 h-5',
  md: 'w-[26px] h-[26px]',
};

export default function BadgeNumber({ index, color, size = 'sm' }: Props) {
  return (
    <div
      className={cn(
        'shrink-0 flex items-center justify-center rounded-md font-mono font-semibold text-xs',
        SIZE_CLASS[size],
      )}
      style={{ backgroundColor: color, color: '#0d1017' }}
    >
      {index + 1}
    </div>
  );
}