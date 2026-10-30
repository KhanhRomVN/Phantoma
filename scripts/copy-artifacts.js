#!/usr/bin/env node
/**
 * Copy artifact cần upload lên GitHub Release từ release-build/v${version}
 * sang release/v${version}. Chỉ giữ file cài đặt + metadata updater,
 * bỏ *-unpacked/, builder-debug.yml, log.log.
 */
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');

const version = pkg.version;
const src = path.join(__dirname, '..', 'release-build', `v${version}`);
const dest = path.join(__dirname, '..', 'release', `v${version}`);

if (!fs.existsSync(src)) {
  console.error(`[copy-artifacts] source not found: ${src}`);
  process.exit(1);
}
fs.mkdirSync(dest, { recursive: true });

const KEEP_EXT = ['.appimage', '.deb', '.rpm', '.exe', '.msi', '.dmg', '.zip', '.pkg', '.snap'];
const KEEP_NAME = /^latest.*\.ya?ml$|^builder-effective-config\.yaml$/i;

let copied = 0;
for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const name = entry.name;
  const lower = name.toLowerCase();
  const keep = KEEP_EXT.some((ext) => lower.endsWith(ext)) || KEEP_NAME.test(name);
  if (!keep) continue;
  fs.copyFileSync(path.join(src, name), path.join(dest, name));
  copied++;
  console.log(`[copy-artifacts] ${name}`);
}
console.log(`[copy-artifacts] ${copied} file(s) -> ${dest}`);