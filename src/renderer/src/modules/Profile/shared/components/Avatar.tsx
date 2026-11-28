import { useEffect, useState } from 'react';
import { cn } from '@renderer/utils/cn';

interface AvatarProps {
  name: string;
  hue: number;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, hue, src, size = 32, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const radius = Math.max(6, Math.round(size * 0.25));
  const showImage = !!src && !failed;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden font-semibold text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        borderRadius: radius,
        background: showImage
          ? 'transparent'
          : `linear-gradient(135deg, hsl(${hue} 65% 52%), hsl(${(hue + 40) % 360} 60% 40%))`,
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </div>
  );
}

export default Avatar;