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

const steps = [
  { title: 'Select build target', items: targets, cursor: 0 },
  { title: 'Typecheck?', items: skipOptions, cursor: 0 },
];

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

function runCommand(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
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

  const target = await promptStep(steps[0]);
  const skipChoice = await promptStep(steps[1]);

  process.stdin.setRawMode(false);
  process.stdin.pause();

  const skipTypecheck = skipChoice.value;
  console.log(`\n\u2192 Build: ${target.label}`);
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

  console.log('\u2192 Running electron-vite build...');
  const viteCode = await runCommand('npx', ['electron-vite', 'build']);
  if (viteCode !== 0) {
    console.error('\nelectron-vite build failed. Aborting.');
    process.exit(viteCode);
  }

  console.log('\u2192 Running electron-builder...');
  const builderCode = await runCommand('npx', ['electron-builder', ...target.args]);
  process.exit(builderCode);
}

main();