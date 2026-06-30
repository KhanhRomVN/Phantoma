import React from 'react';
import { Drawer, DrawerHeader, DrawerBody } from '@renderer/components/ui/Drawer';

interface SessionPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function SessionPanel({ isOpen = true, onClose }: SessionPanelProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose || (() => {})} height="100%" strategy="absolute">
      <DrawerHeader
        title="Session"
        description="Manage your active sessions"
        onClose={onClose}
      />
      <DrawerBody>
        <div className="flex items-center justify-center h-full text-text-secondary text-sm">
          Session Panel
        </div>
      </DrawerBody>
    </Drawer>
  );
}