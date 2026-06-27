import React from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
}