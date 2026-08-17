/**
 * StatsBar - dải số liệu ngắn ngay dưới Hero
 */

const STATS = [
  { value: '48ms', label: 'độ trễ cập nhật thuộc tính' },
  { value: '12K+', label: 'nhà thiết kế đang dùng' },
  { value: '3.2M', label: 'thao tác chỉnh sửa / tháng' },
  { value: '99.95%', label: 'uptime canvas AI' },
];

export function StatsBar() {
  return (
    <div className="border-y border-black/5 dark:border-white/5 bg-white/60 dark:bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center md:text-left">
            <div className="font-mono text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text text-transparent">
              {stat.value}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
