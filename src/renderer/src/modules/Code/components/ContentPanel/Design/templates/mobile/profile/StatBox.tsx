/**
 * Stat Box Component
 */

interface StatBoxProps {
  value: string;
  label: string;
}

export function StatBox({ value, label }: StatBoxProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
      <div className="text-2xl font-bold text-purple-600 mb-1">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
