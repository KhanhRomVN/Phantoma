import { useState, useEffect, useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

const STORAGE_KEY = 'systema-compares-global';

export interface SavedCompare {
  id: string;
  name: string;
  desc?: string;
  url1: string;
  url2: string;
  createdAt: number;
}

export function useSavedCompares() {
  const [compares, setCompares] = useLocalStorage<SavedCompare[]>(STORAGE_KEY, []);

  const addCompare = useCallback((compare: SavedCompare) => {
    setCompares((prev) => [...prev, compare]);
  }, [setCompares]);

  const updateCompare = useCallback((id: string, updates: Partial<SavedCompare>) => {
    setCompares((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
  }, [setCompares]);

  const deleteCompare = useCallback((id: string) => {
    setCompares((prev) => prev.filter((c) => c.id !== id));
  }, [setCompares]);

  const getCompare = useCallback((id: string) => {
    return compares.find((c) => c.id === id);
  }, [compares]);

  return {
    compares,
    addCompare,
    updateCompare,
    deleteCompare,
    getCompare,
  };
}

export default useSavedCompares;