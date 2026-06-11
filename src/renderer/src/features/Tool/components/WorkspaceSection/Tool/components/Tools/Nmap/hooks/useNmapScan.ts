import { useState, useRef, useEffect } from 'react';
import { NmapScanParams, ScanResult } from '../types';
import { buildFlags, saveScanHistory, saveTargetHistory } from '../utils';
import { SCAN_TYPES } from '../constants';

export const useNmapScan = (
  getFullUrl: (path: string) => string,
  onTabChange?: (tab: 'information' | 'execution' | 'history' | 'logs') => void
) => {
  const [params, setParams] = useState<NmapScanParams>({
    target: '',
    scanType: 'syn',
    ports: '',
    aggressive: false,
    osDetection: true,
    versionDetection: true,
    timing: '3',
    additionalFlags: '',
  });
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResult | null>(null);
  const [logOutput, setLogOutput] = useState('');
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleScan = async (
    setHistory: React.Dispatch<React.SetStateAction<ScanResult[]>>,
    setExpandedCardIndex: React.Dispatch<React.SetStateAction<number | null>>
  ) => {
    if (!params.target.trim()) return;
    setScanning(true);
    setResults(null);
    setProgress(0);
    setLogOutput('');

    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 8;
      if (p >= 90) p = 90;
      setProgress(Math.round(p));
    }, 200);

    const startTime = Date.now();
    const flags = buildFlags(params);

    // Build SSE URL
    const flagsQuery = flags.join(',');
    const streamUrl = getFullUrl(
      `/api/v1/nmap/scan/stream?target=${encodeURIComponent(params.target)}&flags=${encodeURIComponent(flagsQuery)}`
    );

    console.log('[Nmap SSE] Connecting to:', streamUrl);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let rawOutputLines: string[] = [];
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            rawOutputLines.push(data);
            setLogOutput(prev => prev + data + '\n');
          } else if (line.startsWith('event: done')) {
            done = true;
            break;
          } else if (line.startsWith('event: error')) {
            // Error event — the next data line will have the error message
            // We'll handle it when we parse the data
          }
        }
      }

      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';

      const scanResult: ScanResult = {
        status: 'completed',
        target: params.target,
        scanType: SCAN_TYPES.find((s) => s.value === params.scanType)?.label || '',
        duration: duration,
        timestamp: Date.now(),
        ports: [],
        rawOutput: rawOutputLines,
        host: {
          ip: params.target,
          hostname: params.target,
        },
      };

      setHistory((prev) => {
        const updated = [scanResult, ...prev.slice(0, 9)];
        saveScanHistory(updated);
        return updated;
      });
      saveTargetHistory(params.target, () => {});
      setScanning(false);
      setExpandedCardIndex(0);
      if (onTabChange) onTabChange('history');
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.log('[Nmap SSE] Scan aborted');
        setLogOutput(prev => prev + '\n[Scan aborted by user]\n');
      } else {
        console.error('Nmap scan failed:', error);
        setLogOutput(prev => prev + `\n[Error: ${error?.message || 'Unknown error'}]\n`);
      }

      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      const errorResult: ScanResult = {
        status: 'error',
        target: params.target,
        scanType: SCAN_TYPES.find((s) => s.value === params.scanType)?.label || '',
        duration: ((Date.now() - startTime) / 1000).toFixed(2) + 's',
        timestamp: Date.now(),
        ports: [],
        rawOutput: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };

      setHistory((prev) => {
        const updated = [errorResult, ...prev.slice(0, 9)];
        saveScanHistory(updated);
        return updated;
      });
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    params,
    setParams,
    scanning,
    progress,
    results,
    logOutput,
    handleScan,
  };
};