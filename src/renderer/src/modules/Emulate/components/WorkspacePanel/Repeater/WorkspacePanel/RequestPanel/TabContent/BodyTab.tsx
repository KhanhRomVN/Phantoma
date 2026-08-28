// ── Components ──
import CodeBlock, { CodeBlockRef } from '@renderer/components/common/CodeBlock';
import { useEffect } from 'react';

interface BodyTabProps {
  code: string;
  onChange: (newBody: string) => void;
  codeBlockRef?: React.RefObject<CodeBlockRef | null>;
  readOnly?: boolean;
  targetId?: string | null;
}

export function BodyTab({ code, onChange, codeBlockRef, readOnly = false, targetId = null }: BodyTabProps) {
  // Load body from DB
  const loadBody = async () => {
    console.log('[BodyTab] loadBody() called, targetId:', targetId);
    if (targetId) {
      console.log('[BodyTab] loadBody - Reloading body from DB...');
      try {
        const { emulateApi } = await import('../../../../../../services/emulate-api.service');
        console.log('[BodyTab] loadBody - emulateApi imported, fetching...');
        const res = await emulateApi.listRequests(targetId);
        console.log('[BodyTab] loadBody - listRequests response:', res);
        
        if (res.success && res.data && res.data.length > 0) {
          const req = res.data[0];
          const bodyContent = req.body || '';
          console.log('[BodyTab] loadBody - Loaded body from DB:', bodyContent);
          console.log('[BodyTab] loadBody - Calling onChange...');
          onChange(bodyContent);
          console.log('[BodyTab] loadBody - ✅ onChange called successfully');
        }
      } catch (err) {
        console.error('[BodyTab] loadBody - Failed to load body from DB:', err);
      }
    } else {
      console.warn('[BodyTab] loadBody - No targetId, skipping');
    }
  };

  // Listen for repeater-updated event to reload data from DB
  useEffect(() => {
    if (!targetId) return;
    
    console.log('[BodyTab] Setting up repeater-updated listener, targetId:', targetId);
    
    const handleRepeaterUpdated = () => {
      console.log('[BodyTab] ✅ Received repeater-updated event!');
      console.log('[BodyTab] Calling loadBody()...');
      loadBody();
    };

    window.addEventListener('repeater-updated', handleRepeaterUpdated);
    console.log('[BodyTab] Event listener added for repeater-updated');
    
    return () => {
      window.removeEventListener('repeater-updated', handleRepeaterUpdated);
      console.log('[BodyTab] Event listener removed for repeater-updated');
    };
  }, [targetId]);

  // Polling mechanism to check for database changes (fallback if event doesn't work)
  useEffect(() => {
    if (!targetId) return;

    console.log('[BodyTab] Setting up polling mechanism, targetId:', targetId);
    
    let lastKnownContent = '';
    
    const checkForChanges = async () => {
      if (!targetId) return;
      
      try {
        const { emulateApi } = await import('../../../../../../services/emulate-api.service');
        const res = await emulateApi.listRequests(targetId);
        
        if (res.success && res.data && res.data.length > 0) {
          const req = res.data[0];
          const currentContent = req.body || '';
          
          // Only reload if content actually changed
          if (currentContent !== lastKnownContent && lastKnownContent !== '') {
            console.log('[BodyTab] 🔄 Database content changed, reloading...');
            console.log('[BodyTab] Old:', lastKnownContent);
            console.log('[BodyTab] New:', currentContent);
            
            loadBody();
          }
          
          lastKnownContent = currentContent;
        }
      } catch (err) {
        console.error('[BodyTab] Polling error:', err);
      }
    };
    
    // Initial content snapshot
    (async () => {
      try {
        const { emulateApi } = await import('../../../../../../services/emulate-api.service');
        const res = await emulateApi.listRequests(targetId);
        if (res.success && res.data && res.data.length > 0) {
          lastKnownContent = res.data[0].body || '';
          console.log('[BodyTab] Initial content snapshot:', lastKnownContent);
        }
      } catch (err) {
        console.error('[BodyTab] Error getting initial snapshot:', err);
      }
    })();
    
    // Poll every 2 seconds
    const intervalId = setInterval(checkForChanges, 2000);
    
    return () => {
      clearInterval(intervalId);
      console.log('[BodyTab] Polling stopped');
    };
  }, [targetId]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <CodeBlock
          ref={codeBlockRef}
          code={code}
          onChange={(newBody) => {
            if (readOnly) return;
            onChange(newBody);
          }}
          language="json"
          className="h-full"
          showLineNumbers
          wordWrap="on"
        />
      </div>
    </div>
  );
}
