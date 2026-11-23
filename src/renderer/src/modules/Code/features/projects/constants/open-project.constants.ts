export const TECH_DOMAIN_MAP: Record<string, string> = {
  typescript: 'https://www.typescriptlang.org',
  javascript: 'https://developer.mozilla.org/docs/Web/JavaScript',
  python: 'https://www.python.org',
  go: 'https://go.dev',
  rust: 'https://www.rust-lang.org',
  react: 'https://react.dev',
  vue: 'https://vuejs.org',
  angular: 'https://angular.dev',
  svelte: 'https://svelte.dev',
  nextjs: 'https://nextjs.org',
  nuxt: 'https://nuxt.com',
  vite: 'https://vite.dev',
  express: 'https://expressjs.com',
  nestjs: 'https://nestjs.com',
  django: 'https://www.djangoproject.com',
  flask: 'https://flask.palletsprojects.com',
  fastapi: 'https://fastapi.tiangolo.com',
  springboot: 'https://spring.io/projects/spring-boot',
  laravel: 'https://laravel.com',
  rails: 'https://rubyonrails.org',
  flutter: 'https://flutter.dev',
  electron: 'https://www.electronjs.org',
  docker: 'https://www.docker.com',
  github: 'https://github.com',
};

export const LANG_COLORS = ['#4fa8e0', '#e0a84f', '#6fcf97', '#bb6bd9', '#eb5757', '#56ccf2'];

export type Tone = 'blue' | 'green' | 'purple' | 'pink' | 'teal' | 'yellow' | 'violet';

export const TONES: Tone[] = ['blue', 'purple', 'teal', 'pink', 'green', 'yellow', 'violet'];

export const TONE_SOFT: Record<Tone, string> = {
  blue: 'bg-blue/10 text-blue',
  green: 'bg-green/10 text-green',
  purple: 'bg-purple/10 text-purple',
  pink: 'bg-pink/10 text-pink',
  teal: 'bg-teal/10 text-teal',
  yellow: 'bg-yellow/10 text-yellow',
  violet: 'bg-violet/10 text-violet',
};

export const TONE_DOT: Record<Tone, string> = {
  blue: 'bg-blue',
  green: 'bg-green',
  purple: 'bg-purple',
  pink: 'bg-pink',
  teal: 'bg-teal',
  yellow: 'bg-yellow',
  violet: 'bg-violet',
};

export const TONE_BAR: Record<Tone, string> = {
  blue: 'border-l-blue',
  green: 'border-l-green',
  purple: 'border-l-purple',
  pink: 'border-l-pink',
  teal: 'border-l-teal',
  yellow: 'border-l-yellow',
  violet: 'border-l-violet',
};
