export interface LeftSidebarSettings {
  width: number;
  showSearch: boolean;
  showTypeFilter: boolean;
  density: 'comfortable' | 'compact';
}

export interface ContentTabUISettings {
  tabStyle: 'underline' | 'pill';
  showIcons: boolean;
  showBoxCount: boolean;
}

export interface ReconSettings {
  leftSidebar: LeftSidebarSettings;
  contentTabUI: ContentTabUISettings;
}

export const DEFAULT_RECON_SETTINGS: ReconSettings = {
  leftSidebar: {
    width: 320,
    showSearch: true,
    showTypeFilter: true,
    density: 'comfortable',
  },
  contentTabUI: {
    tabStyle: 'underline',
    showIcons: true,
    showBoxCount: true,
  },
};