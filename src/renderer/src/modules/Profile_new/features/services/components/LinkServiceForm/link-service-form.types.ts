import type { ServiceLink, ServiceTemplate } from '../../../../shared/types';
import type { ServicePreset } from '../../constants/service.constants';

export interface LinkServiceFormProps {
  templates: ServiceTemplate[];
  links: ServiceLink[];
  initialTemplateId: string | null;
  onCancel: () => void;
  onNewTemplate: () => void;
  onCreate: (link: ServiceLink) => void;
  onPickPreset: (preset: ServicePreset) => void;
  onEditTemplate: (id: string) => void;
}
