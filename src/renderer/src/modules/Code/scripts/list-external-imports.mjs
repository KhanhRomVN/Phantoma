import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const CODE_DIR = path.resolve(SCRIPTS_DIR, '..');
const SRC = path.resolve(CODE_DIR, '../..');
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs)$/;
const RESOLVE_EXT = ['', '.ts', '.tsx', '.d.ts', '.js', '.jsx', '.json'];
const ALIASES = [
  ['@renderer/', SRC + path.sep],
  ['@shared/', path.join(SRC, 'shared') + path.sep]
];

const argList = process.argv.slice(2);
const args = new Set(argList);

// ASSUMED: whitelist = chỉ giữ import có nguồn nằm trong danh sách này. Mặc định: components/Widgets/Zen + mọi folder con của modules (trừ Code)
const DEFAULT_WHITELIST = ['components/Widgets/Zen', 'modules/*'];
const extraWhitelist = argList.filter((a) => a.startsWith('--whitelist=')).flatMap((a) => a.slice('--whitelist='.length).split(',')).filter(Boolean);

function expandWhitelist(patterns) {
  return patterns.flatMap((p) => {
    if (!p.endsWith('/*')) return [path.join(SRC, p)];
    const base = path.join(SRC, p.slice(0, -2));
    if (!fs.existsSync(base)) return [];
    return fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(base, d.name)).filter((p) => p !== CODE_DIR);
  });
}

const WHITELIST = args.has('--no-whitelist') ? [] : expandWhitelist([...DEFAULT_WHITELIST, ...extraWhitelist]);
const useColor = (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR)) && !process.env.NO_COLOR;
const STYLE = { bold: '1', dim: '2', red: '31', green: '32', yellow: '33', blue: '34', magenta: '35', cyan: '36', gray: '90' };
const paint = (s, ...styles) => (useColor ? styles.map((x) => `\x1b[${STYLE[x]}m`).join('') + s + '\x1b[0m' : s);

const isInside = (child, parent) => {
  const r = path.relative(parent, child);
  return r === '' || (!r.startsWith('..') && !path.isAbsolute(r));
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || full === SCRIPTS_DIR) continue;
      walk(full, out);
    } else if (SOURCE_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

function collectImports(file) {
  const text = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const found = [];
  const add = (node, spec) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    found.push({ spec, line: line + 1, code: node.getText(sf).replace(/\s+/g, ' ') });
  };
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      add(node, node.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && ts.isStringLiteral(node.moduleReference.expression)) {
      add(node, node.moduleReference.expression.text);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === 'require')) {
        add(node, node.arguments[0].text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function toAbsolute(spec, importer) {
  const clean = spec.split('?')[0];
  if (clean.startsWith('.')) return path.resolve(path.dirname(importer), clean);
  for (const [prefix, base] of ALIASES) {
    if (clean.startsWith(prefix)) return path.join(base, clean.slice(prefix.length));
  }
  return null;
}

const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');
const files = walk(CODE_DIR);
const entries = [];

for (const file of files) {
  const items = [];
  for (const imp of collectImports(file)) {
    const abs = toAbsolute(imp.spec, file);
    if (!abs || !isInside(abs, SRC) || isInside(abs, CODE_DIR)) continue;
    if (WHITELIST.length > 0 && !WHITELIST.some((w) => isInside(abs, w))) continue;
    items.push(imp);
  }
  if (items.length > 0) entries.push([rel(file), items]);
}
entries.sort((a, b) => a[0].localeCompare(b[0]));

if (args.has('--json')) {
  console.log(JSON.stringify(Object.fromEntries(entries), null, 2));
} else {
  const w = String(entries.length).length;
  console.log(paint('Import ngoài modules/Code', 'bold', 'cyan'));
  console.log(paint(`Đã quét ${files.length} file`, 'gray'));
  console.log(paint(`Whitelist (${WHITELIST.length}): ${WHITELIST.map(rel).join(', ') || '(trống)'}\n`, 'gray'));
  entries.forEach(([file, items], i) => {
    console.log(`${paint(String(i + 1).padStart(w), 'yellow')}  ${paint(file, 'green', 'bold')} ${paint(`(${items.length})`, 'magenta')}`);
    items.forEach((it, j) => {
      console.log(`${' '.repeat(w + 2)}${paint(`${j + 1}.`, 'yellow')} ${paint(it.code, 'blue')} ${paint(`:${it.line}`, 'gray')}`);
    });
  });
  const total = entries.reduce((n, [, items]) => n + items.length, 0);
  console.log(`\n${paint(String(entries.length), 'bold', 'green')} file, ${paint(String(total), 'bold', 'green')} import`);
}