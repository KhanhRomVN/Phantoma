import {
  User,
  Briefcase,
  Hexagon,
  Terminal,
  Users,
  Laptop,
  Home,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';
import type { Workspace } from '../types';

export const mockWorkspaces: Workspace[] = [
  { id: 'w1', name: 'Cá nhân', icon: User, unread: 12 },
  { id: 'w2', name: 'Công việc – Nova Labs', icon: Briefcase, unread: 27 },
  { id: 'w3', name: 'Web3 & Airdrop', icon: Hexagon, unread: 54 },
  { id: 'w4', name: 'Red Team / Hacking', icon: Terminal, unread: 3 },
  { id: 'w5', name: 'Cộng đồng', icon: Users, unread: 138 },
  { id: 'w6', name: 'Freelance', icon: Laptop, unread: 6 },
  { id: 'w7', name: 'Gia đình', icon: Home, unread: 2 },
  { id: 'w8', name: 'Trading Desk', icon: TrendingUp, unread: 19 },
  { id: 'w9', name: 'Học tập', icon: GraduationCap, unread: 0 },
];