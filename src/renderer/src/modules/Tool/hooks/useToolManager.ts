import { useState, useMemo, useEffect } from 'react';
import { TOOLS_LIST } from '../data/toolsList';
import { ToolCategory } from '../types';
import { useModulePersistence } from '../../../hooks/useModulePersistence';

interface ToolsState {
  selectedTool: string;
  searchQuery: string;
  activeTab: 'information' | 'execution' | 'history' | 'profiles';
}

export const useToolManager = (
  activeToolId: string = 'nmap',
  onToolChange?: (toolId: string) => void,
) => {
  const [state, setState] = useModulePersistence<ToolsState>('tools', {
    selectedTool: activeToolId,
    searchQuery: '',
    activeTab: 'information',
  });

  // Đồng bộ activeToolId prop với state
  useEffect(() => {
    if (activeToolId && activeToolId !== state.selectedTool) {
      setState({ selectedTool: activeToolId });
    }
  }, [activeToolId]);

  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'All'>('All');

  const { selectedTool, searchQuery, activeTab } = state;

  const setSelectedTool = (toolId: string) => {
    setState({ selectedTool: toolId });
    onToolChange?.(toolId);
  };

  const setSearchQuery = (query: string) => {
    setState({ searchQuery: query });
  };

  const setActiveTab = (tab: 'information' | 'execution' | 'history' | 'profiles') => {
    setState({ activeTab: tab });
  };

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    onToolChange?.(toolId);
  };

  const currentTool = useMemo(() => TOOLS_LIST.find((t) => t.id === selectedTool), [selectedTool]);
  const ToolComponent = currentTool?.component;

  const categories: Array<ToolCategory | 'All'> = useMemo(
    () => ['All', 'Network', 'Web', 'Exploit', 'OSINT', 'Vuln'],
    [],
  );

  const filteredTools = useMemo(() => {
    return TOOLS_LIST.filter((t) => {
      const matchCat = activeCategory === 'All' || t.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q || t.name.toLowerCase().includes(q) || t.tags.some((g) => g.includes(q));
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  return {
    selectedTool,
    activeCategory,
    searchQuery,
    activeTab,
    currentTool,
    ToolComponent,
    categories,
    filteredTools,
    handleToolSelect,
    setActiveCategory,
    setSearchQuery,
    setActiveTab,
  };
};
