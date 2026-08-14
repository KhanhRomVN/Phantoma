// Data point types for Intel feature
export interface DataPoint {
  id: string;
  type: string;
  value: string | number | boolean;
  source: string;
  confidence: number;
  timestamp: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface DataPointRowProps {
  data: DataPoint;
  showSource?: boolean;
  showConfidence?: boolean;
  onSelect?: (data: DataPoint) => void;
  className?: string;
}

export interface DataTableProps {
  data: DataPoint[];
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, item: DataPoint) => React.ReactNode;
  }>;
  onRowClick?: (item: DataPoint) => void;
  className?: string;
}

export interface DataViewProps {
  data: DataPoint[];
  viewType?: 'table' | 'cards' | 'list';
  onItemClick?: (item: DataPoint) => void;
  className?: string;
}

export interface RawDataViewProps {
  data: DataPoint;
  className?: string;
}

export interface SourcesPanelProps {
  sources: Array<{
    id: string;
    name: string;
    url?: string;
    reliability: number;
    timestamp: number;
  }>;
  className?: string;
  onSourceClick?: (source: string) => void;
}

export interface TimelineClusterProps {
  events: DataPoint[];
  startDate: Date;
  endDate: Date;
  onEventClick?: (event: DataPoint) => void;
  className?: string;
}