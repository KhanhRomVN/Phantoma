// Filter types for Inspector/RequestTable
import { HttpMethod } from '../constants/methods';

export interface InspectorFilter {
  methods: Record<HttpMethod, boolean>;
  host: {
    whitelist: string[];
  };
  path: {
    whitelist: string[];
  };
  status: Record<number, boolean>;
  type: {
    xhr: boolean;
    js: boolean;
    css: boolean;
    img: boolean;
    media: boolean;
    font: boolean;
    doc: boolean;
    ws: boolean;
    wasm: boolean;
    manifest: boolean;
    other: boolean;
  };
  size: {
    min: string;
    max: string;
  };
  time: {
    min: string;
    max: string;
  };
}

export type FilterMethodKey = keyof InspectorFilter['methods'];
export type FilterTypeKey = keyof InspectorFilter['type'];

export const TYPE_LABELS: Record<FilterTypeKey, string> = {
  xhr: 'XHR',
  js: 'JS',
  css: 'CSS',
  img: 'Image',
  media: 'Media',
  font: 'Font',
  doc: 'Document',
  ws: 'WebSocket',
  wasm: 'WebAssembly',
  manifest: 'Manifest',
  other: 'Other',
};

export interface FilterChangeHandler {
  (filter: InspectorFilter): void;
}