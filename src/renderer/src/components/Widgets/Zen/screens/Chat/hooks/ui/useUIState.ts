/**
 * ------------------------------------------------------------------
 * useUIState
 * ------------------------------------------------------------------
 * Hook quản lý toàn bộ state liên quan đến UI (modals, dropdowns, tìm kiếm).
 *
 * Main returns:
 * - isSearchOpen / searchQuery       : Trạng thái tìm kiếm
 * - autoScrollPaused                 : Auto-scroll bị pause
 * - showProjectStructureDrawer       : Drawer project structure
 * - projectContext                   : Context của project hiện tại
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useRef } from 'react';

// ─── Hook ───────────────────────────────────────────────────────────────
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
