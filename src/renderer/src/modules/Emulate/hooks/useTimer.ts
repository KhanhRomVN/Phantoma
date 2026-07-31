import { useState, useEffect, useCallback } from 'react';

interface UseTimerOptions {
  initialRunning?: boolean;
  onTick?: (elapsed: number) => void;
  interval?: number;
}

export function useTimer(options: UseTimerOptions = {}) {
  const { initialRunning = false, onTick, interval = 1000 } = options;

  const [isRunning, setIsRunning] = useState(initialRunning);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [display, setDisplay] = useState('00:00');

  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const start = useCallback(() => {
    setIsRunning(true);
    setStartTime(Date.now());
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    setStartTime(null);
    setElapsed(0);
    setDisplay('00:00');
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    setIsRunning(true);
    setStartTime(Date.now() - elapsed);
  }, [elapsed]);

  const reset = useCallback(() => {
    setElapsed(0);
    setDisplay('00:00');
    if (isRunning) {
      setStartTime(Date.now());
    }
  }, [isRunning]);

  // Timer update effect
  useEffect(() => {
    if (!isRunning || !startTime) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const newElapsed = now - startTime;
      setElapsed(newElapsed);
      setDisplay(formatTime(newElapsed));
      onTick?.(newElapsed);
    }, interval);

    return () => clearInterval(timer);
  }, [isRunning, startTime, interval, formatTime, onTick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsRunning(false);
    };
  }, []);

  return {
    isRunning,
    elapsed,
    display,
    start,
    stop,
    pause,
    resume,
    reset,
  };
}

export function useTimerMap() {
  const [timers, setTimers] = useState<Record<string, { startTime: number; elapsed: number }>>({});

  const startTimer = useCallback((id: string) => {
    setTimers((prev) => ({
      ...prev,
      [id]: { startTime: Date.now(), elapsed: 0 },
    }));
  }, []);

  const stopTimer = useCallback((id: string) => {
    setTimers((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const getTimerDisplay = useCallback((id: string): string => {
    const timer = timers[id];
    if (!timer) return '00:00';

    const elapsed = Date.now() - timer.startTime + timer.elapsed;
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [timers]);

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      // This triggers re-render for display updates
      setTimers((prev) => ({ ...prev }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    timers,
    startTimer,
    stopTimer,
    getTimerDisplay,
  };
}

export default useTimer;