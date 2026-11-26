import type { ProfileSource } from '../../../shared/types';
import type { SourceDraft } from '../components/SourceModal/source-modal.types';

export function toSourceDraft(source: ProfileSource | undefined): SourceDraft | undefined {
  return source
    ? {
        name: source.name,
        type: source.type,
        location: source.location ?? '',
        browsers: source.browsers,
        description: source.description,
      }
    : undefined;
}
