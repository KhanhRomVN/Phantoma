import React, { useState, lazy, Suspense, useEffect } from 'react';
import {
  Network,
  Globe,
  Bug,
  Zap,
  Shield,
  Search,
  Eye,
  Wrench,
  Scan,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import { SecurityTool, ToolCategory } from '../types';

// Cache utilities for favicons
interface CachedFavicon {
  data: string;
  expiry: number;
}

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_PREFIX = 'favicon_cache_';

const getCachedFavicon = (domain: string): string | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${domain}`);
    if (!cached) return null;

    const parsed: CachedFavicon = JSON.parse(cached);
    if (Date.now() > parsed.expiry) {
      localStorage.removeItem(`${CACHE_PREFIX}${domain}`);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
};

const setCachedFavicon = (domain: string, base64Data: string): void => {
  try {
    const cacheData: CachedFavicon = {
      data: base64Data,
      expiry: Date.now() + CACHE_DURATION,
    };
    localStorage.setItem(`${CACHE_PREFIX}${domain}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache favicon:', error);
  }
};

const fetchFaviconAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// Cache for lazy-loaded Lucide icons
const lucideIconCache = new Map<string, React.LazyExoticComponent<React.ComponentType<any>>>();

// Dynamic import for Lucide icons with type safety
const getLucideIcon = (iconName: string): React.LazyExoticComponent<React.ComponentType<any>> => {
  if (lucideIconCache.has(iconName)) {
    return lucideIconCache.get(iconName)!;
  }

  const LazyComponent = lazy(() =>
    import('lucide-react').then((module) => {
      const Icon = module[iconName as keyof typeof module];
      // Fallback to Wrench if icon doesn't exist
      const Component = (Icon as React.ComponentType<any>) || module.Wrench;
      return { default: Component };
    }),
  );

  lucideIconCache.set(iconName, LazyComponent);
  return LazyComponent;
};

export const getLucideIconForTool = (toolId: string, category: ToolCategory) => {
  const iconMap: Record<string, React.ElementType> = {
    nmap: Scan,
    rustscan: Radio,
    nikto: Globe,
    nuclei: Shield,
    searchsploit: Search,
    metasploit: Bug,
    amass: Network,
    subfinder: Eye,
    assetfinder: Eye,
    gau: Globe,
    'go-dork': Search,
    alienvault: ShieldAlert,
    certsh: Eye,
  };

  const categoryFallback: Record<ToolCategory, React.ElementType> = {
    Network: Network,
    Web: Globe,
    Exploit: Zap,
    OSINT: Search,
    Vuln: Shield,
  };

  const IconComponent = iconMap[toolId] || categoryFallback[category] || Wrench;
  return IconComponent;
};

interface ToolIconProps {
  tool: SecurityTool;
  color: string;
}

export const ToolIcon: React.FC<ToolIconProps> = ({ tool, color }) => {
  const [hasError, setHasError] = useState(false);
  const [cachedFavicon, setCachedFaviconState] = useState<string | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  // Extract domain if websiteUrl exists
  let domain: string | null = null;
  if (tool.websiteUrl && !hasError) {
    try {
      const url = new URL(tool.websiteUrl);
      domain = url.hostname;
    } catch {
      // Invalid URL, fall through
    }
  }

  // Handle favicon caching (only if domain exists)
  useEffect(() => {
    if (!domain) {
      setIsLoadingCache(false);
      return;
    }

    const checkCache = async () => {
      const cached = getCachedFavicon(domain);
      if (cached) {
        setCachedFaviconState(cached);
        setIsLoadingCache(false);
        return;
      }

      // Fetch from DuckDuckGo favicon service (supports CORS)
      const primaryUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      let base64 = await fetchFaviconAsBase64(primaryUrl);

      if (!base64) {
        // Try alternative DuckDuckGo endpoint
        const fallbackUrl = `https://external-content.duckduckgo.com/ip3/${domain}.ico`;
        base64 = await fetchFaviconAsBase64(fallbackUrl);
      }

      if (base64) {
        setCachedFaviconState(base64);
        setCachedFavicon(domain, base64);
      } else {
        setHasError(true);
      }
      setIsLoadingCache(false);
    };

    checkCache();
  }, [domain]);

  // Case 1: Tool has websiteUrl - show favicon with caching
  if (domain && !hasError) {
    if (isLoadingCache) {
      return <div style={{ width: 20, height: 20 }} />;
    }

    if (cachedFavicon) {
      return (
        <img
          src={cachedFavicon}
          alt={tool.name}
          style={{ width: 20, height: 20, objectFit: 'contain' }}
        />
      );
    }
  }

  // Case 2: Tool has icon field (Lucide name) - use that with color
  if (tool.icon) {
    const LucideIcon = getLucideIcon(tool.icon);
    return (
      <Suspense fallback={<div style={{ width: 20, height: 20 }} />}>
        <LucideIcon size={18} style={{ color: tool.color || color }} strokeWidth={1.5} />
      </Suspense>
    );
  }

  // Case 3: Fallback to default mapping
  const IconComponent = getLucideIconForTool(tool.id, tool.category);
  return <IconComponent size={18} style={{ color }} strokeWidth={1.5} />;
};
