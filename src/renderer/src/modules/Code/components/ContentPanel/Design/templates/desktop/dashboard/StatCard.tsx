/**
 * Stat Card Component
 */

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

export function StatCard({ label, value, change, trend, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>

      <div className="flex items-center gap-1">
        <span
          className={`text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {change}
        </span>
        <span className="text-sm text-gray-500">so với tháng trước</span>
      </div>
    </div>
  );
}
