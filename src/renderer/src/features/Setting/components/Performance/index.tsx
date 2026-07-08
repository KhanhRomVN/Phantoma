import React, { useEffect, useCallback, useState } from 'react';
import { Activity, Copy, Check, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { usePerformanceMetrics } from '../../hooks/usePerformanceMetrics';
export const Performance: React.FC = () => {
  const {
    components,
    isScanning,
  } = usePerformanceMetrics();

  const [copied, setCopied] = React.useState(false);

  const copyPerformanceData = useCallback(() => {
    const lines: string[] = [];
    const timestamp = new Date().toLocaleString();

    lines.push('=== PERFORMANCE REPORT ===');
    lines.push(`Generated: ${timestamp}`);
    lines.push('');

    // FPS Drop Locations - sorted by average render time
    const sortedByAvg = [...components]
      .filter(c => c.renderCount > 0)
      .sort((a, b) => b.avgRenderTime - a.avgRenderTime);
    
    lines.push('--- Vị trí gây giảm FPS (theo thời gian render trung bình) ---');
    if (sortedByAvg.length === 0) {
      lines.push('  No data collected yet');
    } else {
      sortedByAvg.forEach((c, i) => {
        lines.push(`  ${i + 1}. ${c.name}: ${c.avgRenderTime.toFixed(1)}ms avg, ${c.renderCount}x renders, total ${c.totalRenderTime.toFixed(1)}ms`);
      });
    }
    lines.push('');

    // Re-render summary
    const totalRenders = components.reduce((sum, c) => sum + c.renderCount, 0);
    lines.push('--- Re-render Summary ---');
    lines.push(`  Total components tracked: ${components.length}`);
    lines.push(`  Total re-renders: ${totalRenders}`);
    if (components.length > 0) {
      const avgRenders = (totalRenders / components.length).toFixed(1);
      lines.push(`  Average renders per component: ${avgRenders}`);
    }
    lines.push('');

    lines.push('=== END REPORT ===');

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [components]);
  // Simulate web vitals data for demo (in real app, this would come from web-vitals library)
  useEffect(() => {
    // This is a placeholder - in production, web-vitals would be integrated
    // The actual web-vitals data would come from the library via the hook
  }, []);

  const [sortBy, setSortBy] = useState<'avgRenderTime' | 'totalRenderTime'>('avgRenderTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedComponents = [...components]
    .filter(c => c.renderCount > 0)
    .sort((a, b) => {
      const aVal = sortBy === 'avgRenderTime' ? a.avgRenderTime : a.totalRenderTime;
      const bVal = sortBy === 'avgRenderTime' ? b.avgRenderTime : b.totalRenderTime;
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });

  const toggleSort = (field: 'avgRenderTime' | 'totalRenderTime') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'avgRenderTime' | 'totalRenderTime' }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    return sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Performance Monitor</h2>
          {isScanning && (
            <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full animate-pulse">
              ● Scanning
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyPerformanceData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Copy performance report to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Report
              </>
            )}
          </button>
          <div className="text-xs text-text-secondary">
            Updated in real-time
          </div>
        </div>
      </div>

      {/* Vị trí gây giảm FPS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Vị trí gây giảm FPS
          </h3>
          <span className="text-xs text-text-secondary">
            {sortedComponents.length} components tracked
          </span>
        </div>

        <div className="bg-sidebar-item-hover rounded-lg border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-background/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Component
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Số lần render
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary transition-colors select-none"
                    onClick={() => toggleSort('avgRenderTime')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Thời gian TB
                      <SortIcon field="avgRenderTime" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary transition-colors select-none"
                    onClick={() => toggleSort('totalRenderTime')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Tổng thời gian
                      <SortIcon field="totalRenderTime" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {sortedComponents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                      <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p>Chưa có dữ liệu render nào</p>
                      <p className="text-xs mt-1">Tương tác với ứng dụng để thu thập dữ liệu</p>
                    </td>
                  </tr>
                ) : (
                  sortedComponents.map((comp) => {
                    const severity = comp.avgRenderTime > 50 ? 'high' : comp.avgRenderTime > 20 ? 'medium' : 'low';
                    const color = severity === 'high' ? 'text-red-500' : severity === 'medium' ? 'text-yellow-500' : 'text-blue-500';
                    return (
                      <tr key={comp.name} className="hover:bg-sidebar-item-hover/50 transition-colors">
                        <td className="px-4 py-3 text-text-primary font-mono text-xs truncate max-w-[200px]">
                          {comp.name}
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary">
                          {comp.renderCount}x
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${color}`}>
                          {comp.avgRenderTime.toFixed(1)}ms
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary">
                          {comp.totalRenderTime.toFixed(1)}ms
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Legend / Help */}
      <div className="text-xs text-text-secondary border-t border-border pt-4 mt-2">
        <p>💡 Dữ liệu được thu thập từ React Scan và Long Task API</p>
        <p className="mt-1">🟢 {'<'} 20ms &nbsp; 🟡 20-50ms &nbsp; 🔴 {'>'} 50ms (gây giảm FPS nghiêm trọng)</p>
      </div>
    </div>
  );
};

export default Performance;