export const runtimeIpc = {
  getCodePorts: async (): Promise<{ code?: number } | undefined> => {
    const runtime = (window as any).api?.runtime;
    return runtime?.startCode ? await runtime.startCode() : await runtime?.getPorts();
  },
};