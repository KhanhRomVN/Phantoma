/**
 * eBPF sniffer types.
 */

export interface EbpfEvent {
  type: 'request' | 'response' | 'error';
  timestamp: number;
  pid?: number;
  comm?: string; // Process name
  fd?: number; // File descriptor
  len?: number; // Data length
  buf?: string; // Plaintext content (base64 decoded if needed, usually raw string for text protocols)
  direction?: 'uprobe_enter' | 'uprobe_exit';
}
