import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { FieldKind, ServiceLink, ServiceTemplate } from '../../../../shared/types';
import type { Tone } from '../../../../shared/types/ui.types';

export interface AddEditor {
  name: string;
  kind: FieldKind;
  value: string;
  fixed: boolean;
}

export interface ServiceDetailProps {
  link: ServiceLink;
  template?: ServiceTemplate;
  onBack: () => void;
  onChange: (link: ServiceLink) => Promise<void>;
  onDelete: () => void;
}

export interface SectionCardProps {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  desc?: string;
  count?: number;
  className?: string;
  children: ReactNode;
}
