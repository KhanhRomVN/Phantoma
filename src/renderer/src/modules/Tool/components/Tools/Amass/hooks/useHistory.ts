import { useState, useEffect } from 'react';
import { AmassScanResult } from '../types';
import { saveScanHistory } from '../utils';

export const useHistory = () => {
  const [history, setHistory] = useState<AmassScanResult[]>([]);
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedScanForDetail, setSelectedScanForDetail] = useState<AmassScanResult | null>(null);
  const [targetHistory, setTargetHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('amass_target_history');
    if (saved) {
      try {
        setTargetHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load target history', e);
      }
    }
    const savedHistory = localStorage.getItem('amass_scan_history');
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

  const deleteScan = (scanToDelete: AmassScanResult) => {
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
      scan.target.toLowerCase().includes(query) ||
      scan.mode.toLowerCase().includes(query) ||
      scan.subdomains.some((s) => s.name.toLowerCase().includes(query))
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
    targetHistory,
    setTargetHistory,
    deleteScan,
    filteredHistory,
  };
};