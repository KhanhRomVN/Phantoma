#!/usr/bin/env node
// Interactive build target selector (arrow keys + ENTER), then runs electron-builder.
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const pkg = require('../package.json');

const version = pkg.version;
const name = 'Phantoma';

const targets = [
  { label: `[Windows] ${name}-v${version}-win-x64-installer.exe`, args: ['--win', 'nsis', '--x64'] },
  { label: `[Windows] ${name}-v${version}-win-x64-portable.zip`, args: ['--win', 'zip', '--x64'] },
  { label: `[macOS] ${name}-v${version}-mac-x64.dmg`, args: ['--mac', 'dmg', '--x64'] },
  { label: `[macOS] ${name}-v${version}-mac-arm64.dmg`, args: ['--mac', 'dmg', '--arm64'] },
  { label: `[macOS] ${name}-v${version}-mac-universal.dmg`, args: ['--mac', 'dmg', '--universal'] },
  { label: `[Linux] ${name}-v${version}-linux-x64.AppImage`, args: ['--linux', 'AppImage', '--x64'] },
  { label: `[Linux] ${name}-v${version}-linux-x64.deb`, args: ['--linux', 'deb', '--x64'] },
  { label: `[Linux] ${name}-v${version}-linux-x64.rpm`, args: ['--linux', 'rpm', '--x64'] },
  { label: `[Linux] ${name}-v${version}-linux-arm64.AppImage`, args: ['--linux', 'AppImage', '--arm64'] },
  { label: `[Linux] ${name}-v${version}-linux-arm64.deb`, args: ['--linux', 'deb', '--arm64'] },
];

const skipOptions = [
  { label: 'Run typecheck first (safer)', value: false },
  { label: 'Skip typecheck (faster, assumes code is clean)', value: true },
];

function serverDistExists() {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  return (
    fs.existsSync(path.join(root, 'server', 'dist', 'index.js')) &&
    fs.existsSync(path.join(root, 'emulate', 'dist', 'index.js'))
  );
}

const steps = [{ title: 'Select build target', items: targets, cursor: 0 }];

// Nếu đã có dist sẵn -> hỏi dùng lại hay build lại
if (serverDistExists()) {
  steps.push({
    title: 'Đã có dist sẵn (server + emulate). Dùng lại hay build lại?',
    items: [
      { label: 'Dùng lại bản build có sẵn (nhanh hơn)', value: 'reuse' },
      { label: 'Build lại server + emulate', value: 'rebuild' },
    ],
    cursor: 0,
  });
}

steps.push({ title: 'Typecheck?', items: skipOptions, cursor: 0 });

function renderStep(step) {
  process.stdout.write('\x1B[?25l');
  process.stdout.write(`${step.title} (\u2191/\u2193 to move, ENTER to confirm):\n\n`);
  step.items.forEach((item, i) => {
    const label = item.label;
    const line = i === step.cursor ? `\x1B[36m> ${label}\x1B[0m` : `  ${label}`;
    process.stdout.write(line + '\n');
  });
}

function clearStep(step) {
  const lines = step.items.length + 2;
  for (let i = 0; i < lines; i++) process.stdout.write('\x1B[1A\x1B[2K');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...opts,
    });
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

async function promptStep(step) {
  return new Promise((resolve) => {
    renderStep(step);
    const onKey = (_str, key) => {
      if (!key) return;
      if (key.name === 'up' || key.name === 'down') {
        step.cursor = key.name === 'up'
          ? (step.cursor - 1 + step.items.length) % step.items.length
          : (step.cursor + 1) % step.items.length;
        clearStep(step);
        renderStep(step);
      } else if (key.name === 'return' || key.name === 'enter') {
        process.stdin.removeListener('keypress', onKey);
        process.stdout.write('\x1B[?25h\n');
        resolve(step.items[step.cursor]);
      } else if (key.ctrl && key.name === 'c') {
        process.stdin.setRawMode(false);
        process.stdout.write('\x1B[?25h\n');
        process.exit(130);
      }
    };
    process.stdin.on('keypress', onKey);
  });
}

async function main() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();

  const answers = [];
  for (const step of steps) {
    answers.push(await promptStep(step));
  }

  process.stdin.setRawMode(false);
  process.stdin.pause();

  const target = answers[0];
  const hasReuseStep = steps.length === 3;
  const serverChoice = hasReuseStep ? answers[1].value : 'rebuild';
  const skipTypecheck = (hasReuseStep ? answers[2] : answers[1]).value;

  console.log(`\n\u2192 Build: ${target.label}`);
  console.log(`\u2192 Server: ${serverChoice === 'reuse' ? 'reuse existing dist' : 'rebuild'}`);
  console.log(`\u2192 Typecheck: ${skipTypecheck ? 'skipped' : 'enabled'}\n`);

  await sleep(500);

  if (!skipTypecheck) {
    console.log('\u2192 Running typecheck...');
    const code = await runCommand('npm', ['run', 'typecheck']);
    if (code !== 0) {
      console.error('\nTypecheck failed. Aborting build.');
      process.exit(code);
    }
    await sleep(500);
  }

  if (serverChoice === 'rebuild') {
    console.log('\u2192 Building server...');
    const serverCode = await runCommand('node', ['scripts/build-server.js', 'server']);
    if (serverCode !== 0) {
      console.error('\nserver build failed. Aborting.');
      process.exit(serverCode);
    }
    console.log('\u2192 Building emulate...');
    const emulateCode = await runCommand('node', ['scripts/build-server.js', 'emulate']);
    if (emulateCode !== 0) {
      console.error('\nemulate build failed. Aborting.');
      process.exit(emulateCode);
    }
  } else {
    console.log('\u2192 Reusing existing server/emulate dist');
  }

  console.log('\u2192 Running electron-vite build...');
  const viteCode = await runCommand('npx', ['electron-vite', 'build']);
  if (viteCode !== 0) {
    console.error('\nelectron-vite build failed. Aborting.');
    process.exit(viteCode);
  }

  console.log('\u2192 Running electron-builder...');
  const builderCode = await runCommand('npx', ['electron-builder', ...target.args]);
  if (builderCode !== 0) process.exit(builderCode);

  console.log('\u2192 Copying release artifacts...');
  const copyCode = await runCommand('node', ['scripts/copy-artifacts.js']);
  process.exit(copyCode);
}

main();