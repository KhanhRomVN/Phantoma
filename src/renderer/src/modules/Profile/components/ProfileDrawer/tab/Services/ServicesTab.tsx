import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Profile, ServiceLink } from '../../../../types';
import type { ServicePreset } from '../../../../constants/service';
import { useServiceStore } from '../../../../stores/useServiceStore';
import { profileApi } from '../../../../services/profile-api.service';
import type { ServiceLinkInput } from '../../../../services/profile-api.service';
import { findTemplate } from '../../../../utils/service';
import { ServiceList } from './ServiceList';
import { ServiceDetail } from './ServiceDetail';
import { TemplateForm } from './TemplateForm';
import { LinkServiceForm } from './LinkServiceForm';

type View =
  | { kind: 'list' }
  | { kind: 'detail'; id: string }
  | { kind: 'template'; editId: string | null; from: 'list' | 'link'; preset?: ServicePreset }
  | { kind: 'link'; templateId: string | null };

interface ServicesTabProps {
  profile: Profile;
  focus?: { target: string; nonce: number } | null;
  onFocusDone?: () => void;
}

export function ServicesTab({ profile, focus, onFocusDone }: ServicesTabProps) {
  const templates = useServiceStore((s) => s.templates);
  const stored = useServiceStore((s) => s.links[profile.id]);
  const loadTemplates = useServiceStore((s) => s.loadTemplates);
  const setLinks = useServiceStore((s) => s.setLinks);
  const saveTemplate = useServiceStore((s) => s.saveTemplate);
  const removeTemplate = useServiceStore((s) => s.removeTemplate);
  const [view, setView] = useState<View>(focus ? { kind: 'detail', id: focus.target } : { kind: 'list' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!focus) return;
    setView({ kind: 'detail', id: focus.target });
    onFocusDone?.();
  }, [focus?.nonce]);

  const links = stored ?? profile.services;
  const toList = (): void => setView({ kind: 'list' });

  const run = async (task: () => Promise<void>): Promise<void> => {
    try {
      await task();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    loadTemplates().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [loadTemplates]);

  const toInput = (l: ServiceLink): ServiceLinkInput => ({
    id: l.id,
    name: l.name,
    status: l.status,
    statusNote: l.statusNote ?? null,
    customFields: l.customFields,
    templateId: templates.some((t) => t.id === l.templateId) ? l.templateId : null,
  });


  const detailLink = view.kind === 'detail' ? links.find((l) => l.id === view.id) : undefined;
  const editingTemplate =
    view.kind === 'template' && view.editId ? (templates.find((t) => t.id === view.editId) ?? null) : null;
  const viewKey = view.kind === 'detail' ? `detail-${view.id}` : view.kind;

  return (
    <motion.div
      key={viewKey}
      initial={{ opacity: 0, x: view.kind === 'list' ? -8 : 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="flex flex-1 flex-col"
    >
      {error && (
        <div className="mb-3 rounded-md bg-error/10 px-2.5 py-1.5 text-[11px] text-error">{error}</div>
      )}
      {view.kind === 'detail' && detailLink ? (
        <ServiceDetail
          link={detailLink}
          template={findTemplate(templates, detailLink)}
          onBack={toList}
          onChange={async (next) => {
            const saved = await profileApi.serviceEmails.update(profile.id, next.id, toInput(next));
            setLinks(
              profile.id,
              links.map((l) => (l.id === saved.id ? saved : l)),
            );
          }}
          onDelete={() =>
            void run(async () => {
              await profileApi.serviceEmails.remove(profile.id, detailLink.id);
              setLinks(
                profile.id,
                links.filter((l) => l.id !== detailLink.id),
              );
              toList();
            })
          }
        />
      ) : view.kind === 'template' ? (
        <TemplateForm
          template={editingTemplate}
          initialPreset={view.preset}
          existingNames={templates.filter((t) => t.id !== editingTemplate?.id).map((t) => t.name)}
          onCancel={() => (view.from === 'link' ? setView({ kind: 'link', templateId: view.editId }) : toList())}
          onSave={(t) =>
            void run(async () => {
              const saved = await saveTemplate(t);
              setView(view.from === 'link' ? { kind: 'link', templateId: saved.id } : { kind: 'list' });
            })
          }
          onDelete={
            editingTemplate
              ? () =>
                  void run(async () => {
                    await removeTemplate(editingTemplate.id);
                    toList();
                  })
              : undefined
          }
        />
      ) : view.kind === 'link' ? (
        <LinkServiceForm
          templates={templates}
          links={links}
          initialTemplateId={view.templateId}
          onCancel={toList}
          onNewTemplate={() => setView({ kind: 'template', editId: null, from: 'link' })}
          onPickPreset={(preset) => setView({ kind: 'template', editId: null, from: 'link', preset })}
          onEditTemplate={(id) => setView({ kind: 'template', editId: id, from: 'link' })}
          onCreate={(link) =>
            void run(async () => {
              const saved = await profileApi.serviceEmails.create(profile.id, toInput(link));
              setLinks(profile.id, [saved, ...links]);
              setView({ kind: 'detail', id: saved.id });
            })
          }
        />
      ) : (
        <ServiceList
          links={links}
          templates={templates}
          onOpen={(id) => setView({ kind: 'detail', id })}
          onLink={(templateId) => setView({ kind: 'link', templateId })}
          onNewTemplate={() => setView({ kind: 'template', editId: null, from: 'list' })}
          onEditTemplate={(id) => setView({ kind: 'template', editId: id, from: 'list' })}
          onDelete={(id) =>
            void run(async () => {
              await profileApi.serviceEmails.remove(profile.id, id);
              setLinks(
                profile.id,
                links.filter((l) => l.id !== id),
              );
            })
          }
        />
      )}
    </motion.div>
  );
}

export default ServicesTab;