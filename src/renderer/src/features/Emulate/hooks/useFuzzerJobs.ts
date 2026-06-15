import { useState, useEffect, useCallback } from 'react';
import { FuzzerJob } from '../components/Payload';
import useLocalStorage from './useLocalStorage';

const STORAGE_KEY = 'systema-fuzzer-jobs';

export function useFuzzerJobs() {
  const [jobs, setJobs] = useLocalStorage<FuzzerJob[]>(STORAGE_KEY, []);

  const addJob = useCallback((job: FuzzerJob) => {
    setJobs((prev) => [job, ...prev]);
  }, [setJobs]);

  const updateJob = useCallback((id: string, updates: Partial<FuzzerJob>) => {
    setJobs((prev) => prev.map((job) => job.id === id ? { ...job, ...updates } : job));
  }, [setJobs]);

  const deleteJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== id));
  }, [setJobs]);

  const getJob = useCallback((id: string) => {
    return jobs.find((job) => job.id === id);
  }, [jobs]);

  return {
    jobs,
    addJob,
    updateJob,
    deleteJob,
    getJob,
  };
}

export default useFuzzerJobs;