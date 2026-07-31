import { useState, useEffect, useRef, useCallback } from 'react';

export interface ComponentMetric {
  name: string;
  renderCount: number;
  lastRenderTime: number;
  avgRenderTime: number;
  totalRenderTime: number;
}

export interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface LongTask {
  startTime: number;
  duration: number;
  attribution: string[];
  timestamp: number;
}

export interface PerformanceHistoryEntry {
  timestamp: number;
  metrics: WebVitalMetric[];
  componentCount: number;
  longTaskCount: number;
}

interface UsePerformanceMetricsReturn {
  components: ComponentMetric[];
  webVitals: WebVitalMetric[];
  longTasks: LongTask[];
  history: PerformanceHistoryEntry[];
  clearHistory: () => void;
  isScanning: boolean;
}

export function usePerformanceMetrics(): UsePerformanceMetricsReturn {
  const [components, setComponents] = useState<ComponentMetric[]>([]);
  const [webVitals, setWebVitals] = useState<WebVitalMetric[]>([]);
  const [longTasks, setLongTasks] = useState<LongTask[]>([]);
  const [history, setHistory] = useState<PerformanceHistoryEntry[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const historyIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track component render counts from react-scan
  useEffect(() => {
    // @ts-ignore - react-scan exposes global
    if (typeof window !== 'undefined' && window.__REACT_SCAN__) {
      setIsScanning(true);
      // react-scan will automatically log, we can listen to custom events
    }

    // Custom event listener for component renders from react-scan
    const handleComponentRender = (event: CustomEvent) => {
      const { componentName, renderTime } = event.detail || {};
      if (componentName) {
        setComponents((prev) => {
          const existing = prev.find((c) => c.name === componentName);
          if (existing) {
            return prev.map((c) =>
              c.name === componentName
                ? {
                    ...c,
                    renderCount: c.renderCount + 1,
                    lastRenderTime: renderTime || Date.now(),
                    avgRenderTime:
                      (c.avgRenderTime * c.renderCount + (renderTime || 0)) /
                      (c.renderCount + 1),
                    totalRenderTime: c.totalRenderTime + (renderTime || 0),
                  }
                : c
            );
          }
          return [
            ...prev,
            {
              name: componentName,
              renderCount: 1,
              lastRenderTime: renderTime || Date.now(),
              avgRenderTime: renderTime || 0,
              totalRenderTime: renderTime || 0,
            },
          ];
        });
      }
    };

    // Listen for custom events if react-scan dispatches them
    window.addEventListener(
      'react-scan:render',
      handleComponentRender as EventListener
    );

    return () => {
      window.removeEventListener(
        'react-scan:render',
        handleComponentRender as EventListener
      );
    };
  }, []);

  // Track long tasks
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const newTasks: LongTask[] = entries
        .filter((entry) => entry.entryType === 'longtask')
        .map((entry) => ({
          startTime: entry.startTime,
          duration: entry.duration,
          attribution: (entry as any).attribution?.map((a: any) => a.containerName || a.name || 'unknown') || [],
          timestamp: Date.now(),
        }));

      if (newTasks.length > 0) {
        setLongTasks((prev) => [...prev, ...newTasks].slice(-100)); // Keep last 100
      }
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Long task observation not supported
    }

    return () => observer.disconnect();
  }, []);

  // Save history periodically
  useEffect(() => {
    const saveHistory = () => {
      if (components.length === 0 && webVitals.length === 0 && longTasks.length === 0) return;

      const entry: PerformanceHistoryEntry = {
        timestamp: Date.now(),
        metrics: [...webVitals],
        componentCount: components.length,
        longTaskCount: longTasks.length,
      };

      setHistory((prev) => {
        const updated = [entry, ...prev].slice(0, 50); // Keep last 50 entries
        try {
          localStorage.setItem('performance-history', JSON.stringify(updated));
        } catch (e) {
          // Ignore
        }
        return updated;
      });
    };

    // Save every 30 seconds
    historyIntervalRef.current = setInterval(saveHistory, 30000);

    // Load history from localStorage
    try {
      const stored = localStorage.getItem('performance-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (e) {
      // Ignore
    }

    return () => {
      if (historyIntervalRef.current) {
        clearInterval(historyIntervalRef.current);
      }
    };
  }, [components, webVitals, longTasks]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem('performance-history');
    } catch (e) {
      // Ignore
    }
  }, []);

  return {
    components,
    webVitals,
    longTasks,
    history,
    clearHistory,
    isScanning,
  };
}