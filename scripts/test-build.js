/**
 * Build nhanh bản test (--linux dir, không nén AppImage).
 * Chỉ build — chạy bằng `npm run test:latest`.
 * Nếu server/emulate đã có dist -> hỏi dùng lại hay build lại.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const root = path.join(__dirname, '..');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, shell: process.platform === 'win32', ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function serverDistExists() {
  return (
    fs.existsSync(path.join(root, 'server', 'dist', 'index.js')) &&
    fs.existsSync(path.join(root, 'emulate', 'dist', 'index.js'))
  );
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  let rebuild = true;
  if (serverDistExists()) {
    const ans = await ask('\u0110\u00e3 c\u00f3 dist (server + emulate). D\u00f9ng l\u1ea1i? [Y/n] ');
    rebuild = ans === 'n' || ans === 'no';
  }

  if (rebuild) {
    console.log('\u2192 server build');
    run('node', ['scripts/build-server.js', 'server']);
    console.log('\u2192 emulate build');
    run('node', ['scripts/build-server.js', 'emulate']);
  } else {
    console.log('\u2192 Reusing existing server/emulate dist');
  }

  console.log('\u2192 electron-vite build');
  run('npx', ['electron-vite', 'build']);

  console.log('\u2192 electron-builder --linux dir');
  run('npx', ['electron-builder', '--linux', 'dir']);

  console.log('\u2713 Build xong. Ch\u1ea1y b\u1eb1ng: npm run test:latest');
}

main();