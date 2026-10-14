import React from 'react';

interface UseWorkspaceZipSizeResult {
  isLoading: boolean;
  sizeBytes: number | null;
  error: string | null;
}

/**
 * Hook to estimate the size of the workspace when zipped for Claude provider.
 * In a real Electron app, this would likely invoke an IPC call to the main process
 * to perform the actual zip calculation or estimation without blocking UI.
 *
 * Here we simulate/mock it or prepare the structure for such integration.
 */
export const useWorkspaceZipSize = (
  isEnabled: boolean,
  triggerKey: string | null,
): UseWorkspaceZipSizeResult => {
  const [state, setState] = React.useState<UseWorkspaceZipSizeResult>({
    isLoading: false,
    sizeBytes: null,
    error: null,
  });

  React.useEffect(() => {
    if (!isEnabled || !triggerKey) {
      setState({ isLoading: false, sizeBytes: null, error: null });
      return;
    }

    let cancelled = false;

    const calculateSize = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // TODO: Replace with actual IPC call to backend/main process
        // e.g., window.electron.ipcRenderer.invoke('calculate-workspace-zip-size', rootPath)

        // Mock delay for simulation
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (cancelled) return;

        // Simulate a random-ish size for demonstration purposes until integrated
        // In production, this should return real bytes.
        const mockSize = Math.floor(Math.random() * 5000000) + 100000;

        setState({
          isLoading: false,
          sizeBytes: mockSize,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        console.error('[useWorkspaceZipSize] Failed to calculate size:', err);
        setState({
          isLoading: false,
          sizeBytes: null,
          error: String(err),
        });
      }
    };

    calculateSize();

    return () => {
      cancelled = true;
    };
  }, [isEnabled, triggerKey]);

  return state;
};
