import { useState, useEffect } from 'react';
import { ScanResult } from '../types';
import { saveScanHistory } from '../utils';

export const useHistory = () => {
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedScanForDetail, setSelectedScanForDetail] = useState<ScanResult | null>(null);
  const [indicatorHistory, setIndicatorHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('alienvault_indicator_history');
    if (saved) {
      try {
        setIndicatorHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load indicator history', e);
      }
    }
    const savedHistory = localStorage.getItem('alienvault_scan_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch (e) {
        console.error('Failed to load scan history', e);
      }
    }
  }, []);

  const deleteScan = (scanToDelete: ScanResult) => {
    const updatedHistory = history.filter((scan) => scan.timestamp !== scanToDelete.timestamp);
    setHistory(updatedHistory);
    saveScanHistory(updatedHistory);
    if (selectedScanForDetail?.timestamp === scanToDelete.timestamp) {
      setShowDetailView(false);
      setSelectedScanForDetail(null);
    }
  };

  const filteredHistory = history.filter((scan) => {
    if (!historySearchQuery.trim()) return true;
    const query = historySearchQuery.toLowerCase();
    return (
      scan.indicator.toLowerCase().includes(query) ||
      scan.indicatorType.toLowerCase().includes(query) ||
      (scan.result?.malwareFamilies?.some(f => f.toLowerCase().includes(query)) || false) ||
      (scan.result?.pulses?.some(p => p.name.toLowerCase().includes(query)) || false)
    );
  });

  return {
    history,
    setHistory,
    expandedCardIndex,
    setExpandedCardIndex,
    historySearchQuery,
    setHistorySearchQuery,
    showDetailView,
    setShowDetailView,
    selectedScanForDetail,
    setSelectedScanForDetail,
    indicatorHistory,
    setIndicatorHistory,
    deleteScan,
    filteredHistory,
  };
};