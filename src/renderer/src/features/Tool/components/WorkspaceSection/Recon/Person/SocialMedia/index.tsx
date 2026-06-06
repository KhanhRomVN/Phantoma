import { SectionHeader } from '../../shared-ui';

export function PersonSocialMedia({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#f5a623">Social Media</SectionHeader>
        <div>TODO: Facebook, X/Twitter, Instagram, LinkedIn, TikTok, Reddit, Discord</div>
      </div>
    </div>
  );
}