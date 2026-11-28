import type { ProfileInput } from '../../../shared/types';
import type { ImportRowDraft } from '../components/modals/ImportProfilesModal/import-profiles.types';

export function toProfileInput(
  draft: ImportRowDraft,
  sourceId: string,
): ProfileInput & { sourceId: string; email: string } {
  const hue = Array.from(draft.email).reduce((h, ch) => h + ch.charCodeAt(0), 0) % 360;
  return {
    sourceId,
    email: draft.email,
    displayName: draft.displayName,
    avatarHue: hue,
    recoveryEmail: draft.recoveryEmail || null,
    phone: draft.phone || null,
    totpEnabled: !!draft.totpSecret,
    totpSecret: draft.totpSecret || null,
    backupCodes: draft.backupCodes.map((code) => ({ code, used: false })),
    passwordStrength: draft.passwordStrength,
    group: draft.group,
    purpose: draft.purpose,
    notes: draft.notes,
    lastActive: new Date().toISOString(),
  };
}
