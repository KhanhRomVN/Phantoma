import { useState, useRef, useEffect } from 'react';
import { AmassScanParams, AmassScanResult, SubdomainResult } from '../types';
import { buildFlags, parseAmassOutput, saveScanHistory, saveTargetHistory } from '../utils';
import { MODES } from '../constants';

export const useAmassScan = (
  getFullUrl: (path: string) => string,
  onTabChange?: (tab: 'information' | 'execution' | 'history' | 'logs') => void,
) => {
  const [params, setParams] = useState<AmassScanParams>({
    target: '',
    mode: 'enum',
    passiveOnly: true,
    activeEnabled: false,
    bruteForce: false,
    wordlist: '',
    includeSources: '',
    excludeSources: '',
    resolvers: '',
    dnsQps: 10,
    timeout: 60,
    outputFormat: 'text',
    additionalFlags: '',
  });
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AmassScanResult | null>(null);
  const [logOutput, setLogOutput] = useState('');
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleScan = async (
    setHistory: React.Dispatch<React.SetStateAction<AmassScanResult[]>>,
    setExpandedCardIndex: React.Dispatch<React.SetStateAction<number | null>>,
  ) => {
    if (!params.target.trim()) return;
    setScanning(true);
    setResults(null);
    setProgress(0);
    setLogOutput('');

    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 5;
      if (p >= 90) p = 90;
      setProgress(Math.round(p));
    }, 300);

    const startTime = Date.now();
    const flags = buildFlags(params);

    // Build SSE URL
    const flagsQuery = flags.join(',');
    const streamUrl = getFullUrl(
      `/api/v1/amass/scan/stream?target=${encodeURIComponent(params.target)}&flags=${encodeURIComponent(flagsQuery)}`,
    );

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let rawOutputLines: string[] = [];
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            rawOutputLines.push(data);
            setLogOutput((prev) => prev + data + '\n');
          } else if (line.startsWith('event: done')) {
            done = true;
            break;
          }
        }
      }

      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';

      // Parse subdomains from raw output
      const rawOutput = rawOutputLines.join('\n');
      let subdomains: SubdomainResult[] = parseAmassOutput(rawOutput);

      const scanResult: AmassScanResult = {
        status: 'completed',
        target: params.target,
        mode: MODES.find((m) => m.value === params.mode)?.label || params.mode,
        duration: duration,
        timestamp: Date.now(),
        subdomains: subdomains,
        stats: {
          total: subdomains.length,
          unique: subdomains.length,
          fromPassive: params.passiveOnly ? subdomains.length : 0,
          fromActive: params.activeEnabled ? subdomains.length : 0,
        },
        rawOutput: rawOutputLines,
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
        console.error('Amass scan failed:', error);
        setLogOutput((prev) => prev + `\n[Error: ${error?.message || 'Unknown error'}]\n`);
      }

      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      const errorResult: AmassScanResult = {
        status: 'error',
        target: params.target,
        mode: MODES.find((m) => m.value === params.mode)?.label || params.mode,
        duration: ((Date.now() - startTime) / 1000).toFixed(2) + 's',
        timestamp: Date.now(),
        subdomains: [],
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
