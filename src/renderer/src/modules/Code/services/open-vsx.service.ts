/**
 * Open VSX Registry API Service
 * 
 * Open-source extension marketplace for VS Code compatible editors.
 * API Docs: https://github.com/eclipse/openvsx/wiki/Using-Open-VSX-in-VS-Code
 */

const OPEN_VSX_API = 'https://open-vsx.org/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OpenVSXExtension {
  namespace: string;
  name: string;
  version: string;
  displayName?: string;
  description?: string;
  publishedBy: {
    loginName: string;
    fullName?: string;
  };
  downloads?: number;
  downloadCount?: number;
  averageRating?: number;
  reviewCount?: number;
  categories?: string[];
  tags?: string[];
  repository?: string;
  license?: string;
  allVersions?: {
    [version: string]: string; // version -> download URL
  };
  files?: {
    download?: string; // .vsix download URL
    manifest?: string;
    readme?: string;
    license?: string;
    icon?: string;
  };
}

export interface OpenVSXSearchResult {
  extensions: OpenVSXExtension[];
  offset: number;
  totalSize: number;
}

// ─── API Client ─────────────────────────────────────────────────────────────

class OpenVSXService {
  /**
   * Search extensions
   */
  async search(query: string, options?: {
    category?: string;
    size?: number;
    offset?: number;
    sortBy?: 'relevance' | 'timestamp' | 'rating' | 'downloadCount';
    sortOrder?: 'asc' | 'desc';
  }): Promise<OpenVSXSearchResult> {
    const params = new URLSearchParams();
    
    if (query) params.set('query', query);
    if (options?.category) params.set('category', options.category);
    if (options?.size) params.set('size', options.size.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    if (options?.sortBy) params.set('sortBy', options.sortBy);
    if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

    const url = `${OPEN_VSX_API}/-/search?${params}`;
    console.log('[OpenVSX] 🔍 Searching:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[OpenVSX] ✅ Found', data.totalSize, 'extensions');
      
      return data as OpenVSXSearchResult;
    } catch (error) {
      console.error('[OpenVSX] ❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Get extension details
   */
  async getExtension(namespace: string, extensionName: string): Promise<OpenVSXExtension> {
    const url = `${OPEN_VSX_API}/${namespace}/${extensionName}`;
    console.log('[OpenVSX] 📦 Fetching extension:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Get extension failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[OpenVSX] ✅ Extension details:', data.displayName);
      
      return data as OpenVSXExtension;
    } catch (error) {
      console.error('[OpenVSX] ❌ Get extension failed:', error);
      throw error;
    }
  }

  /**
   * Get popular extensions
   */
  async getPopular(options?: {
    category?: string;
    size?: number;
  }): Promise<OpenVSXExtension[]> {
    const result = await this.search('', {
      ...options,
      sortBy: 'downloadCount',
      sortOrder: 'desc',
      size: options?.size || 20,
    });

    return result.extensions;
  }

  /**
   * Get featured extensions (high quality)
   */
  async getFeatured(size: number = 10): Promise<OpenVSXExtension[]> {
    const result = await this.search('', {
      sortBy: 'rating',
      sortOrder: 'desc',
      size,
    });

    // Filter by rating and downloads
    return result.extensions.filter((ext) => {
      const hasGoodRating = (ext.averageRating || 0) >= 4.0;
      const downloads = ext.downloadCount ?? ext.downloads ?? 0;
      const hasEnoughDownloads = downloads >= 100000;
      return hasGoodRating && hasEnoughDownloads;
    });
  }

  /**
   * Get download URL for extension
   */
  getDownloadUrl(namespace: string, extensionName: string, version?: string): string {
    if (version) {
      return `${OPEN_VSX_API}/${namespace}/${extensionName}/${version}/file/${namespace}.${extensionName}-${version}.vsix`;
    }
    return `${OPEN_VSX_API}/${namespace}/${extensionName}/file/${namespace}.${extensionName}.vsix`;
  }

  /**
   * Download extension .vsix file
   * Returns blob for processing in Main Process
   */
  async downloadExtension(namespace: string, extensionName: string, version?: string): Promise<ArrayBuffer> {
    const url = this.getDownloadUrl(namespace, extensionName, version);
    console.log('[OpenVSX] ⬇️  Downloading:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('[OpenVSX] ✅ Downloaded', arrayBuffer.byteLength, 'bytes');
      
      return arrayBuffer;
    } catch (error) {
      console.error('[OpenVSX] ❌ Download failed:', error);
      throw error;
    }
  }

  /**
   * Get categories list
   */
  async getCategories(): Promise<string[]> {
    // Open VSX standard categories
    return [
      'Programming Languages',
      'Snippets',
      'Linters',
      'Themes',
      'Debuggers',
      'Formatters',
      'Keymaps',
      'SCM Providers',
      'Other',
      'Extension Packs',
      'Language Packs',
      'Data Science',
      'Machine Learning',
      'Visualization',
      'Notebooks',
    ];
  }

  /**
   * Parse extension ID to namespace and name
   */
  parseExtensionId(extensionId: string): { namespace: string; name: string } {
    const parts = extensionId.split('.');
    if (parts.length !== 2) {
      throw new Error(`Invalid extension ID: ${extensionId}`);
    }
    return {
      namespace: parts[0],
      name: parts[1],
    };
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

export const openVSXService = new OpenVSXService();
