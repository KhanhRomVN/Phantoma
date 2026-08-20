import { useState, useRef } from 'react';

/**
 * Hook quản lý toàn bộ state liên quan đến UI (modals, dropdowns, tìm kiếm)
 */
export const useUIState = () => {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const [showProjectStructureDrawer, setShowProjectStructureDrawer] = useState(false);
  const [showChangesDropdown, setShowChangesDropdown] = useState(false);
  const [showProjectContextModal, setShowProjectContextModal] = useState(false);
  const [projectContext, setProjectContext] = useState<any>(null);

  return {
    // Search
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,

    // Scroll
    autoScrollPaused,
    setAutoScrollPaused,

    // Modals & Dropdowns
    showProjectStructureDrawer,
    setShowProjectStructureDrawer,
    showChangesDropdown,
    setShowChangesDropdown,
    showProjectContextModal,
    setShowProjectContextModal,

    // Project context
    projectContext,
    setProjectContext,
  };
};
