/**
 * Realtime (WebSocket) types.
 */

export interface WssMessage {
  type: string; // Event channel name e.g., 'cdp:request'
  data: any; // Payload
}
