import {
  Globe,
  LayoutDashboard,
  Users,
  Clock,
  FileCode,
  Database,
  Fingerprint,
  Map as MapIcon,
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
  Briefcase,
  EyeOff,
  Image as ImageIcon,
  CreditCard,
  Scale,
  GitBranch,
} from 'lucide-react';

export const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  LayoutDashboard,
  Users,
  Clock,
  FileCode,
  Database,
  Globe,
  Fingerprint,
  Map: MapIcon,
  ShieldCheck,
  Network: NetworkIcon,
  AlertTriangle,
  Cpu,
  Search: SearchIcon,
  Mail,
  MessageCircle,
  Router,
  FileJson,
  User,
  Share2,
  Briefcase,
  EyeOff,
  Image: ImageIcon,
  CreditCard,
  Scale,
  GitBranch,
};

export const getTabIcon = (
  iconName: string,
): React.ComponentType<{ className?: string; style?: React.CSSProperties }> => {
  return ICON_MAP[iconName] || Globe;
};