import { BrowserWindow } from 'electron';
import * as net from 'net';

/**
 * Parse a WebSocket frame and extract metadata
 * Returns null if the data doesn't look like a valid WebSocket frame
 */
export function parseWebSocketFrame(
  data: Buffer,
  _direction: 'client' | 'server',
): {
  isBinary: boolean;
  isControl: boolean;
  payload: string | null;
  opcode: number;
} | null {
  try {
    if (data.length < 2) return null;

    const firstByte = data[0];
    const secondByte = data[1];

    // Check if this looks like a WebSocket frame (FIN + opcode in first byte)
    const fin = (firstByte & 0x80) !== 0;
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) !== 0;
    let payloadLength = secondByte & 0x7f;

    // Valid opcodes: 0=continuation, 1=text, 2=binary, 8=close, 9=ping, 10=pong
    const validOpcodes = [0, 1, 2, 8, 9, 10];
    if (!validOpcodes.includes(opcode)) return null;

    // If not FIN and not a valid continuation, might not be WebSocket
    if (!fin && opcode === 0 && data.length < 2) return null;

    let offset = 2;

    // Extended payload length
    if (payloadLength === 126) {
      if (data.length < 4) return null;
      payloadLength = data.readUInt16BE(2);
      offset = 4;
    } else if (payloadLength === 127) {
      if (data.length < 10) return null;
      // Read 64-bit, but cap to safe integer
      const hi = data.readUInt32BE(2);
      const lo = data.readUInt32BE(6);
      if (hi > 0) {
        // Payload too large, but still valid frame
        payloadLength = 65535; // cap it
      } else {
        payloadLength = lo;
      }
      offset = 10;
    }

    // Masking key (client frames are masked)
    let maskKey: Buffer | null = null;
    if (masked) {
      if (data.length < offset + 4) return null;
      maskKey = data.slice(offset, offset + 4);
      offset += 4;
    }

    // Extract payload
    const payloadEnd = Math.min(offset + payloadLength, data.length);
    let payload: Buffer;

    if (maskKey) {
      payload = Buffer.alloc(payloadEnd - offset);
      for (let i = offset; i < payloadEnd; i++) {
        payload[i - offset] = data[i] ^ maskKey[(i - offset) % 4];
      }
    } else {
      payload = data.slice(offset, payloadEnd);
    }

    const isBinary = opcode === 2;
    const isControl = opcode >= 8;

    let payloadStr: string | null = null;
    if (!isBinary && !isControl) {
      try {
        payloadStr = payload.toString('utf8');
      } catch {
        payloadStr = null;
      }
    } else if (isControl) {
      payloadStr = `[${['', '', '', '', '', '', '', '', 'CLOSE', 'PING', 'PONG'][opcode] || 'UNKNOWN'}]`;
      if (opcode === 8 && payload.length >= 2) {
        const code = payload.readUInt16BE(0);
        const reason = payload.length > 2 ? payload.slice(2).toString('utf8') : '';
        payloadStr = `[CLOSE ${code}${reason ? ': ' + reason : ''}]`;
      }
    }

    return { isBinary, isControl, payload: payloadStr, opcode };
  } catch {
    return null;
  }
}

export interface WebSocketConnectionInfo {
  id: string;
  url: string;
  host: string;
  path: string;
  status: string;
  startTime: number;
  messages: any[];
  totalMessages: number;
  clientBytesSent: number;
  serverBytesSent: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
}

export function setupWebSocketTunnel(
  req: any,
  socket: any,
  sendToRenderer: (channel: string, data: any) => void,
): void {
  const hostUrl = req.url || '';
  if (!hostUrl) {
    return;
  }

  const host = hostUrl.split(':')[0];
  const port = parseInt(hostUrl.split(':')[1]) || 443;

  const wsId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const wsUrl = `wss://${host}${req.url || ''}`;
  const wsPath = req.url || '/';

  // Send connection info to renderer
  sendToRenderer('ws:connect', {
    id: wsId,
    url: wsUrl,
    host: host,
    path: wsPath,
    status: 'connecting',
    startTime: Date.now(),
    messages: [],
    totalMessages: 0,
    clientBytesSent: 0,
    serverBytesSent: 0,
    requestHeaders: req.headers || {},
    responseHeaders: {},
  });

  const conn = net.connect({ port, host, allowHalfOpen: true }, () => {
    // Forward the CONNECT success to client
    socket.write('HTTP/1.1 200 Connection Established\r\n\r\n', 'utf-8', () => {
      // Now client will send WebSocket upgrade, forward everything

      let responseHeadersCaptured = false;
      let serverHeaderBuffer = '';

      conn.on('data', (data: Buffer) => {
        // Capture WebSocket frames
        const frameInfo = parseWebSocketFrame(data, 'server');
        if (frameInfo) {
          sendToRenderer('ws:message', {
            id: `ws-msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            connectionId: wsId,
            direction: 'server',
            data: frameInfo.isBinary
              ? data.toString('base64')
              : frameInfo.payload || data.toString('utf8'),
            dataType: frameInfo.isBinary ? 'binary' : 'text',
            size: data.length,
            timestamp: Date.now(),
          });

          // Update connection stats
          sendToRenderer('ws:update', {
            id: wsId,
            totalMessages: frameInfo.isControl ? undefined : 1,
            serverBytesSent: data.length,
          });
        }

        if (!responseHeadersCaptured) {
          serverHeaderBuffer += data.toString('utf8');
          const headerEnd = serverHeaderBuffer.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            responseHeadersCaptured = true;
            const headerStr = serverHeaderBuffer.substring(0, headerEnd);
            const headers: Record<string, string> = {};
            headerStr.split('\r\n').forEach((line) => {
              const colonIdx = line.indexOf(':');
              if (colonIdx > 0) {
                headers[line.substring(0, colonIdx).trim().toLowerCase()] = line
                  .substring(colonIdx + 1)
                  .trim();
              } else if (line.startsWith('HTTP/')) {
                headers[':status'] = line.split(' ')[1] || '101';
              }
            });
            sendToRenderer('ws:update', {
              id: wsId,
              status: 'connected',
              responseHeaders: headers,
            });
          }
        }

        socket.write(data);
      });

      socket.on('data', (data: Buffer) => {
        // Capture WebSocket frames
        const frameInfo = parseWebSocketFrame(data, 'client');
        if (frameInfo) {
          sendToRenderer('ws:message', {
            id: `ws-msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            connectionId: wsId,
            direction: 'client',
            data: frameInfo.isBinary
              ? data.toString('base64')
              : frameInfo.payload || data.toString('utf8'),
            dataType: frameInfo.isBinary ? 'binary' : 'text',
            size: data.length,
            timestamp: Date.now(),
          });

          sendToRenderer('ws:update', {
            id: wsId,
            totalMessages: frameInfo.isControl ? undefined : 1,
            clientBytesSent: data.length,
          });
        }

        conn.write(data);
      });

      conn.on('close', () => {
        sendToRenderer('ws:close', {
          id: wsId,
          endTime: Date.now(),
          status: 'closed',
        });
        socket.end();
      });

      socket.on('close', () => {
        sendToRenderer('ws:close', {
          id: wsId,
          endTime: Date.now(),
          status: 'closed',
        });
        conn.end();
      });

      conn.on('error', (err: any) => {
        if (err.code !== 'ECONNRESET') {
          console.error(`[ProxyServer WS] Server error:`, err);
        }
      });

      socket.on('error', (err: any) => {
        if (err.code !== 'ECONNRESET') {
          console.error(`[ProxyServer WS] Client error:`, err);
        }
      });
    });
  });

  conn.on('error', (err: any) => {
    if (err.code !== 'ECONNRESET') {
      console.error(`[ProxyServer WS] Connection error:`, err);
    }
    sendToRenderer('ws:close', {
      id: wsId,
      endTime: Date.now(),
      status: 'closed',
    });
    socket.destroy();
  });
}