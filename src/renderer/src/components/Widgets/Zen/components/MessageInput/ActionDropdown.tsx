import React, { useRef, useState } from 'react';
import {
  Paperclip,
  Image,
  Video,
  Search,
  GitCommitHorizontal,
  Sparkles,
} from 'lucide-react';
import { $ } from '@renderer/utils/color';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import type { AttachedItem } from './types';
import SkillPickerDrawer, { type PickedSkill } from './SkillPickerDrawer';

interface AttachmentOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  desc: string;
  show: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

interface ActionDropdownProps {
  onSelectAttach: () => void;
  onSelectImageGenerator?: () => void;
  onSelectVideoGenerator?: () => void;
  onSelectDeepResearch?: () => void;
  /** Callback khi click "Create Pull Request" — nếu truyền, item sẽ hiển thị. */
  onSelectPullRequest?: () => void;
  showImageGenerator?: boolean;
  showVideoGenerator?: boolean;
  showDeepResearch?: boolean;
  triggerButton: React.ReactNode;
  currentModel?: any;
  currentModelConfig?: any;
  /** Gọi khi xác nhận chọn skill — truyền toàn bộ tập skill mới (thay thế tập cũ). */
  onSelectSkills?: (items: AttachedItem[]) => void;
  /** Slug các skill đang gắn vào input — dùng để tick sẵn trong drawer. */
  selectedSkillSlugs?: string[];
}

const SKILL_COLOR = $('--purple');

/**
 * Menu "+" gộp nhiều action (attach, image/video generator, deep research,
 * generate commit message, skills) — tương đương ActionDropdown bản gốc.
 */
const ActionDropdown: React.FC<ActionDropdownProps> = ({
  onSelectAttach,
  onSelectImageGenerator,
  onSelectVideoGenerator,
  onSelectDeepResearch,
  onSelectPullRequest,
  showImageGenerator = false,
  showVideoGenerator = false,
  showDeepResearch = false,
  triggerButton,
  currentModel,
  currentModelConfig,
  onSelectSkills,
  selectedSkillSlugs,
}) => {
  const [skillDrawerOpen, setSkillDrawerOpen] = useState(false);

  // Ưu tiên currentModelConfig (luôn fresh từ API), fallback currentModel (có thể cache)
  const modelCaps = currentModelConfig ?? currentModel;

  // Trạng thái kiểm tra git — chỉ dùng cho item Generate Commit Message
  const [gitReady, setGitReady] = useState<{
    checking: boolean;
    ok: boolean;
    reason?: string;
  }>({ checking: false, ok: false });
  const gitCheckIdRef = useRef<string | null>(null);

  // Mỗi lần mở dropdown: hỏi main process xem workspace có .git và đã git add chưa
  const handleOpenChange = (open: boolean) => {
    if (!open || !onSelectPullRequest) return;
    const requestId = `gitCheckReady-${Date.now()}`;
    gitCheckIdRef.current = requestId;
    setGitReady({ checking: true, ok: false, reason: 'Checking git...' });
    (async () => {
      try {
        const api = (window as any).api;
        if (!api?.invoke) throw new Error('IPC not available');
        const res = await api.invoke('git:check-ready', undefined);
        if (gitCheckIdRef.current !== requestId) return;
        const ok = !!res?.hasGit && !!res?.hasStaged;
        setGitReady({
          checking: false,
          ok,
          reason: ok ? undefined : res?.reason,
        });
      } catch (err: any) {
        if (gitCheckIdRef.current !== requestId) return;
        setGitReady({
          checking: false,
          ok: false,
          reason: err?.message || 'Git check failed',
        });
      }
    })();
  };

  const getAttachDesc = () => {
    const types: string[] = ['text files'];
    if (modelCaps?.is_image_upload) types.push('images');
    if (modelCaps?.is_video_upload) types.push('videos');
    if (modelCaps?.is_audio_upload) types.push('audio');
    if (modelCaps?.is_file_upload) types.push('documents');
    return `Attach ${types.join(', ')}`;
  };

  const options: AttachmentOption[] = [
    {
      key: 'attach',
      label: 'Attach',
      icon: <Paperclip size={14} />,
      color: $('--blue'),
      desc: getAttachDesc(),
      show: true,
    },
    {
      key: 'image-generator',
      label: 'Image Generator',
      icon: <Image size={14} />,
      color: $('--pink'),
      desc: 'Generate images from text descriptions',
      show: showImageGenerator,
    },
    {
      key: 'video-generator',
      label: 'Video Generator',
      icon: <Video size={14} />,
      color: $('--violet'),
      desc: 'Generate videos from text descriptions',
      show: showVideoGenerator,
    },
    {
      key: 'deep-research',
      label: 'Deep Research',
      icon: <Search size={14} />,
      color: $('--green'),
      desc: 'Comprehensive research and analysis',
      show: showDeepResearch,
    },
    {
      key: 'pull-request',
      label: 'Generate Commit Message',
      icon: <GitCommitHorizontal size={14} strokeWidth={2.3} />,
      color: $('--warn'),
      desc: gitReady.checking
        ? 'Đang kiểm tra git...'
        : gitReady.ok
          ? 'Generate a commit message from staged changes'
          : 'Chọn repository để tạo commit message',
      show: !!onSelectPullRequest,
    },
  ];

  const visibleOptions = options.filter((opt) => opt.show);

  const handleSelect = (key: string) => {
    switch (key) {
      case 'attach':
        onSelectAttach();
        break;
      case 'image-generator':
        onSelectImageGenerator?.();
        break;
      case 'video-generator':
        onSelectVideoGenerator?.();
        break;
      case 'deep-research':
        onSelectDeepResearch?.();
        break;
      case 'pull-request':
        onSelectPullRequest?.();
        break;
    }
  };

  const rowClass = "w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors hover:bg-sidebar-item-hover cursor-pointer";
  const badgeClass = () => 
    "inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0";
  
  // Helper to get dynamic bg style for badge since tailwind doesn't support arbitrary color mix easily without config
  const badgeStyle = (color: string): React.CSSProperties => ({
    backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
    color,
  });

  return (
    <>
      <Dropdown
        side="top"
        align="start"
        sideOffset={4}
        onOpenChange={handleOpenChange}
        width={320}
      >
        <DropdownTrigger asChild>{triggerButton}</DropdownTrigger>
        <DropdownContent>
          {visibleOptions.map((option) => (
            <DropdownItem
              key={option.key}
              onClick={() => handleSelect(option.key)}
              disabled={option.disabled}
              title={option.disabled ? option.disabledReason : undefined}
              noPadding
            >
              <div className={rowClass} style={{ opacity: option.disabled ? 0.5 : 1 }}>
                <span className={badgeClass()} style={badgeStyle(option.color)}>
                  {option.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text-primary mb-0.5">
                    {option.label}
                  </div>
                  <div className="text-[11px] text-text-secondary leading-tight whitespace-normal">
                    {option.desc}
                  </div>
                </div>
              </div>
            </DropdownItem>
          ))}

          {/* Skills — chỉ hiển thị nếu onSelectSkills được truyền */}
          {onSelectSkills && (
            <DropdownItem onClick={() => setSkillDrawerOpen(true)} noPadding>
              <div className={rowClass}>
                <span className={badgeClass()} style={badgeStyle(SKILL_COLOR)}>
                  <Sparkles size={14} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text-primary mb-0.5">
                    Skills
                  </div>
                  <div className="text-[11px] text-text-secondary leading-tight">
                    Attach installed skills for the agent to use
                  </div>
                </div>
              </div>
            </DropdownItem>
          )}
        </DropdownContent>
      </Dropdown>

      {onSelectSkills && (
        <SkillPickerDrawer
          isOpen={skillDrawerOpen}
          selectedSlugs={selectedSkillSlugs ?? []}
          onClose={() => setSkillDrawerOpen(false)}
          onConfirm={(skills: PickedSkill[]) =>
            onSelectSkills(
              skills.map((s) => ({
                id: `skill-${s.slug}`,
                path: s.name,
                type: 'skill' as any, // Cast to match AttachedItem union if needed
                content: s.name,
              })),
            )
          }
        />
      )}
    </>
  );
};

export default ActionDropdown;