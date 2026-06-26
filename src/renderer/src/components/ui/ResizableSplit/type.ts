import React from 'react';

export interface ResizableSplitProps {
  children: [React.ReactNode, React.ReactNode];
  direction: 'horizontal' | 'vertical';
  initialSize?: number;
  minSize?: number;
  maxSize?: number;
}