// ============================================================================
// Tag — Small label/badge component
// ============================================================================

interface TagProps {
  label: string;
  color: string;
}

export function Tag({ label, color }: TagProps) {
  return (
    <span
      style={{
        fontSize: 8,
        fontWeight: 700,
        padding: '2px 6px',
        borderRadius: 3,
        border: `1px solid ${color}30`,
        background: `${color}12`,
        color,
        letterSpacing: '0.08em',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </span>
  );
}