export type AppPlatform = 'web' | 'pc' | 'android' | 'cli';

export interface UserApp {
  id: string;
  name: string;
  platform: AppPlatform;
  url?: string;
  executablePath?: string;
  packageName?: string;
}