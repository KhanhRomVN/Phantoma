import { SectionHeader, KV } from '../../shared-ui';

export function SourceCodeRepoInfo({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#0af">Repository Information</SectionHeader>
        <div>TODO: Repository name, owner, visibility, commit history, branches, tags, releases</div>
      </div>
    </div>
  );
}