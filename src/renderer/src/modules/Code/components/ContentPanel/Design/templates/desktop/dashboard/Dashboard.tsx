/**
 * Desktop App - Dashboard Page
 */

import { Plus } from 'lucide-react';
import { StatCard } from './StatCard';
import { ChartCard } from './ChartCard';

export function Dashboard() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tổng Quan</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
          <Plus className="w-5 h-5" />
          <span>Thêm Mới</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Tổng Doanh Thu"
          value="$45,231"
          change="+20.1%"
          trend="up"
          icon="💰"
          color="blue"
        />

        <StatCard
          label="Người Dùng Hoạt Động"
          value="2,350"
          change="+15.3%"
          trend="up"
          icon="👥"
          color="green"
        />

        <StatCard
          label="Tỷ Lệ Chuyển Đổi"
          value="3.24%"
          change="-2.4%"
          trend="down"
          icon="📊"
          color="yellow"
        />

        <StatCard
          label="Dự Án Hoàn Thành"
          value="128"
          change="+12"
          trend="up"
          icon="✅"
          color="purple"
        />
      </div>

      {/* Chart */}
      <ChartCard />
    </div>
  );
}
