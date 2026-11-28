/**
 * Curated subset icon lucide dùng cho group drawer.
 */
import {
  Folder,
  FolderOpen,
  Star,
  Heart,
  Code,
  Bug,
  Rocket,
  Book,
  BookOpen,
  Palette,
  Wrench,
  Zap,
  Flame,
  Cloud,
  Database,
  Globe,
  Lock,
  Key,
  Shield,
  Cpu,
  Terminal,
  FileCode,
  GitBranch,
  Package,
  Box,
  Layers,
  Grid2x2,
  List,
  Tag,
  Tags,
  Sparkles,
  Brain,
  Bot,
  Gamepad2,
  Music,
  Camera,
  Video,
  Image,
  PenTool,
  Scissors,
  Hammer,
  Lightbulb,
  Target,
  Flag,
  Map,
  Compass,
  Anchor,
  Award,
  Crown,
  Gem,
  Gift,
  Puzzle,
  Blocks,
  CircuitBoard,
  Binary,
  Command,
  Activity,
  BarChart3,
  PieChart,
  TrendingUp,
  Briefcase,
  GraduationCap,
  FlaskConical,
  Atom,
  Beaker,
  Microscope,
  TestTube,
  Dna,
  Leaf,
  Trees,
  Flower,
  Sun,
  Moon,
  CloudRain,
  Wind,
  Droplet,
  Snowflake,
  type LucideIcon,
} from 'lucide-react';
import { isReservedGroupName } from '../../skill-group.rules';

export const GROUP_ICONS: Record<string, LucideIcon> = {
  Folder, FolderOpen, Star, Heart, Code, Bug, Rocket, Book, BookOpen, Palette,
  Wrench, Zap, Flame, Cloud, Database, Globe, Lock, Key, Shield, Cpu,
  Terminal, FileCode, GitBranch, Package, Box, Layers, Grid2x2, List, Tag, Tags,
  Sparkles, Brain, Bot, Gamepad2, Music, Camera, Video, Image, PenTool, Scissors,
  Hammer, Lightbulb, Target, Flag, Map, Compass, Anchor, Award, Crown, Gem, Gift,
  Puzzle, Blocks, CircuitBoard, Binary, Command, Activity, BarChart3, PieChart,
  TrendingUp, Briefcase, GraduationCap, FlaskConical, Atom, Beaker, Microscope,
  TestTube, Dna, Leaf, Trees, Flower, Sun, Moon, CloudRain, Wind, Droplet, Snowflake,
};

export const DEFAULT_GROUP_ICON = 'Folder';

export function getGroupIcon(name?: string): LucideIcon {
  if (!name) return GROUP_ICONS[DEFAULT_GROUP_ICON];
  return GROUP_ICONS[name] ?? GROUP_ICONS[DEFAULT_GROUP_ICON];
}

/** Icon names đã sort theo alphabet để hiển thị trong picker. */
export const GROUP_ICON_NAMES = Object.keys(GROUP_ICONS).sort((a, b) =>
  a.localeCompare(b),
);

/* ------------------------------------------------------------------
 * Group colors
 * ------------------------------------------------------------------ */

export const GROUP_ACCENT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1',
];

const OTHERS_COLOR = '#9ca3af';

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function resolveGroupColor(group: { name: string; color?: string }): string {
  if (group.color) return group.color;
  if (isReservedGroupName(group.name)) return OTHERS_COLOR;
  return GROUP_ACCENT_COLORS[hashString(group.name) % GROUP_ACCENT_COLORS.length];
}
