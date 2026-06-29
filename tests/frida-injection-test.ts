#!/usr/bin/env ts-node
/**
 * Test script for Frida injection
 * Usage: 
 *   npm run test:frida -- --pid=12345      # Attach to existing process
 *   npm run test:frida -- --spawn          # Spawn Antigravity IDE
 *   npm run test:frida                     # Auto-detect: spawn if no process found
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Get executable path
function getExecutablePath(pid: number): string | null {
  // Method 1: readlink /proc/<pid>/exe
  try {
    const exeLink = `/proc/${pid}/exe`;
    if (fs.existsSync(exeLink)) {
      const exePath = fs.readlinkSync(exeLink);
      console.log(`📌 Method 1 (readlink): ${exePath}`);
      return exePath;
    }
  } catch (e) {
    console.log(`⚠️ Method 1 failed: ${e}`);
  }

  // Method 2: parse cmdline
  try {
    const procPath = `/proc/${pid}/cmdline`;
    if (fs.existsSync(procPath)) {
      const cmdline = fs.readFileSync(procPath, 'utf8').replace(/\0/g, ' ');
      const parts = cmdline.split(' ');
      console.log(`📌 Method 2 (cmdline): ${cmdline}`);
      
      // Try to find actual executable path
      for (const part of parts) {
        if (part.includes('/opt/') || part.includes('/usr/') || part.includes('/home/')) {
          if (!part.includes('/sh') && !part.includes('/bash')) {
            console.log(`📌 Found executable in args: ${part}`);
            return part;
          }
        }
      }
      // Fallback: first part
      const firstPart = parts[0] || '';
      if (!firstPart.includes('/sh') && !firstPart.includes('/bash')) {
        console.log(`📌 Using first part: ${firstPart}`);
        return firstPart;
      }
    }
  } catch (e) {
    console.log(`⚠️ Method 2 failed: ${e}`);
  }

  return null;
}

function injectSSLBypass(pid: number): void {
  console.log(`🔍 Testing Frida injection on PID: ${pid}`);

  // Check if Frida is installed
  try {
    execSync('which frida', { stdio: 'ignore' });
    console.log('✅ Frida CLI found');
  } catch {
    console.error('❌ Frida CLI not installed. Please install: pip install frida-tools');
    process.exit(1);
  }

  const executablePath = getExecutablePath(pid);
  if (!executablePath) {
    console.error('❌ Could not determine executable path');
    process.exit(1);
  }

  console.log(`🚀 Attempting to inject SSL bypass into: ${executablePath}`);

  // Save script to temp file
  const scriptContent = `
// Electron SSL Bypass Script
console.log('[Frida] Hook script loaded!');

// Hook SSL/TLS functions
try {
  // Hook net module
  const net = require('net');
  const tls = require('tls');
  
  // Hook tls.connect
  if (tls && tls.connect) {
    const originalConnect = tls.connect;
    tls.connect = function(...args) {
      console.log('[Frida] tls.connect called:', args[0]);
      // Disable certificate validation
      if (args[0] && typeof args[0] === 'object') {
        args[0].rejectUnauthorized = false;
        args[0].checkServerIdentity = () => null;
      }
      return originalConnect.apply(this, args);
    };
    console.log('[Frida] ✅ tls.connect hooked');
  }

  // Hook https.request
  const https = require('https');
  if (https && https.request) {
    const originalRequest = https.request;
    https.request = function(...args) {
      console.log('[Frida] https.request called');
      if (args[0] && typeof args[0] === 'object') {
        args[0].rejectUnauthorized = false;
      }
      return originalRequest.apply(this, args);
    };
    console.log('[Frida] ✅ https.request hooked');
  }

  console.log('[Frida] ✅ SSL bypass hooks installed successfully');
} catch (e) {
  console.error('[Frida] Hook error:', e.message);
}
  `;

  const scriptPath = path.join(os.tmpdir(), 'test-ssl-bypass.js');
  fs.writeFileSync(scriptPath, scriptContent);
  console.log(`📝 Script saved to: ${scriptPath}`);

  // Try attach mode first
  console.log(`🔗 Attempting attach mode: frida -p ${pid} -l ${scriptPath}`);
  try {
    const attachCmd = `frida -p ${pid} -l ${scriptPath}`;
    console.log(`▶️ Running: ${attachCmd}`);
    const result = execSync(attachCmd, { 
      stdio: 'pipe',
      timeout: 10000,
      encoding: 'utf8'
    });
    console.log('✅ Attach succeeded!');
    console.log(result);
    process.exit(0);
  } catch (error: any) {
    console.log(`⚠️ Attach failed: ${error.message}`);
    console.log('🔄 Trying spawn mode...');

    // Try spawn mode
    try {
      const spawnCmd = `frida -f "${executablePath}" -l ${scriptPath}`;
      console.log(`▶️ Running: ${spawnCmd}`);
      const result = execSync(spawnCmd, { 
        stdio: 'pipe',
        timeout: 15000,
        encoding: 'utf8'
      });
      console.log('✅ Spawn succeeded!');
      console.log(result);
      process.exit(0);
    } catch (spawnError: any) {
      console.error(`❌ Spawn failed: ${spawnError.message}`);
      if (spawnError.stdout) console.log('stdout:', spawnError.stdout);
      if (spawnError.stderr) console.error('stderr:', spawnError.stderr);
      process.exit(1);
    }
  }
}

function spawnAndInject() {
  console.log('🔄 Spawning Antigravity IDE...');
  const antigravityPath = '/opt/Antigravity IDE/antigravity-ide';
  if (!fs.existsSync(antigravityPath)) {
    console.error(`❌ Antigravity IDE not found at: ${antigravityPath}`);
    process.exit(1);
  }

  // Spawn the process
  const child = spawn(antigravityPath, [], {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let spawned = false;
  let pidToUse: number | null = null;

  child.on('spawn', () => {
    console.log(`✅ Process spawned with PID: ${child.pid}`);
    pidToUse = child.pid;
    spawned = true;
    // Inject immediately after spawn
    setTimeout(() => {
      if (pidToUse) {
        console.log(`\n🚀 Injecting SSL bypass into PID: ${pidToUse}`);
        injectSSLBypass(pidToUse);
      }
    }, 500);
  });

  child.on('error', (err) => {
    console.error(`❌ Failed to spawn: ${err.message}`);
    process.exit(1);
  });

  child.on('exit', () => {
    if (!spawned) {
      console.error('❌ Process exited immediately');
      process.exit(1);
    }
  });

  // Keep process alive
  child.stdout?.on('data', () => {});
  child.stderr?.on('data', () => {});

  console.log('⏳ Press Ctrl+C to stop...');
  process.stdin.resume();
}

// Main
function main() {
  const args = process.argv.slice(2);
  const pidArg = args.find((arg) => arg.startsWith('--pid='));
  const spawnMode = args.includes('--spawn');

  let pid: number | null = null;

  if (pidArg) {
    pid = parseInt(pidArg.split('=')[1], 10);
    if (pid) {
      console.log(`🔍 Testing Frida injection on PID: ${pid}`);
      injectSSLBypass(pid);
      return;
    }
  }

  if (spawnMode) {
    spawnAndInject();
    return;
  }

  // Auto-detect: try to find existing process
  try {
    const output = execSync('pgrep -f antigravity-ide', { encoding: 'utf8' });
    const pids = output.trim().split('\n').filter(Boolean);
    if (pids.length > 0) {
      const foundPid = parseInt(pids[0], 10);
      // Verify process exists
      try {
        execSync(`kill -0 ${foundPid}`, { stdio: 'ignore' });
        pid = foundPid;
        console.log(`✅ Found existing Antigravity IDE process: PID ${pid}`);
        injectSSLBypass(pid);
        return;
      } catch {
        // Process doesn't exist
        spawnAndInject();
        return;
      }
    }
  } catch {
    // No process found
  }

  spawnAndInject();
}

main();