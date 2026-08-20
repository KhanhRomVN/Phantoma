/// <reference types="node" />

import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const TARGET_DIR = 'src/renderer/src';
const EXTENSIONS = new Set(['.ts', '.tsx']);

async function collectFiles(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'out') continue;
      await collectFiles(full, out);
    } else if (EXTENSIONS.has(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function writeMessage(proc: any, message: any) {
  const body = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`;
  proc.stdin.write(header + body);
}

let nextId = 0;
const pendingRequests = new Map<number, (message: any) => void>();

function request(proc: any, method: string, params: any): Promise<any> {
  const id = ++nextId;
  return new Promise((resolve) => {
    pendingRequests.set(id, resolve);
    writeMessage(proc, { jsonrpc: '2.0', id, method, params });
  });
}

async function main() {
  const files = await collectFiles(join(process.cwd(), TARGET_DIR));
  console.log(`[LSP] Found ${files.length} files in ${TARGET_DIR}`);

  const serverBin = join(process.cwd(), 'node_modules', '.bin', 'typescript-language-server');
  const server = spawn(serverBin, ['--stdio'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const diagnostics = new Map<string, any[]>();
  const seen = new Set<string>();

  let buffer = Buffer.alloc(0);
  server.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const headerText = buffer.subarray(0, headerEnd).toString('ascii');
      const match = /Content-Length:\s*(\d+)/i.exec(headerText);
      if (!match) {
        buffer = buffer.subarray(headerEnd + 4);
        continue;
      }

      const length = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + length;
      if (buffer.length < bodyEnd) break;

      const body = buffer.subarray(bodyStart, bodyEnd).toString('utf8');
      buffer = buffer.subarray(bodyEnd);

      try {
        const msg = JSON.parse(body);

        if (msg.id !== undefined && pendingRequests.has(msg.id)) {
          const resolve = pendingRequests.get(msg.id)!;
          pendingRequests.delete(msg.id);
          resolve(msg);
          continue;
        }

        if (msg.method === 'textDocument/publishDiagnostics') {
          const uri = msg.params.uri;
          diagnostics.set(uri, msg.params.diagnostics || []);
          seen.add(uri);
        }
      } catch {
        // Ignore malformed JSON
      }
    }
  });

  server.stderr.on('data', (chunk: Buffer) => {
    process.stderr.write(chunk);
  });

  await request(server, 'initialize', {
    processId: process.pid,
    rootUri: `file://${process.cwd()}`,
    capabilities: {
      textDocument: {
        publishDiagnostics: { relatedInformation: true },
      },
    },
  });

  writeMessage(server, {
    jsonrpc: '2.0',
    method: 'initialized',
    params: {},
  });

  for (const file of files) {
    const uri = pathToFileURL(file).href;
    const text = await readFile(file, 'utf8');
    const languageId = file.endsWith('.tsx') ? 'typescriptreact' : 'typescript';

    writeMessage(server, {
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri,
          languageId,
          version: 1,
          text,
        },
      },
    });
  }

  const timeoutMs = 60_000;
  const startedAt = Date.now();
  while (seen.size < files.length && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  let total = 0;
  for (const file of files) {
    const uri = pathToFileURL(file).href;
    const fileDiagnostics = diagnostics.get(uri) || [];
    if (fileDiagnostics.length === 0) continue;

    total += fileDiagnostics.length;
    const rel = relative(process.cwd(), file);
    console.log(`\n${rel}`);

    for (const diagnostic of fileDiagnostics) {
      const line = (diagnostic.range?.start?.line ?? 0) + 1;
      const character = (diagnostic.range?.start?.character ?? 0) + 1;
      const severity =
        diagnostic.severity === 1 ? 'ERROR' : diagnostic.severity === 2 ? 'WARNING' : 'INFO';
      console.log(`  ${line}:${character} ${severity} ${diagnostic.message}`);
    }
  }

  console.log(`\n[LSP] Total diagnostics: ${total}`);
  server.kill();
  process.exitCode = 0;
}

main().catch((error) => {
  console.error('[LSP] Fatal:', error);
  process.exitCode = 1;
});