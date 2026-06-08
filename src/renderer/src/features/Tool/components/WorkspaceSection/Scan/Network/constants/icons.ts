import {
  Globe,
  LayoutDashboard,
  Clock,
  Database,
  ShieldCheck,
  Network as NetworkIcon,
  AlertTriangle,
  Cpu,
  Search as SearchIcon,
  Mail,
  MessageCircle,
  Router,
  FileJson,
  User,
  Share2,
  GitBranch,
  Server,
  Wifi,
  Bug,
  Shield,
  Lock,
  Activity,
  Fingerprint,
  Map,
} from 'lucide-react';

export const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  LayoutDashboard,
  Globe,
  Share2,
  Search: SearchIcon,
  AlertTriangle,
  FileJson,
  Database,
  Clock,
  ShieldCheck,
  Network: NetworkIcon,
  Cpu,
  Mail,
  MessageCircle,
  Router,
  User,
  GitBranch,
  Server,
  Wifi,
  Bug,
  Shield,
  Lock,
  Activity,
  Fingerprint,
  Map,
};

export const getTabIcon = (
  iconName: string,
): React.ComponentType<{ className?: string; style?: React.CSSProperties }> => {
  return ICON_MAP[iconName] || NetworkIcon;
};