export interface Dependency {
  name: string;
  version: string;
  vulnerable?: boolean;
  cve?: string[];
}

export interface DependencyAnalysis {
  packageJson?: Dependency[];
  requirementsTxt?: Dependency[];
  pomXml?: Dependency[];
  composerJson?: Dependency[];
  goMod?: Dependency[];
  cargoToml?: Dependency[];
}