// Abstract process execution without exposing Node.js internals

export interface ProcessResult {
  stdout: string;
  stderr: string;
  error?: { message: string; code?: string | number };
}

export interface RunProcessOptions {
  cwd?: string;
  env?: Record<string, string>;
  maxBuffer?: number;
  stdin?: string;
}

export interface StreamWritable {
  write(data: string): boolean;
  end(data?: string): void;
  on(event: 'error', callback: (err: Error) => void): void;
}

export interface StreamReadable {
  pipe(destination: StreamWritable): StreamWritable;
  on(event: 'data', callback: (chunk: Buffer | string) => void): void;
}

export interface ProcessStream {
  stdout: StreamReadable | null;
  stderr: StreamReadable | null;
  stdin: StreamWritable | null;
  onStdout(callback: (data: string) => void): void;
  onStderr(callback: (data: string) => void): void;
  onExit(callback: (code: number | null) => void): void;
  on(event: 'close' | 'error', callback: (arg: any) => void): void;
  kill(): void;
  isRunning(): boolean;
}

export interface SpawnProcessOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export interface ProcessRunnerPort {
  run(bin: string, args: string[], options?: RunProcessOptions): Promise<ProcessResult>;
  spawnStream(bin: string, args: string[], options?: SpawnProcessOptions): ProcessStream;
}