export interface TechnicalFootprint {
  github?: string | null;
  gitlab?: string | null;
  stackoverflow?: string | null;
  publicKeys?: string[];
  domainOwnership?: string[];
  ipAddresses?: string[];
  hostingProviders?: string[];
  technologies?: string[];
  repositoryContributions?: { repo: string; contributions: number }[];
  toolsPublished?: string[];
  conferences?: string[];
  ctfResults?: { event: string; rank: number; team: string }[];
}