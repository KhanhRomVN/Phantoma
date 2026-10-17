import React, { useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Image,
  Video,
  Search,
  GitCommitHorizontal,
  ScrollText,
  Plus as PlusIcon,
  Sparkles,
} from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import {
  extensionService,
  messageDispatcher,
} from '@renderer/components/RightPanel/Agent/services/ExtensionService';
import {
  listRules,
  createRule,
  type Rule,
} from '../../services/ruleService';
import type { AttachedItem } from './types';
import RuleDrawer from './RuleDrawer';
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
  /** Gọi khi người dùng chọn (hoặc vừa tạo) 1 rule để gắn vào input. */
  onSelectRule?: (item: AttachedItem) => void;
  /** Gọi khi xác nhận chọn skill — truyền toàn bộ tập skill mới (thay thế tập cũ). */
  onSelectSkills?: (items: AttachedItem[]) => void;
  /** Slug các skill đang gắn vào input — dùng để tick sẵn trong drawer. */
  selectedSkillSlugs?: string[];
}

const RULE_COLOR = "#facc15";
const SKILL_COLOR = "#8b5cf6";

/**
 * Menu "+" gộp nhiều action (attach, image/video generator, deep research,
 * generate commit message, rule, skills) — tương đương ActionDropdown bản gốc.
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
  onSelectRule,
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

  // Rule submenu state — danh sách rule đã lưu + drawer tạo mới
  const [ruleListOpen, setRuleListOpen] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false);

  useEffect(() => {
    if (!ruleListOpen) return;
    setRulesLoading(true);
    listRules()
      .then(setRules)
      .catch(() => setRules([]))
      .finally(() => setRulesLoading(false));
  }, [ruleListOpen]);

  const ruleToAttachedItem = (rule: Rule): AttachedItem => ({
    id: `rule-${rule.id}`,
    path: rule.name,
    type: 'rule',
    content: rule.content,
    ruleId: Number(rule.id),
  });

  // Mỗi lần mở dropdown: hỏi main process xem workspace có .git và đã git add chưa
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRuleListOpen(false);
    }
    if (!open || !onSelectPullRequest) return;
    const requestId = `gitCheckReady-${Date.now()}`;
    gitCheckIdRef.current = requestId;
    setGitReady({ checking: true, ok: false, reason: 'Checking git...' });
    messageDispatcher.register(
      requestId,
      (msg: any) => {
        if (gitCheckIdRef.current !== requestId) return;
        const ok = !!msg.hasGit && !!msg.hasStaged;
        setGitReady({ checking: false, ok, reason: ok ? undefined : msg.reason });
      },
      5000,
      () => {
        if (gitCheckIdRef.current !== requestId) return;
        setGitReady({
          checking: false,
          ok: false,
          reason: 'Git check timed out, reopen the menu to retry',
        });
      },
    );
    extensionService.postMessage({ command: 'gitCheckReady', requestId });
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
      color: '#3b82f6',
      desc: getAttachDesc(),
      show: true,
    },
    {
      key: 'image-generator',
      label: 'Image Generator',
      icon: <Image size={14} />,
      color: '#ec4899',
      desc: 'Generate images from text descriptions',
      show: showImageGenerator,
    },
    {
      key: 'video-generator',
      label: 'Video Generator',
      icon: <Video size={14} />,
      color: '#8b5cf6',
      desc: 'Generate videos from text descriptions',
      show: showVideoGenerator,
    },
    {
      key: 'deep-research',
      label: 'Deep Research',
      icon: <Search size={14} />,
      color: '#10b981',
      desc: 'Comprehensive research and analysis',
      show: showDeepResearch,
    },
    {
      key: 'pull-request',
      label: 'Generate Commit Message',
      icon: <GitCommitHorizontal size={14} strokeWidth={2.3} />,
      color: '#f59e0b',
      desc: 'Generate a commit message from staged changes',
      show: !!onSelectPullRequest,
      disabled: !gitReady.ok,
      disabledReason: gitReady.reason,
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
      <Dropdown side="top" align="start" sideOffset={4} onOpenChange={handleOpenChange}>
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
                  <div className="text-[11px] text-text-secondary leading-tight">
                    {option.desc}
                  </div>
                </div>
              </div>
            </DropdownItem>
          ))}

          {/* Rule — chỉ hiển thị nếu onSelectRule được truyền */}
          {onSelectRule && (
            <>
              <DropdownItem
                onClick={() => setRuleListOpen((v) => !v)}
                noPadding
                closeOnSelect={false}
              >
                <div className={rowClass}>
                  <span className={badgeClass()} style={badgeStyle(RULE_COLOR)}>
                    <ScrollText size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-text-primary mb-0.5">
                      Rule
                    </div>
                    <div className="text-[11px] text-text-secondary leading-tight">
                      Attach a rule for the agent to follow
                    </div>
                  </div>
                </div>
              </DropdownItem>

              {ruleListOpen && (
                <div className="pl-3 ml-5 border-l-2 border-yellow-500/30">
                  <DropdownItem
                    onClick={() => {
                      setRuleListOpen(false);
                      setRuleDrawerOpen(true);
                    }}
                    noPadding
                  >
                    <div className={`${rowClass} py-2`}>
                      <span className={badgeClass()} style={badgeStyle(RULE_COLOR)}>
                        <PlusIcon size={14} />
                      </span>
                      <div className="text-[12.5px] font-semibold text-text-primary">
                        New Rule
                      </div>
                    </div>
                  </DropdownItem>

                  {rulesLoading && (
                    <div className="py-2 px-3 text-[11px] text-text-secondary">
                      Loading rules...
                    </div>
                  )}

                  {!rulesLoading && rules.length === 0 && (
                    <div className="py-2 px-3 text-[11px] text-text-secondary">
                      No saved rules yet
                    </div>
                  )}

                  {!rulesLoading &&
                    rules.map((rule) => (
                      <DropdownItem
                        key={rule.id}
                        onClick={() => onSelectRule(ruleToAttachedItem(rule))}
                        noPadding
                      >
                        <div className={`${rowClass} py-2`}>
                          <div className="text-[12.5px] font-semibold text-text-primary truncate">
                            {rule.name}
                          </div>
                        </div>
                      </DropdownItem>
                    ))}
                </div>
              )}
            </>
          )}

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

      {onSelectRule && (
        <RuleDrawer
          isOpen={ruleDrawerOpen}
          onClose={() => setRuleDrawerOpen(false)}
          onSave={async (name, content) => {
            const rule = await createRule(name, content);
            onSelectRule(ruleToAttachedItem(rule));
          }}
        />
      )}
    </>
  );
};

export default ActionDropdown;