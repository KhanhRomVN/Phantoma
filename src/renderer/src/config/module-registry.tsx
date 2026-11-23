/**
 * Module Registry - Single source of truth for all application modules
 *
 * This file is the ONLY place where you need to add/remove modules.
 * All other files (ViewContainer, QuickNavModal, etc.) should import from here.
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Radio,
  Smartphone,
  Code as CodeIcon,
  Settings,
  LayoutGrid,
  User,
  MessageSquare,
  Network,
  Activity,
  LayoutDashboard,
} from 'lucide-react';

// Lazy imports for better performance
import { lazy } from 'react';

const Recon = lazy(() => import('../modules/Recon'));
const Emulate = lazy(() => import('../modules/Emulate/Emulate'));
const Code = lazy(() => import('../modules/Code/Code'));
import { CodeSkeleton } from '../modules/Code/CodeSkeleton';
const Setting = lazy(() => import('../modules/Setting'));
const UITest = lazy(() => import('../modules/UITest'));
const Profile = lazy(() => import('../modules/Profile/Profile'));
const Proxy = lazy(() => import('../modules/Proxy/Proxy'));
const Fleet = lazy(() => import('../modules/Fleet'));
const Chat = lazy(() => import('../modules/Chat/Chat'));
const Monitor = lazy(() => import('../modules/Monitor/Monitor'));
const Dashboard = lazy(() => import('../modules/Dashboard/Dashboard'));

export type ModuleId =
  'recon' | 'emulate' | 'code' | 'settings' | 'preview' | 'uitest' | 'profile' | 'proxy' | 'fleet' | 'chat' | 'monitor' | 'dashboard';

export interface ModuleDefinition {
  id: ModuleId;
  title: string;
  description: string;
  icon: LucideIcon;
  component: ReactNode;
  /** Fallback shown while the lazy component loads */
  skeleton?: ReactNode;
  color?: string;
  /** Show in quick nav modal */
  showInQuickNav?: boolean;
  /** Show in activity bar */
  showInActivityBar?: boolean;
}

/**
 * SINGLE SOURCE OF TRUTH
 * Add/remove modules here. All other files will automatically update.
 */
export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'recon',
    title: 'Recon',
    description: 'Web reconnaissance and browser automation',
    icon: Radio,
    component: <Recon />,
    color: 'text-primary',
    showInQuickNav: true,
    showInActivityBar: true,
  },
  {
    id: 'emulate',
    title: 'Emulate',
    description: 'HTTP traffic interception and analysis',
    icon: Smartphone,
    component: <Emulate />,
    color: 'text-emerald-400',
    showInQuickNav: true,
    showInActivityBar: true,
  },
  {
    id: 'code',
    title: 'Code',
    description: 'AI-powered development environment',
    icon: CodeIcon,
    component: <Code />,
    skeleton: <CodeSkeleton />,
    color: 'text-blue-400',
    showInQuickNav: true,
    showInActivityBar: true,
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage accounts and credentials',
    icon: User,
    component: <Profile />,
    color: 'text-purple-400',
    showInQuickNav: true,
    showInActivityBar: true,
  },
  {
    id: 'proxy',
    title: 'Proxy',
    description: 'Manage proxies, health checks and assignments',
    icon: Network,
    component: <Proxy />,
    color: 'text-teal-400',
    showInQuickNav: true,
    showInActivityBar: true,
  },
  {
    id: 'fleet',
    title: 'Fleet',
    description: 'Manage mobile, desktop and VPS remotely',
    icon: Smartphone,
    component: <Fleet />,
    color: 'text-orange-400',
    showInQuickNav: true,
    showInActivityBar: true,
  },
  {
    id: 'chat',
    title: 'Chat',
    description: 'Unified multi-platform messaging hub',
    icon: MessageSquare,
    component: <Chat />,
    color: 'text-cyan-400',
    showInQuickNav: true,
    showInActivityBar: true,
  },
  {
    id: 'monitor',
    title: 'Monitor',
    description: 'Social monitoring, alerts, audit and reports',
    icon: Activity,
    component: <Monitor />,
    color: 'text-rose-400',
    showInQuickNav: true,
    showInActivityBar: true,
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Overview of activity, stats and key metrics',
    icon: LayoutDashboard,
    component: <Dashboard />,
    color: 'text-indigo-400',
    showInQuickNav: true,
    showInActivityBar: true,
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Application settings and preferences',
    icon: Settings,
    component: <Setting />,
    color: 'text-gray-400',
    showInQuickNav: true,
    showInActivityBar: true,
  },
  {
    id: 'uitest',
    title: 'UI Test',
    description: 'Component testing and documentation',
    icon: LayoutGrid,
    component: <UITest />,
    color: 'text-pink-400',
    showInQuickNav: true,
    showInActivityBar: false, // Hidden from activity bar
  },
];

// Helper functions
export const getModuleById = (id: ModuleId): ModuleDefinition | undefined =>
  MODULE_DEFINITIONS.find((m) => m.id === id);

export const getModulesForQuickNav = (): ModuleDefinition[] =>
  MODULE_DEFINITIONS.filter((m) => m.showInQuickNav);

export const getModulesForActivityBar = (): ModuleDefinition[] =>
  MODULE_DEFINITIONS.filter((m) => m.showInActivityBar);

export const getAllModuleIds = (): ModuleId[] => MODULE_DEFINITIONS.map((m) => m.id);

export const getDefaultModuleId = (): ModuleId => MODULE_DEFINITIONS[0].id;
