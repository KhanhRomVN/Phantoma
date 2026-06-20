import { useState, useRef, useEffect } from 'react';
import { NmapScanParams, ScanResult } from '../types';
import { buildFlags, saveScanHistory, saveTargetHistory } from '../utils';
import { SCAN_TYPES } from '../constants';

export const useNmapScan = (
  getFullUrl: (path: string) => string,
  onTabChange?: (tab: 'information' | 'execution' | 'history' | 'logs') => void,
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
  const currentScanIdRef = useRef<string | null>(null);

  const handleScan = async (
    setHistory: React.Dispatch<React.SetStateAction<ScanResult[]>>,
    setExpandedCardIndex: React.Dispatch<React.SetStateAction<number | null>>,
  ) => {
    if (!params.target.trim()) return;
    setScanning(true);
    setResults(null);
    setProgress(0);
    setLogOutput('');

    const startTime = Date.now();
    const flags = buildFlags(params);

    // Build POST URL (streaming endpoint)
    const scanUrl = getFullUrl('/api/v1/nmap/scan');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(scanUrl, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: params.target,
          flags: flags,
        }),
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
      let currentEvent = '';

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (currentEvent === 'start') {
              // Parse scan ID from start event
              try {
                const startData = JSON.parse(data);
                if (startData.scanId) {
                  currentScanIdRef.current = startData.scanId;
                }
                setLogOutput(
                  (prev) => prev + `[Scan started: ${startData.message || 'starting...'}]\n`,
                );
              } catch (e) {
                // Fallback: just show the message
                setLogOutput((prev) => prev + `[Scan started: ${data}]\n`);
              }
            } else {
              // Check if this line contains stats progress
              if (data.includes('Stats:') && data.includes('% done')) {
                // Extract percentage from stats line
                const percentMatch = data.match(/(\d+(?:\.\d+)?)%\s+done/);
                if (percentMatch) {
                  const percent = parseFloat(percentMatch[1]);
                  // Cap at 95 to leave room for final 100 on completion
                  const cappedPercent = Math.min(percent, 95);
                  setProgress(Math.round(cappedPercent));
                }
              }
              rawOutputLines.push(data);
              setLogOutput((prev) => prev + data + '\n');
            }

            if (currentEvent === 'done') {
              done = true;
              break;
            }
          }
        }
      }

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
        setLogOutput((prev) => prev + '\n[Scan aborted by user]\n');
      } else {
        console.error('Nmap scan failed:', error);
        setLogOutput((prev) => prev + `\n[Error: ${error?.message || 'Unknown error'}]\n`);
      }

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

  const cancelScan = async () => {
    const scanId = currentScanIdRef.current;
    if (!scanId) {
      return;
    }

    // Call backend cancel endpoint
    try {
      const cancelUrl = getFullUrl('/api/v1/nmap/scan/cancel');
      await fetch(cancelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scanId }),
      });
    } catch (err) {
      console.error('[Nmap] Cancel API call failed:', err);
    }

    // Abort the fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    currentScanIdRef.current = null;
    setScanning(false);
    setProgress(100);
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
    cancelScan,
  };
};
