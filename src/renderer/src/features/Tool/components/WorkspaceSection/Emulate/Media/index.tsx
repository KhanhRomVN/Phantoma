import { useState, useEffect, useMemo } from 'react';
import { NetworkRequest } from '../../../../../../types/inspector';
import {
  Image as ImageIcon,
  FileAudio,
  FileVideo,
  Music,
  Film,
  ExternalLink,
  Filter,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';
import { cn } from '../../../../../../shared/lib/utils';

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  contentType: string;
  size: string;
  timestamp: number;
  isCached?: boolean;
  source: string;
}

interface MediaPanelProps {
  requests?: NetworkRequest[];
  onClose?: () => void;
}

function MediaModal({ url, filename, type, onClose }: { url: string; filename: string; type: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh] bg-background rounded-lg overflow-hidden">
        <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/50">
          <X className="w-4 h-4" />
        </button>
        {type === 'image' ? (
          <img src={url} alt={filename} className="max-w-full max-h-[90vh] object-contain" />
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p>Preview not available for {type} files</p>
            <p className="text-xs mt-2">{filename}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MediaPanel({ requests = [], onClose }: MediaPanelProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [mediaFilters, setMediaFilters] = useState({
    images: true,
    videos: true,
    audio: true,
  });
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [mediaSearchTerm, setMediaSearchTerm] = useState('');
  const [cacheManifest, setCacheManifest] = useState<Record<string, { size?: number }>>({});

  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const manifest = await (window as any).api.invoke('media:get-cache-manifest');
        setCacheManifest(manifest);
      } catch (e) {
        console.error('Failed to fetch media cache manifest:', e);
      }
    };
    fetchManifest();
    const interval = setInterval(fetchManifest, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsScanning(true);
    const itemMap = new Map<string, MediaItem>();

    requests.forEach((req) => {
      let type: MediaItem['type'] | null = null;
      const contentType = (
        req.responseHeaders?.['content-type'] ||
        req.responseHeaders?.['Content-Type'] ||
        ''
      ).toLowerCase();

      if (contentType.startsWith('image/')) type = 'image';
      else if (contentType.startsWith('video/')) type = 'video';
      else if (contentType.startsWith('audio/')) type = 'audio';

      if (!type) {
        const path = req.path.toLowerCase().split('?')[0];
        if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|bmp)$/)) type = 'image';
        else if (path.match(/\.(mp4|webm|ogg|mov|avi|mkv|ts)$/)) type = 'video';
        else if (path.match(/\.(mp3|wav|aac|flac|m4a)$/)) type = 'audio';
      }

      if (type) {
        const originalReferer = req.requestHeaders?.['referer'] || req.requestHeaders?.['Referer'] || '';
        const queryParams = new URLSearchParams();
        if (originalReferer) queryParams.set('_referer', originalReferer);
        queryParams.set('_requestId', req.id);
        const queryStr = (req.path.includes('?') ? '&' : '?') + queryParams.toString();
        const itemUrl = `media://${req.protocol}://${req.host}${req.path}${queryStr}`;
        const cachedEntry = cacheManifest[req.id];
        const isCached = !!cachedEntry;
        const formatBytes = (bytes: number) => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        const displaySize = isCached && cachedEntry?.size ? formatBytes(cachedEntry.size) : req.size || 'Unknown';

        itemMap.set(req.url, {
          id: req.id,
          filename: req.path.split('/').pop()?.split('?')[0] || `unknown.${type}`,
          url: itemUrl,
          type,
          contentType,
          size: displaySize === '0 B' ? 'Unknown' : displaySize,
          timestamp: req.timestamp,
          isCached,
          source: req.url.split('?')[0].substring(0, req.url.split('?')[0].lastIndexOf('/') + 1),
        });
      }
    });

    setMediaItems(Array.from(itemMap.values()).sort((a, b) => b.timestamp - a.timestamp));
    setIsScanning(false);
  }, [requests, cacheManifest]);

  const videoSources = useMemo(() => {
    const sources = new Set<string>();
    mediaItems.forEach((item) => {
      if (item.type === 'video' && item.source) sources.add(item.source);
    });
    return Array.from(sources).sort();
  }, [mediaItems]);

  const filteredMediaItems = mediaItems.filter((item) => {
    if (item.type === 'image' && !mediaFilters.images) return false;
    if (item.type === 'video' && !mediaFilters.videos) return false;
    if (item.type === 'audio' && !mediaFilters.audio) return false;
    if (item.type === 'video' && selectedSource !== 'all' && item.source !== selectedSource) return false;
    if (mediaSearchTerm) {
      const searchLower = mediaSearchTerm.toLowerCase();
      return item.filename.toLowerCase().includes(searchLower) || item.contentType.toLowerCase().includes(searchLower);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Header - horizontal */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-blue-500/15 border border-blue-500/25 shrink-0">
          <ImageIcon className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-text-primary">Media Assets</h2>
          <p className="text-xs text-text-secondary mt-0.5">Images, videos and audio from network traffic</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search bar - horizontal */}
      <div className="px-3 py-2 border-b border-divider shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search media..."
            value={mediaSearchTerm}
            onChange={(e) => setMediaSearchTerm(e.target.value)}
            className="w-full h-11 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-blue-500/50 outline-none"
          />
        </div>
      </div>

      {/* Filter button row */}
      <div className="px-3 py-2 border-b border-divider shrink-0 flex justify-between items-center">
        <button
          onClick={() => setShowFilterSettings(!showFilterSettings)}
          className={cn(
            'flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors',
            showFilterSettings ? 'text-blue-400 bg-blue-500/10' : 'text-text-secondary hover:text-text-primary'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Filter
          <ChevronDown className={cn('w-3 h-3 transition-transform', showFilterSettings && 'rotate-180')} />
        </button>
        <div className="text-[10px] text-text-secondary">{filteredMediaItems.length} items</div>
      </div>

      {/* Filter options - collapsible */}
      {showFilterSettings && (
        <div className="border-b border-border bg-card/50 p-3 space-y-3">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={mediaFilters.images} onChange={(e) => setMediaFilters(f => ({ ...f, images: e.target.checked }))} />
              <ImageIcon className="w-3 h-3 text-blue-400" /> Images
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={mediaFilters.videos} onChange={(e) => setMediaFilters(f => ({ ...f, videos: e.target.checked }))} />
              <Film className="w-3 h-3 text-purple-400" /> Videos
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={mediaFilters.audio} onChange={(e) => setMediaFilters(f => ({ ...f, audio: e.target.checked }))} />
              <Music className="w-3 h-3 text-green-400" /> Audio
            </label>
          </div>
          {mediaFilters.videos && videoSources.length > 1 && (
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full bg-muted border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500/50"
            >
              <option value="all">All sources ({videoSources.length})</option>
              {videoSources.map((src) => (
                <option key={src} value={src}>{src.split('/').slice(-2).join('/')}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Media grid - horizontal grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredMediaItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedMedia(item)}
              className="border border-border rounded-lg bg-card overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer hover:shadow-md flex flex-col h-40"
            >
              <div className="flex-1 bg-muted/30 relative flex items-center justify-center overflow-hidden">
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.filename} loading="lazy" className="w-full h-full object-contain" />
                ) : item.type === 'video' ? (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <Film className="w-6 h-6 opacity-50 mb-1" />
                    <span className="text-[9px] uppercase font-bold opacity-50">Video</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <Music className="w-6 h-6 opacity-50 mb-1" />
                    <span className="text-[9px] uppercase font-bold opacity-50">Audio</span>
                  </div>
                )}
                {item.isCached && (
                  <div className="absolute top-1 right-1 px-1 py-0.5 bg-green-500/80 text-[9px] font-bold text-white rounded">{item.size}</div>
                )}
              </div>
              <div className="p-2 border-t border-border bg-card">
                <div className="flex items-center gap-1 mb-1">
                  {item.type === 'image' && <ImageIcon className="w-2.5 h-2.5 text-blue-400 shrink-0" />}
                  {item.type === 'video' && <FileVideo className="w-2.5 h-2.5 text-purple-400 shrink-0" />}
                  {item.type === 'audio' && <FileAudio className="w-2.5 h-2.5 text-green-400 shrink-0" />}
                  <span className="text-[10px] font-medium truncate">{item.filename}</span>
                </div>
                <div className="text-[9px] text-muted-foreground truncate">{item.contentType}</div>
              </div>
            </div>
          ))}
        </div>

        {filteredMediaItems.length === 0 && mediaItems.length > 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Filter className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-sm">No matching media</p>
            <p className="text-xs opacity-70">Adjust filters to see more</p>
          </div>
        )}

        {mediaItems.length === 0 && !isScanning && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4 border border-blue-500/25">
              <ImageIcon className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-sm text-text-primary font-medium">No media assets found</p>
            <p className="text-xs text-text-secondary mt-1">Load a page with images, videos or audio</p>
          </div>
        )}
      </div>

      {selectedMedia && (
        <MediaModal url={selectedMedia.url} filename={selectedMedia.filename} type={selectedMedia.type} onClose={() => setSelectedMedia(null)} />
      )}
    </div>
  );
}

export default MediaPanel;