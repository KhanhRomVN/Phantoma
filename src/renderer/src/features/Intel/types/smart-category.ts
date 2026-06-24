// Smart category types for Intel feature
export interface SmartCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  pattern?: string | RegExp;
  tags?: string[];
  confidence: number;
  count: number;
}

export interface SmartCategoryGroup {
  id: string;
  name: string;
  categories: SmartCategory[];
  total: number;
}