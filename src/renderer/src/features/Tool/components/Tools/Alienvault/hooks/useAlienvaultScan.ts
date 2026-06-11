import { useState, useRef, useEffect } from 'react';
import { AlienvaultScanParams, ScanResult, IndicatorResult } from '../types';
import { buildRequestBody, saveScanHistory, saveIndicatorHistory } from '../utils';
import { INDICATOR_TYPES } from '../constants';

export const useAlienvaultScan = (
  getFullUrl: (path: string) => string,
  onTabChange?: (tab: 'information' | 'execution' | 'history' | 'logs') => void
) => {
  // Load saved API key from localStorage
  const getSavedApiKey = (): string => {
    const saved = localStorage.getItem('alienvault_api_key');
    return saved || '';
  };

  const [params, setParams] = useState<AlienvaultScanParams>({
    indicator: '',
    indicatorType: 'ip',
    apiKey: getSavedApiKey(),
  });
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResult | null>(null);
  const [logOutput, setLogOutput] = useState('');
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // Save API key to localStorage whenever it changes
  useEffect(() => {
    if (params.apiKey) {
      localStorage.setItem('alienvault_api_key', params.apiKey);
    }
  }, [params.apiKey]);

  const handleScan = async (
    setHistory: React.Dispatch<React.SetStateAction<ScanResult[]>>,
    setExpandedCardIndex: React.Dispatch<React.SetStateAction<number | null>>
  ) => {
    if (!params.indicator.trim()) return;
    if (!params.apiKey.trim()) {
      alert('Please enter your AlienVault OTX API key. Get one from https://otx.alienvault.com/');
      return;
    }
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
    const requestBody = buildRequestBody(params);

    try {
      const url = getFullUrl('/api/v1/alienvault/scan');
      console.log('[AlienVault] Fetching URL:', url);
      console.log('[AlienVault] Request body:', requestBody);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[AlienVault] Response status:', response.status, response.statusText);

      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AlienVault] Response not OK:', response.status, errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const rawText = await response.text();
      console.log('[AlienVault] Raw response text length:', rawText.length);
      console.log('[AlienVault] Raw response text:', rawText);

      const parsedResponse = JSON.parse(rawText);
      console.log('[AlienVault] Parsed response:', parsedResponse);
      
      const responseData = parsedResponse.data || parsedResponse;
      console.log('[AlienVault] Response data (result):', responseData);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';

      let rawOutputLines: string[] = [`AlienVault OTX lookup for ${params.indicator}`];
      if (responseData.rawOutput) {
        if (typeof responseData.rawOutput === 'string') {
          rawOutputLines = responseData.rawOutput.split('\n');
        } else if (Array.isArray(responseData.rawOutput)) {
          rawOutputLines = responseData.rawOutput;
        }
      } else if (parsedResponse.rawOutput) {
        if (typeof parsedResponse.rawOutput === 'string') {
          rawOutputLines = parsedResponse.rawOutput.split('\n');
        } else if (Array.isArray(parsedResponse.rawOutput)) {
          rawOutputLines = parsedResponse.rawOutput;
        }
      }

      // Set log output for CodeBlock display
      setLogOutput(rawOutputLines.join('\n'));

      let indicatorResult: IndicatorResult | null = null;
      // Server trả về data trực tiếp, không có field result
      if (responseData && responseData.type) {
        indicatorResult = responseData as IndicatorResult;
      } else if (responseData.result) {
        indicatorResult = responseData.result;
      }

      const scanResult: ScanResult = {
        status: 'completed',
        indicator: params.indicator,
        indicatorType: params.indicatorType,
        duration: duration,
        timestamp: Date.now(),
        result: indicatorResult,
        rawOutput: rawOutputLines,
      };

      setHistory((prev) => {
        const updated = [scanResult, ...prev.slice(0, 9)];
        saveScanHistory(updated);
        return updated;
      });
      saveIndicatorHistory(params.indicator, () => {});
      setScanning(false);
      setExpandedCardIndex(0);
      if (onTabChange) onTabChange('history');
    } catch (error) {
      console.error('AlienVault lookup failed:', error);
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLogOutput(`Error: ${errorMsg}`);

      const errorResult: ScanResult = {
        status: 'error',
        indicator: params.indicator,
        indicatorType: params.indicatorType,
        duration: ((Date.now() - startTime) / 1000).toFixed(2) + 's',
        timestamp: Date.now(),
        result: null,
        rawOutput: [`Error: ${errorMsg}`],
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
    logOutput,
    handleScan,
  };
};