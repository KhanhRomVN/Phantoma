export interface SendRequestOptions {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface SendRequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  error?: string;
}

export const requestService = {
  async send(options: SendRequestOptions): Promise<SendRequestResult> {
    return window.api.invoke('inspector:send-request', options);
  },
};

export default requestService;