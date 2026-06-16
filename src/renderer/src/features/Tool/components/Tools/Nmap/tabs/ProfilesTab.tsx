import React, { useState, useEffect } from 'react';
import { Trash2, Play } from 'lucide-react';
import { NmapScanParams } from '../types';

interface SavedProfile {
  id: string;
  name: string;
  params: NmapScanParams;
  createdAt: number;
  updatedAt: number;
}

interface ProfilesTabProps {
  params: NmapScanParams;
  onLoadProfile: (params: NmapScanParams) => void;
  accentColor: string;
  onProfilesChange?: (profiles: SavedProfile[]) => void;
  openSaveDialog?: boolean;
  onSaveDialogClosed?: () => void;
}

const ProfilesTab: React.FC<ProfilesTabProps> = ({ params, onLoadProfile, accentColor, onProfilesChange, openSaveDialog, onSaveDialogClosed }) => {
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number; profileId: string } | null>(null);
  const [currentPageMap, setCurrentPageMap] = useState<{ [target: string]: number }>({});

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (contextMenuState && !target.closest('.context-menu')) {
        setContextMenuState(null);
      }
    };
    
    if (contextMenuState) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [contextMenuState]);

  // Load saved profiles from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nmap_saved_profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedProfiles(parsed);
        if (onProfilesChange) {
          onProfilesChange(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved profiles', e);
      }
    }
  }, []);

  // Open save dialog when triggered from parent
  useEffect(() => {
    if (openSaveDialog) {
      setShowSaveDialog(true);
      if (onSaveDialogClosed) {
        onSaveDialogClosed();
      }
    }
  }, [openSaveDialog]);

  // Save profiles to localStorage
  const saveToLocalStorage = (profiles: SavedProfile[]) => {
    localStorage.setItem('nmap_saved_profiles', JSON.stringify(profiles));
    setSavedProfiles(profiles);
    if (onProfilesChange) {
      onProfilesChange(profiles);
    }
  };

  const handleSaveCurrentProfile = () => {
    const target = params.target.trim();
    if (!target) return;
    
    const finalName = profileName.trim() || target;
    
    // Check if profile with same name already exists
    const existingProfile = savedProfiles.find(p => p.name === finalName);
    if (existingProfile) {
      // Update existing profile
      const updated: SavedProfile = {
        ...existingProfile,
        params: { ...params },
        updatedAt: Date.now(),
      };
      saveToLocalStorage(savedProfiles.map(p => p.id === existingProfile.id ? updated : p));
    } else {
      // Create new profile
      const newProfile: SavedProfile = {
        id: Date.now().toString(),
        name: finalName,
        params: { ...params },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveToLocalStorage([...savedProfiles, newProfile]);
    }
    setProfileName('');
    setShowSaveDialog(false);
  };

  const handleLoadProfile = (profile: SavedProfile) => {
    onLoadProfile(profile.params);
  };

  const handleDeleteProfile = (id: string) => {
    saveToLocalStorage(savedProfiles.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card-background border border-border rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-base font-bold text-text-primary mb-4">Save Profile</h3>
            <div className="mb-4">
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                Profile Name (optional)
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder={`Leave empty to use "${params.target}"`}
                className="w-full p-2 rounded bg-input-background border border-border text-text-primary text-sm"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                Target
              </label>
              <div className="p-2 rounded bg-input-background border border-border text-text-primary font-mono text-sm">
                {params.target || 'No target'}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setProfileName('');
                }}
                className="px-4 py-2 text-xs font-bold rounded bg-input-background text-text-secondary hover:bg-border transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCurrentProfile}
                disabled={!params.target.trim()}
                className="px-4 py-2 text-xs font-bold rounded bg-primary text-text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Profiles List - Grouped by target */}
      {savedProfiles.length === 0 ? (
        <div className="text-center py-12 text-text-secondary text-sm">
          No saved profiles yet. Use the "SAVE PROFILE" button in the Execution tab to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {(() => {
            // Group profiles by target
            const groups: { [target: string]: SavedProfile[] } = {};
            savedProfiles.forEach(profile => {
              const target = profile.params.target;
              if (!groups[target]) {
                groups[target] = [];
              }
              groups[target].push(profile);
            });
            
            return Object.entries(groups).map(([target, profiles]) => {
              const isExpanded = expandedProfileId === target;
              const isDomain = !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target) && 
                               !target.includes('/') &&
                               target.includes('.');
              const faviconUrl = isDomain ? `https://www.google.com/s2/favicons?domain=${target}&sz=16` : null;
              
              // Build command for display
              const buildCommandDisplay = (profile: SavedProfile): string => {
                let cmd = 'nmap';
                if (profile.params.scanType === 'syn') cmd += ' -sS';
                else if (profile.params.scanType === 'tcp') cmd += ' -sT';
                else if (profile.params.scanType === 'udp') cmd += ' -sU';
                else if (profile.params.scanType === 'ping') cmd += ' -sP';
                cmd += ` -T${profile.params.timing}`;
                if (profile.params.ports) cmd += ` -p ${profile.params.ports}`;
                if (profile.params.additionalFlags) cmd += ` ${profile.params.additionalFlags}`;
                cmd += ` ${target}`;
                return cmd;
              };
              
              return (
                <div
                  key={target}
                  className="bg-card-background border border-border rounded-lg transition-all"
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedProfileId(isExpanded ? null : target)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {faviconUrl && (
                          <img
                            src={faviconUrl}
                            alt="favicon"
                            className="w-4 h-4 rounded-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <h4 className="text-sm font-bold text-text-primary">{target}</h4>
                        <span className="text-[10px] text-text-secondary bg-border px-2 py-0.5 rounded-md">
                          {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {/* Icons removed from main card */}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-border">
                      <div className="space-y-1">
                        {(() => {
                          const itemsPerPage = 10;
                          const currentPage = currentPageMap[target] || 1;
                          const totalPages = Math.ceil(profiles.length / itemsPerPage);
                          const startIndex = (currentPage - 1) * itemsPerPage;
                          const paginatedProfiles = profiles.slice(startIndex, startIndex + itemsPerPage);
                          
                          const handleContextMenu = (e: React.MouseEvent, profile: SavedProfile) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenuState({ x: e.clientX, y: e.clientY, profileId: profile.id });
                          };
                          
                          const setPage = (page: number) => {
                            setCurrentPageMap(prev => ({ ...prev, [target]: page }));
                          };
                          
                          return (
                            <>
                              {paginatedProfiles.map((profile, idx) => {
                                const globalIndex = startIndex + idx;
                                return (
                                  <div
                                    key={profile.id}
                                    className="group py-1.5 pl-4 pr-2 rounded hover:bg-dropdown-item-hover transition-colors cursor-pointer relative"
                                    onContextMenu={(e) => handleContextMenu(e, profile)}
                                    onClick={() => handleLoadProfile(profile)}
                                  >
                                    <code className="text-xs font-mono text-text-primary block">
                                      {globalIndex + 1}. {buildCommandDisplay(profile)}
                                    </code>
                                  </div>
                                );
                              })}
                              {totalPages > 1 && (
                                <div className="flex justify-center gap-2 pt-2 pb-1">
                                  <button
                                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="px-2 py-0.5 text-[10px] rounded bg-input-background text-text-secondary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                  >
                                    Previous
                                  </button>
                                  <span className="text-[10px] text-text-secondary">
                                    Page {currentPage} of {totalPages}
                                  </span>
                                  <button
                                    onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-2 py-0.5 text-[10px] rounded bg-input-background text-text-secondary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                  >
                                    Next
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  {contextMenuState && (
                    <div
                      className="context-menu fixed z-[1000] min-w-[160px] overflow-hidden rounded-md shadow-lg border border-border"
                      style={{
                        top: contextMenuState.y,
                        left: contextMenuState.x,
                        background: 'rgb(10, 15, 25)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {(() => {
                        const profile = savedProfiles.find(p => p.id === contextMenuState.profileId);
                        if (!profile) return null;
                        return (
                          <>
                            <button
                              onClick={() => {
                                handleLoadProfile(profile);
                                setContextMenuState(null);
                              }}
                              className="w-full px-3 py-2 text-left text-[12px] font-bold hover:bg-dropdown-item-hover transition-colors flex items-center gap-2 text-text-secondary"
                            >
                              <Play size={12} className="text-primary" />
                              Run
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteProfile(profile.id);
                                setContextMenuState(null);
                              }}
                              className="w-full px-3 py-2 text-left text-[12px] font-bold hover:bg-dropdown-item-hover transition-colors flex items-center gap-2 text-text-secondary"
                            >
                              <Trash2 size={12} className="text-red-500" />
                              Delete
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

export default ProfilesTab;