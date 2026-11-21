#!/usr/bin/env node
/**
 * Build 1 server con (server/, emulate/ hoặc profile-server/) ra dist/ của chính nó.
 * Dùng: node scripts/build-server.js <server|emulate|profile-server>
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const name = process.argv[2];
if (name !== 'server' && name !== 'emulate' && name !== 'profile-server') {
  console.error('[build-server] usage: node scripts/build-server.js <server|emulate|profile-server>');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const dir = path.join(root, name);

const res = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  cwd: dir,
  shell: process.platform === 'win32',
});
process.exit(res.status ?? 1);