import React from "react";
import {
  Eye,
  Download,
  Plus,
  Info,
  Trash2,
  ExternalLink,
} from "lucide-react";
import type { SkillSummary } from "../../../types/skill.types";
import { formatNumber } from "../../../utils/formatNumber";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { $ } from '@renderer/utils/color';

interface SkillCardProps {
  skill: SkillSummary;
  installed: boolean;
  onClick: (skill: SkillSummary) => void;
  /** Mở drawer chọn group trước khi install. */
  onInstallClick: (skill: SkillSummary) => void;
  /** Uninstall trực tiếp. */
  onUninstall: (skill: SkillSummary) => void;
}

/**
 * Thẻ hiển thị tóm tắt 1 skill.
 */
export function SkillCard({
  skill,
  installed,
  onClick,
  onInstallClick,
  onUninstall,
}: SkillCardProps) {
  const [hovered, setHovered] = React.useState(false);
  const [btnHovered, setBtnHovered] = React.useState(false);

  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (installed) {
      onUninstall(skill);
    } else {
      onInstallClick(skill);
    }
  };

  const handleOpenHomepage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (skill.sourceUrl) {
      window.open(skill.sourceUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Determine button styles based on state and hover
  let btnBg: string;
  let btnColor: string;

  if (!installed) {
    btnBg = `color-mix(in srgb, ${$('--text-secondary')} 12%, transparent)`;
    btnColor = $('--text-secondary');
  } else if (btnHovered) {
    btnBg = `color-mix(in srgb, ${$('--error')} 18%, transparent)`;
    btnColor = $('--error');
  } else {
    btnBg = $('--primary');
    btnColor = $('--text-foreground');
  }

  const buttonLabel = installed
    ? btnHovered
      ? "Uninstall"
      : "Installed"
    : "Install";

  return (
    <Dropdown trigger="contextmenu" align="end" side="right">
      <DropdownTrigger asChild>
        <div
          onClick={() => onClick(skill)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="relative p-3 rounded-[10px] cursor-pointer transition-colors duration-150 h-full"
          style={{
            backgroundColor: hovered ? $('--card-background-hover') : $('--input-background'),
          }}
        >
          {/* Install / Installed / Uninstall Button */}
          <button
            type="button"
            onClick={handlePrimaryClick}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            className="absolute top-2.5 right-2.5 inline-flex items-center px-3.5 py-1 rounded text-xs font-medium cursor-pointer transition-all duration-150 z-10 border-none"
            style={{
              backgroundColor: btnBg,
              color: btnColor,
            }}
          >
            {buttonLabel}
          </button>

          {/* Title */}
          <div
            className="text-sm font-semibold truncate pr-18 mb-1"
            style={{ color: $('--text-primary') }}
          >
            {skill.name}
          </div>

          {/* Author */}
          {skill.author && (
            <div
              className="text-[11px] opacity-75 mb-1.5 truncate"
              style={{ color: $('--text-secondary') }}
            >
              by {skill.author}
            </div>
          )}

          {/* Description */}
          <p
            className="text-xs leading-relaxed m-0 mb-2.5 line-clamp-2"
            style={{ color: $('--text-secondary') }}
          >
            {skill.description || "No description available"}
          </p>

          {/* Stats */}
          <div
            className="flex items-center gap-3 text-[10px]"
            style={{ color: $('--text-secondary') }}
          >
            <span className="inline-flex items-center gap-1">
              <Eye size={12} />
              {formatNumber(skill.views)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Download size={12} />
              {formatNumber(skill.installs)}
            </span>
          </div>
        </div>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem
          icon={<Info size={14} />}
          onClick={() => onClick(skill)}
        >
          View skill details
        </DropdownItem>
        {installed ? (
          <DropdownItem
            icon={<Trash2 size={14} />}
            variant="error"
            onClick={() => onUninstall(skill)}
          >
            Uninstall skill
          </DropdownItem>
        ) : (
          <DropdownItem
            icon={<Plus size={14} />}
            onClick={() => onInstallClick(skill)}
          >
            Install skill
          </DropdownItem>
        )}
        {skill.sourceUrl && (
          <DropdownItem
            icon={<ExternalLink size={14} />}
            onClick={() => handleOpenHomepage()}
          >
            View homepage
          </DropdownItem>
        )}
      </DropdownContent>
    </Dropdown>
  );
}