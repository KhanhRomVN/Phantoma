export interface LogEntry {
  timestamp: string;
  level: 'V' | 'D' | 'I' | 'W' | 'E' | 'F';
  tag: string;
  pid: string;
  message: string;
  raw: string;
}

export function parseLogLine(line: string): LogEntry | null {
  // Format: 12-15 14:30:45.123 12345 12345 V Tag: Message
  const match = line.match(
    /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+(.+?):\s+(.*)$/,
  );
  if (match) {
    return {
      timestamp: match[1],
      pid: match[2],
      level: match[4] as LogEntry['level'],
      tag: match[5],
      message: match[6],
      raw: line,
    };
  }

  // Format: V/Tag(12345): Message
  const simpleMatch = line.match(/^([VDIWEF])\/(.+?)\(\s*(\d+)\):\s+(.*)$/);
  if (simpleMatch) {
    return {
      timestamp: new Date().toLocaleTimeString(),
      pid: simpleMatch[3],
      level: simpleMatch[1] as LogEntry['level'],
      tag: simpleMatch[2],
      message: simpleMatch[4],
      raw: line,
    };
  }

  // Format: 12-15 14:30:45.123 V/Tag(12345): Message
  const timeMatch = line.match(
    /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+([VDIWEF])\/(.+?)\(\s*(\d+)\):\s+(.*)$/,
  );
  if (timeMatch) {
    return {
      timestamp: timeMatch[1],
      pid: timeMatch[4],
      level: timeMatch[2] as LogEntry['level'],
      tag: timeMatch[3],
      message: timeMatch[5],
      raw: line,
    };
  }

  // Fallback: treat as raw message
  return {
    timestamp: new Date().toLocaleTimeString(),
    pid: '?',
    level: 'I',
    tag: 'RAW',
    message: line,
    raw: line,
  };
}