import React from 'react';
import { DropdownTriggerProps } from './type';

export const DropdownTrigger = React.memo(function DropdownTrigger({ children, asChild }: DropdownTriggerProps) {
  if (asChild) return <>{children}</>;
  return <div>{children}</div>;
});

DropdownTrigger.displayName = 'DropdownTrigger';

export default DropdownTrigger;