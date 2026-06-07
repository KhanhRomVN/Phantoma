// Domain-local SmartCategoryGroup type — replaces import from Person module

export interface SmartCategoryGroup {
  id: string;
  label: string;
  icon: string;
  accent: string;
  priority: number;
  description: string;
  categories: string[];
  isActive: boolean;
  count: number;
}