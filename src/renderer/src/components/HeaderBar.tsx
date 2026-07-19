import { Bell, Settings, User, PanelRightClose, PanelRightOpen, Minus, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeaderBarProps {
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
}

export function HeaderBar({ isRightPanelOpen = true, onToggleRightPanel }: HeaderBarProps) {
  const ToggleIcon = isRightPanelOpen ? PanelRightClose : PanelRightOpen;
  const [isMaximized, setIsMaximized] = useState(false);

  // Check initial maximized state
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await window.api.invoke('window:isMaximized');
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to check window state:', error);
      }
    };
    checkMaximized();

    // Listen for window maximize/unmaximize events
    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);

    window.api.on('window:maximized', handleMaximize);
    window.api.on('window:unmaximized', handleUnmaximize);

    return () => {
      window.api.off('window:maximized', handleMaximize);
      window.api.off('window:unmaximized', handleUnmaximize);
    };
  }, []);

  const handleMinimize = () => {
    window.api.invoke('window:minimize').catch(console.error);
  };

  const handleMaximize = () => {
    if (isMaximized) {
      window.api.invoke('window:unmaximize').catch(console.error);
    } else {
      window.api.invoke('window:maximize').catch(console.error);
    }
  };

  const handleClose = () => {
    window.api.invoke('window:close').catch(console.error);
  };

  return (
    <div className="h-10 w-full shrink-0 border-b border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-primary tracking-wider">PHANTOMA</span>
        <span className="text-[10px] font-mono text-text-secondary/60 bg-border/30 px-1.5 py-0.5 rounded border border-border/50">
          1.2.34
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors">
          <Bell className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors">
          <Settings className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button 
          onClick={onToggleRightPanel}
          className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors"
        >
          <ToggleIcon className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-primary text-xs font-medium border border-primary/30">
          <User className="w-3.5 h-3.5" strokeWidth={1.5} />
        </div>
        {/* Window Controls */}
        <div className="flex items-center gap-1 ml-1 border-l border-border/50 pl-2">
          <button 
            onClick={handleMinimize}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button 
            onClick={handleMaximize}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Square className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button 
            onClick={handleClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-white hover:bg-red-500/80 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
    