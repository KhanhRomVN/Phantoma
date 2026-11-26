import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Layers, Plus, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import { useEscapeKey } from '../../../../shared/integrations/profile-bridge';
import { ProxyInfoPanel } from '../../../proxy-inspector';
import { ProxyBasicFields } from './components/ProxyBasicFields';
import { ProxyClassificationFields } from './components/ProxyClassificationFields';
import { ProxyFormFooter } from './components/ProxyFormFooter';
import { ProxySessionFields } from './components/ProxySessionFields';
import { ProxySourceSelector } from './components/ProxySourceSelector';
import type { CreateProxyModalProps } from './CreateProxyModal.types';
import { useCreateProxyForm } from './hooks/useCreateProxyForm';

/** Modal for adding a single proxy by hand. Provider-specific flows (WARP, Foxhole, Proton) live in the VPN feature. */
export function CreateProxyModal({ isOpen, onClose, onCreate, sources, activeSourceId }: CreateProxyModalProps) {
  const {
    draft,
    set,
    host,
    portOk,
    valid,
    hostError,
    test,
    quick,
    quickError,
    changeQuick,
    applyQuick,
    reveal,
    toggleReveal,
    normalSources,
    sourceId,
    setSourceId,
    exp,
    setExpiry,
    submit,
  } = useCreateProxyForm({ isOpen, sources, activeSourceId, onCreate, onClose });

  useEscapeKey(isOpen, onClose);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative grid h-[min(92vh,max(780px,100vh))] w-[90vw] min-w-[1040px] max-w-full grid-cols-[280px_minmax(0,1fr)_460px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          >
            <aside className="flex min-h-0 min-w-0 flex-col border-r border-border">
              <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    TONE_CLASS.info.icon,
                  )}
                >
                  <Layers className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <h2 className="text-sm font-semibold text-text-primary">Destination</h2>
                  <span className="text-[11px] text-text-secondary">
                    Where this proxy is stored
                  </span>
                </div>
              </header>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                <ProxySourceSelector
                  sources={normalSources}
                  value={sourceId}
                  onChange={setSourceId}
                />
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-col">
              <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      TONE_CLASS.primary.icon,
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col">
                    <h2 className="text-sm font-semibold text-text-primary">Add proxy</h2>
                    <span className="text-[11px] text-text-secondary">
                      Connection details, classification and session settings
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-error/15 hover:text-error"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
                <ProxyBasicFields
                  draft={draft}
                  set={set}
                  hostError={hostError}
                  portOk={portOk}
                  reveal={reveal}
                  onToggleReveal={toggleReveal}
                  quick={quick}
                  quickError={quickError}
                  changeQuick={changeQuick}
                  applyQuick={applyQuick}
                />

                <ProxyClassificationFields draft={draft} set={set} />

                <ProxySessionFields draft={draft} set={set} exp={exp} setExpiry={setExpiry} />
              </div>

              <ProxyFormFooter
                valid={valid}
                test={test}
                canSubmit={valid && Boolean(sourceId)}
                onClose={onClose}
                onSubmit={submit}
              />
            </div>

            <aside className="flex min-h-0 min-w-0 flex-col border-l border-border">
              <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    TONE_CLASS.success.icon,
                  )}
                >
                  <Globe2 className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <h2 className="text-sm font-semibold text-text-primary">Proxy info</h2>
                  <span className="text-[11px] text-text-secondary">
                    Live lookup of the entered proxy
                  </span>
                </div>
              </header>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                <ProxyInfoPanel
                  host={host}
                  port={draft.port}
                  protocol={draft.protocol}
                  ready={valid}
                />
              </div>
            </aside>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default CreateProxyModal;
