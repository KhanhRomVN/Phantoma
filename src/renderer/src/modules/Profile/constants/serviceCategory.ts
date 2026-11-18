import {
  Bot,
  Briefcase,
  Cloud,
  Code,
  Gamepad2,
  GraduationCap,
  MessageCircle,
  Music,
  Newspaper,
  Plane,
  Share2,
  ShoppingBag,
  Tag,
  Video,
  Wallet,
} from 'lucide-react';
import type { ServiceLink } from '../types';
import type { ServiceMeta } from './serviceCatalog';
import { SERVICE_PRESETS } from './service';

export type ServiceCategory =
  | 'social'
  | 'video'
  | 'messaging'
  | 'dev'
  | 'cloud'
  | 'ai'
  | 'finance'
  | 'ecommerce'
  | 'gaming'
  | 'music'
  | 'news'
  | 'education'
  | 'travel'
  | 'productivity'
  | 'other';

export interface ServiceCategoryMeta extends ServiceMeta {
  desc: string;
}

export const SERVICE_CATEGORIES: Record<ServiceCategory, ServiceCategoryMeta> = {
  social: { label: 'Social', icon: Share2, tone: 'info', desc: 'Social networks and communities' },
  video: { label: 'Video', icon: Video, tone: 'error', desc: 'Video and streaming platforms' },
  messaging: {
    label: 'Messaging',
    icon: MessageCircle,
    tone: 'primary',
    desc: 'Chat, meetings and email',
  },
  dev: {
    label: 'Developer',
    icon: Code,
    tone: 'success',
    desc: 'Code hosting and developer tools',
  },
  cloud: { label: 'Cloud', icon: Cloud, tone: 'info', desc: 'Cloud platforms and file storage' },
  ai: { label: 'AI', icon: Bot, tone: 'primary', desc: 'AI assistants and generative tools' },
  finance: { label: 'Finance', icon: Wallet, tone: 'warn', desc: 'Exchanges, wallets and banking' },
  ecommerce: {
    label: 'E-commerce',
    icon: ShoppingBag,
    tone: 'warn',
    desc: 'Marketplaces and online shops',
  },
  gaming: { label: 'Gaming', icon: Gamepad2, tone: 'success', desc: 'Game stores and platforms' },
  music: { label: 'Music', icon: Music, tone: 'error', desc: 'Music and audio streaming' },
  news: { label: 'News', icon: Newspaper, tone: 'muted', desc: 'News and media outlets' },
  education: {
    label: 'Education',
    icon: GraduationCap,
    tone: 'info',
    desc: 'Courses and learning platforms',
  },
  travel: { label: 'Travel', icon: Plane, tone: 'primary', desc: 'Travel, booking and rides' },
  productivity: {
    label: 'Productivity',
    icon: Briefcase,
    tone: 'success',
    desc: 'Work, marketing and security tools',
  },
  other: { label: 'Other', icon: Tag, tone: 'muted', desc: 'Anything that does not fit above' },
};

export const SERVICE_CATEGORY_ORDER = Object.keys(SERVICE_CATEGORIES) as ServiceCategory[];

export const CATEGORY_HUE: Record<ServiceCategory, number> = {
  social: 210,
  video: 0,
  messaging: 265,
  dev: 145,
  cloud: 190,
  ai: 290,
  finance: 45,
  ecommerce: 25,
  gaming: 120,
  music: 330,
  news: 230,
  education: 170,
  travel: 85,
  productivity: 245,
  other: 215,
};

export function categoryChipStyle(category: ServiceCategory, active: boolean): { color: string; backgroundColor: string; borderColor: string } {
  const h = CATEGORY_HUE[category];
  const sat = category === 'other' ? 10 : 70;
  return {
    color: `hsl(${h} ${sat}% 62%)`,
    backgroundColor: `hsl(${h} ${sat}% 55% / ${active ? 0.22 : 0.08})`,
    borderColor: `hsl(${h} ${sat}% 55% / ${active ? 0.95 : 0.45})`,
  };
}

export function isServiceCategory(value: unknown): value is ServiceCategory {
  return typeof value === 'string' && value in SERVICE_CATEGORIES;
}

const CATEGORY_BY_NAME = new Map(SERVICE_PRESETS.map((p) => [p.name.toLowerCase(), p.category]));

export function categoryOfName(name: string): ServiceCategory {
  return CATEGORY_BY_NAME.get(name.toLowerCase()) ?? 'other';
}

export function categoryOfTemplate(t: { name: string; category?: string }): ServiceCategory {
  return isServiceCategory(t.category) ? t.category : categoryOfName(t.name);
}

export function categoryOf(link: ServiceLink): ServiceCategory {
  return categoryOfName(link.name);
}