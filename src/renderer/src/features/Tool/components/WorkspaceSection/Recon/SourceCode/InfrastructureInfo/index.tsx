import { SectionHeader } from '../../shared-ui';

export function SourceCodeInfrastructureInfo({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#f5a623">Infrastructure Information</SectionHeader>
        <div>TODO: CI/CD config, Docker config, Kubernetes config, Terraform, CloudFormation, deployment script</div>
      </div>
    </div>
  );
}