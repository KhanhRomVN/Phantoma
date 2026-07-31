// ============================================================================
// Btn — Styled button component
// ============================================================================

interface BtnProps {
  label: string;
  color?: string;
  onClick?: (e?: React.MouseEvent) => void;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

export function Btn({ label, color = $('--primary'), onClick, disabled, size = 'sm' }: BtnProps) {
  const fs = size === 'xs' ? 8 : size === 'sm' ? 9 : 10;
  const px = size === 'xs' ? 7 : size === 'sm' ? 10 : 14;
  const py = size === 'xs' ? 3 : size === 'sm' ? 4 : 6;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-bold rounded font-mono tracking-[0.08em] transition-all duration-150"
      style={{
        fontSize: fs,
        padding: `${py}px ${px}px`,
        border: `1px solid ${disabled ? $('--border') : `${color}30`}`,
        background: disabled ? 'transparent' : `${color}10`,
        color: disabled ? $('--text-secondary') : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = `${color}20`;
          e.currentTarget.style.borderColor = `${color}50`;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = `${color}10`;
          e.currentTarget.style.borderColor = `${color}30`;
        }
      }}
    >
      {label}
    </button>
  );
}
