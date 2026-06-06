export interface InfrastructureExposure {
  dockerExposure?: boolean;
  kubernetesExposure?: boolean;
  redisExposure?: boolean;
  elasticsearchExposure?: boolean;
  mongodbExposure?: boolean;
  postgresqlExposure?: boolean;
  mysqlExposure?: boolean;
}