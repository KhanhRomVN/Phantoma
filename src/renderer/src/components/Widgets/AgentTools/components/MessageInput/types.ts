export interface ModelMeta {
  variants: string[];
  contextWindow?: number;
}

export interface ProviderOption {
  id: string;
  name: string;
  url?: string;
  models: string[];
  modelMeta?: Record<string, ModelMeta>;
  agents?: string[];
}

export interface RunOptions {
  variant?: string;
  agent?: string;
  contextSize?: string;
}