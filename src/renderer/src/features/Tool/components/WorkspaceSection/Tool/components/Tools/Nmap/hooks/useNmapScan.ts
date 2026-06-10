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
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const handleScan = async (
    setHistory: React.Dispatch<React.SetStateAction<ScanResult[]>>,
    setExpandedCardIndex: React.Dispatch<React.SetStateAction<number | null>>
  ) => {
    if (!params.target.trim()) return;
    setScanning(true);
    setResults(null);
    setProgress(0);

    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 8;
      if (p >= 90) p = 90;
      setProgress(Math.round(p));
    }, 200);

    const startTime = Date.now();
    const flags = buildFlags(params);

    try {
      const url = getFullUrl('/api/v1/nmap/scan');
      console.log('[Nmap] Fetching URL:', url);
      console.log('[Nmap] Request body:', { target: params.target, flags });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: params.target,
          flags: flags,
        }),
      });

      console.log('[Nmap] Response status:', response.status, response.statusText);

      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Nmap] Response not OK:', response.status, errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const rawText = await response.text();
      console.log('[Nmap] Raw response text length:', rawText.length);

      const parsedResponse = JSON.parse(rawText);
      const responseData = parsedResponse.data || parsedResponse;
      const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';

      let rawOutputLines: string[] = [`Nmap scan completed for ${params.target}`];
      if (responseData.rawOutput) {
        if (typeof responseData.rawOutput === 'string') {
          rawOutputLines = responseData.rawOutput.split('\n');
        } else if (Array.isArray(responseData.rawOutput)) {
          rawOutputLines = responseData.rawOutput;
        }
      }

      const scanResult: ScanResult = {
        status: 'completed',
        target: params.target,
        scanType: SCAN_TYPES.find((s) => s.value === params.scanType)?.label || '',
        duration: duration,
        timestamp: Date.now(),
        ports: (responseData.ports || []).map((p: any) => ({
          port: p.port,
          protocol: p.proto || 'tcp',
          service: p.service || '',
          state: p.state === 'open' ? 'open' : p.state === 'filtered' ? 'filtered' : 'closed',
          version: p.product || undefined,
        })),
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
    } catch (error) {
      console.error('Nmap scan failed:', error);
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
    };
  }, []);

  return {
    params,
    setParams,
    scanning,
    progress,
    results,
    handleScan,
  };
};