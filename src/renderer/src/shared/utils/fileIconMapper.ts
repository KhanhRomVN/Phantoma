/**
 * File Extension to Icon Mapper
 * Maps file extensions and filenames to vscode-icons SVG files
 * using vscode-icons-js package
 */
import {
  getIconForFile,
  DEFAULT_FILE,
  DEFAULT_FOLDER,
  DEFAULT_FOLDER_OPENED,
} from 'vscode-icons-js';

/**
 * Get icon filename for a given file
 * @param filename - The filename (with or without path)
 * @returns SVG icon filename
 */
export function getFileIcon(filename: string): string {
  const name = filename.split('/').pop() || filename;
  const icon = getIconForFile(name);
  return icon || DEFAULT_FILE;
}

declare global {
  interface Window {
    __zenImagesUri?: string;
  }
}

/**
 * Get full icon path for use in img src
 * @param filename - The filename
 * @returns Full path to icon SVG
 */
export function getFileIconPath(filename: string): string {
  const iconName = getFileIcon(filename);
  // vscode-icons-js returns names like "file_type_markdown.svg" but our
  // icon set uses simple names like "markdown.svg" — strip the prefix.
  const cleanName = iconName.replace(/^file_type_/, '').replace(/^default_file\.svg$/, 'file.svg');
  const baseUri = window.__zenImagesUri || '/images/icon';
  const path = `${baseUri}/${cleanName}`;
  const finalPath = path.replace(/([^:]\/)\/+/g, '$1');
  return finalPath;
}

// ─── Folder Icon Mapping ──────────────────────────────────────────────────
const FOLDER_ICON_MAP: Record<string, string> = {
  src: 'folder-src',
  source: 'folder-src',
  components: 'folder-components',
  component: 'folder-components',
  ui: 'folder-ui',
  node_modules: 'folder-node',
  public: 'folder-public',
  assets: 'folder-images',
  images: 'folder-images',
  img: 'folder-images',
  styles: 'folder-css',
  css: 'folder-css',
  style: 'folder-css',
  utils: 'folder-utils',
  util: 'folder-utils',
  helpers: 'folder-helper',
  helper: 'folder-helper',
  lib: 'folder-lib',
  libs: 'folder-lib',
  hooks: 'folder-hook',
  hook: 'folder-hook',
  types: 'folder-typescript',
  typings: 'folder-typescript',
  test: 'folder-test',
  tests: 'folder-test',
  __tests__: 'folder-test',
  spec: 'folder-test',
  docs: 'folder-docs',
  doc: 'folder-docs',
  documentation: 'folder-docs',
  config: 'folder-config',
  configs: 'folder-config',
  dist: 'folder-dist',
  build: 'folder-dist',
  out: 'folder-dist',
  output: 'folder-dist',
  scripts: 'folder-scripts',
  script: 'folder-scripts',
  api: 'folder-api',
  apis: 'folder-api',
  git: 'folder-git',
  '.git': 'folder-git',
  github: 'folder-github',
  '.github': 'folder-github',
  vscode: 'folder-vscode',
  '.vscode': 'folder-vscode',
  packages: 'folder-packages',
  package: 'folder-packages',
  services: 'folder-server',
  service: 'folder-server',
  server: 'folder-server',
  routes: 'folder-routes',
  route: 'folder-routes',
  router: 'folder-routes',
  models: 'folder-database',
  model: 'folder-database',
  database: 'folder-database',
  db: 'folder-database',
  controllers: 'folder-controller',
  controller: 'folder-controller',
  middleware: 'folder-middleware',
  views: 'folder-views',
  view: 'folder-views',
  pages: 'folder-views',
  store: 'folder-store',
  stores: 'folder-store',
  redux: 'folder-redux-reducer',
  state: 'folder-redux-reducer',
  fonts: 'folder-font',
  font: 'folder-font',
  locales: 'folder-i18n',
  locale: 'folder-i18n',
  i18n: 'folder-i18n',
  lang: 'folder-i18n',
  translations: 'folder-i18n',
  migrations: 'folder-migrations',
  migration: 'folder-migrations',
  seeders: 'folder-seeders',
  seeder: 'folder-seeders',
  logs: 'folder-log',
  log: 'folder-log',
  temp: 'folder-temp',
  tmp: 'folder-temp',
  docker: 'folder-docker',
  env: 'folder-environment',
  environments: 'folder-environment',
  plugins: 'folder-plugin',
  plugin: 'folder-plugin',
  context: 'folder-context',
  contexts: 'folder-context',
  layouts: 'folder-layout',
  layout: 'folder-layout',
  app: 'folder-app',
  core: 'folder-core',
  shared: 'folder-shared',
  common: 'folder-shared',
  features: 'folder-features',
  modules: 'folder-modules',
  module: 'folder-modules',
  interfaces: 'folder-interface',
  interface: 'folder-interface',
  events: 'folder-event',
  event: 'folder-event',
  commands: 'folder-command',
  command: 'folder-command',
  constants: 'folder-constant',
  constant: 'folder-constant',
  actions: 'folder-redux-action',
  reducers: 'folder-redux-reducer',
  selectors: 'folder-redux-selector',
  graphql: 'folder-graphql',
  android: 'folder-android',
  ios: 'folder-ios',
  python: 'folder-python',
  java: 'folder-java',
  javascript: 'folder-javascript',
  js: 'folder-javascript',
  ts: 'folder-typescript',
  typescript: 'folder-typescript',
  go: 'folder-go',
  rust: 'folder-rust',
  php: 'folder-php',
  ruby: 'folder-ruby',
  scala: 'folder-scala',
  kotlin: 'folder-kotlin',
  swift: 'folder-swift',
  dart: 'folder-dart',
  lua: 'folder-lua',
  svelte: 'folder-svelte',
  vue: 'folder-vue',
  react: 'folder-react-components',
  next: 'folder-next',
  nuxt: 'folder-nuxt',
  astro: 'folder-astro',
  angular: 'folder-angular',
  kubernetes: 'folder-kubernetes',
  k8s: 'folder-kubernetes',
  terraform: 'folder-terraform',
  ansible: 'folder-ansible',
  helm: 'folder-helm',
  prisma: 'folder-prisma',
  drizzle: 'folder-drizzle',
  firebase: 'folder-firebase',
  supabase: 'folder-supabase',
  vercel: 'folder-vercel',
  netlify: 'folder-netlify',
  aws: 'folder-aws',
  azure: 'folder-azure-pipelines',
  gcp: 'folder-gcp',
  cloud: 'folder-cloud',
  ci: 'folder-ci',
  '.circleci': 'folder-circleci',
  '.buildkite': 'folder-buildkite',
  workflow: 'folder-gh-workflows',
  workflows: 'folder-gh-workflows',
};

/**
 * Get folder icon name based on folder name
 * @param folderName - The folder name
 * @param isOpen - Whether folder is open
 * @returns SVG icon filename (e.g. "folder-src.svg" or "folder-src-open.svg")
 */
export function getFolderIconName(folderName: string, isOpen: boolean = false): string {
  const key = folderName.toLowerCase();
  const base = FOLDER_ICON_MAP[key];
  if (base) {
    return isOpen ? `${base}-open.svg` : `${base}.svg`;
  }
  return isOpen ? DEFAULT_FOLDER_OPENED : DEFAULT_FOLDER;
}

/**
 * Get folder icon (backward compatible)
 * @param isOpen - Whether folder is open
 * @returns SVG icon filename
 */
export function getFolderIcon(isOpen: boolean = false): string {
  return isOpen ? DEFAULT_FOLDER_OPENED : DEFAULT_FOLDER;
}

/**
 * Get full folder icon path
 * @param folderName - Optional folder name for specialized icon
 * @param isOpen - Whether folder is open
 * @returns Full path to folder icon SVG
 */
export function getFolderIconPath(folderName?: string, isOpen: boolean = false): string {
  const iconName = folderName ? getFolderIconName(folderName, isOpen) : getFolderIcon(isOpen);
  const baseUri = window.__zenImagesUri || '/images/icon';
  const path = `${baseUri}/${iconName}`;
  return path.replace(/([^:]\/)\/+/g, '$1');
}

/**
 * Get provider icon path
 * @param provider - The provider name (e.g. openai, anthropic, google)
 * @returns Full path to provider icon SVG
 */
export function getProviderIconPath(provider: string): string {
  const normalized = provider.toLowerCase();

  let iconName = 'openai.svg';

  if (normalized.includes('claude') || normalized.includes('anthropic')) {
    iconName = 'claude.svg';
  } else if (normalized.includes('gemini') || normalized.includes('google')) {
    iconName = 'gemini.svg';
  } else if (normalized.includes('deepseek')) {
    iconName = 'deepseek.svg';
  } else if (normalized.includes('grok') || normalized.includes('xai')) {
    iconName = 'grok.svg';
  } else if (normalized.includes('openai') || normalized.includes('gpt')) {
    iconName = 'openai.svg';
  }

  const baseUri = window.__zenImagesUri || '/images/icon';
  const path = `${baseUri}/provider_icons/${iconName}`;
  return path.replace(/([^:]\/)\/+/g, '$1');
}
