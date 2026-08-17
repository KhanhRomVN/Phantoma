/**
 * Chart Card Component
 */

export function ChartCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Doanh Thu Theo Tháng</h2>
        <p className="text-sm text-gray-500">Tổng quan doanh thu 6 tháng gần nhất</p>
      </div>

      {/* Chart Placeholder */}
      <div className="h-80 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📈</div>
          <p className="text-lg text-gray-600 font-medium">
            Biểu đồ doanh thu sẽ được hiển thị tại đây
          </p>
          <p className="text-sm text-gray-500 mt-2">
            (Chart.js, Recharts, hoặc library khác)
          </p>
        </div>
      </div>
    </div>
  );
}
