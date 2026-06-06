// Service/Port Types for Service component

export interface Port {
  port: number;
  service: string;
  state: string;
  banner: string;
  risk?: string;
  cve?: string[];
}