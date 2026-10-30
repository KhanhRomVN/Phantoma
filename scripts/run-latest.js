#!/usr/bin/env node
/**
 * Tìm folder release-build/v<cao nhất>, rồi chạy binary linux-unpacked/phantoma.
 * KHÔNG build — dùng lại bản đã build gần nhất.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const releaseBuild = path.join(root, 'release-build');

if (!fs.existsSync(releaseBuild)) {
  console.error(`[run-latest] folder not found: ${releaseBuild} — chạy 'npm run test:build' trước`);
  process.exit(1);
}

const versions = fs
  .readdirSync(releaseBuild)
  .filter((d) => /^v\d+\.\d+\.\d+$/.test(d))
  .sort((a, b) => {
    const pa = a.slice(1).split('.').map(Number);
    const pb = b.slice(1).split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (pa[i] !== pb[i]) return pb[i] - pa[i];
    }
    return 0;
  });

if (!versions.length) {
  console.error('[run-latest] no v* folder in release-build — chạy \'npm run test:build\' trước');
  process.exit(1);
}

const latest = versions[0];
const binDir = path.join(releaseBuild, latest, 'linux-unpacked');
const bin = path.join(binDir, 'phantoma');

if (!fs.existsSync(bin)) {
  console.error(`[run-latest] binary not found: ${bin}`);
  process.exit(1);
}

console.log(`[run-latest] running ${latest}`);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(bin, [], { cwd: binDir, env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));