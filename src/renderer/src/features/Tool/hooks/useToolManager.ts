import { useState, useMemo } from 'react';
import { TOOLS_LIST } from '../data/toolsList';
import { ToolCategory } from '../types';

export const useToolManager = (
  activeToolId: string = 'nmap',
  onToolChange?: (toolId: string) => void,
) => {
  const [selectedTool, setSelectedTool] = useState<string>(activeToolId);
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

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
    currentTool,
    ToolComponent,
    categories,
    filteredTools,
    handleToolSelect,
    setActiveCategory,
    setSearchQuery,
  };
};
