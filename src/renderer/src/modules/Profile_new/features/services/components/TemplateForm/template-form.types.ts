import type { ServiceTemplate } from '../../../../shared/types';
import type { ServicePreset } from '../../constants/service.constants';

export interface TemplateFormProps {
  template: ServiceTemplate | null;
  existingNames: string[];
  onCancel: () => void;
  onSave: (template: ServiceTemplate) => void;
  onDelete?: () => void;
  initialPreset?: ServicePreset | null;
}
