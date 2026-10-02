import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, ExternalLink } from 'lucide-react';

interface CodeBrowserProps {
  initialUrl?: string;
}

export const CodeBrowser = ({ initialUrl = 'https://google.com' }: CodeBrowserProps) => {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const browserViewIdRef = useRef<string>(`browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    // Create BrowserView in main process
    if (window.api?.invoke) {
      window.api.invoke('browser:create', {
        browserId: browserViewIdRef.current,
        url: initialUrl,
      }).catch((err) => {
        console.error('[CodeBrowser] Failed to create browser view:', err);
      });
    }

    // Listen for navigation events
    if (window.api?.on) {
      const onDidNavigate = (_event: any, payload: { browserId: string; url: string }) => {
        if (payload.browserId === browserViewIdRef.current) {
          setUrl(payload.url);
          setInputUrl(payload.url);
        }
      };

      const onNavigationStateChanged = (_event: any, payload: { 
        browserId: string; 
        canGoBack: boolean; 
        canGoForward: boolean;
      }) => {
        if (payload.browserId === browserViewIdRef.current) {
          setCanGoBack(payload.canGoBack);
          setCanGoForward(payload.canGoForward);
        }
      };

      const onLoadStart = (_event: any, payload: { browserId: string }) => {
        if (payload.browserId === browserViewIdRef.current) {
          setIsLoading(true);
        }
      };

      const onLoadStop = (_event: any, payload: { browserId: string }) => {
        if (payload.browserId === browserViewIdRef.current) {
          setIsLoading(false);
        }
      };

      window.api.on('browser:did-navigate', onDidNavigate);
      window.api.on('browser:navigation-state-changed', onNavigationStateChanged);
      window.api.on('browser:load-start', onLoadStart);
      window.api.on('browser:load-stop', onLoadStop);

      return () => {
        window.api.off('browser:did-navigate', onDidNavigate);
        window.api.off('browser:navigation-state-changed', onNavigationStateChanged);
        window.api.off('browser:load-start', onLoadStart);
        window.api.off('browser:load-stop', onLoadStop);
      };
    }

    return () => {
      // Destroy BrowserView when unmounting
      if (window.api?.invoke) {
        window.api.invoke('browser:destroy', browserViewIdRef.current).catch(() => {});
      }
    };
  }, [initialUrl]);

  const handleNavigate = (newUrl: string) => {
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      newUrl = 'https://' + newUrl;
    }
    
    if (window.api?.send) {
      window.api.send('browser:navigate', {
        browserId: browserViewIdRef.current,
        url: newUrl,
      });
    }
  };

  const handleGoBack = () => {
    if (window.api?.send && canGoBack) {
      window.api.send('browser:go-back', browserViewIdRef.current);
    }
  };

  const handleGoForward = () => {
    if (window.api?.send && canGoForward) {
      window.api.send('browser:go-forward', browserViewIdRef.current);
    }
  };

  const handleReload = () => {
    if (window.api?.send) {
      window.api.send('browser:reload', browserViewIdRef.current);
    }
  };

  const handleHome = () => {
    handleNavigate(initialUrl);
  };

  const handleOpenExternal = () => {
    if (window.api?.send) {
      window.api.send('browser:open-external', url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleNavigate(inputUrl);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Toolbar */}
      <div className="h-10 shrink-0 flex items-center gap-2 px-3 bg-sidebar-background border-b border-divider">
        {/* Navigation Buttons */}
        <button
          onClick={handleGoBack}
          disabled={!canGoBack}
          className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleGoForward}
          disabled={!canGoForward}
          className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Go forward"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleReload}
          className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Reload"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        
        <button
          onClick={handleHome}
          className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Home"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* URL Bar */}
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter URL..."
            className="w-full px-3 py-1.5 text-sm bg-card-background border border-border rounded focus:outline-none focus:border-primary text-text-primary placeholder:text-text-secondary"
          />
        </form>

        {/* Open in External Browser */}
        <button
          onClick={handleOpenExternal}
          className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Open in external browser"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Browser Content Area - BrowserView will be attached here by main process */}
      <div 
        id={`browser-container-${browserViewIdRef.current}`}
        className="flex-1 relative bg-white"
      >
        {/* Placeholder while loading */}
        <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
          {isLoading ? 'Loading...' : ''}
        </div>
      </div>
    </div>
  );
};

export default CodeBrowser;
