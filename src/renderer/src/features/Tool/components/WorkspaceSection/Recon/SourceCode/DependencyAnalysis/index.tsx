import { SectionHeader } from '../../shared-ui';

export function SourceCodeDependencyAnalysis({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#ff6b35">Dependency Analysis</SectionHeader>
        <div>TODO: package.json, requirements.txt, pom.xml, composer.json, go.mod, Cargo.toml, vulnerable dependencies</div>
      </div>
    </div>
  );
}