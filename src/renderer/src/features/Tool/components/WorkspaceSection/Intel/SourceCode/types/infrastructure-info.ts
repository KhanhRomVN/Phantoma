export interface InfrastructureInfo {
  ciCdConfig?: string[];
  dockerConfig?: string[];
  kubernetesConfig?: string[];
  terraform?: string[];
  cloudFormation?: string[];
  deploymentScripts?: string[];
}