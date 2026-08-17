/**
 * Setting Section Component
 */

import { ReactNode } from 'react';

interface SettingSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{title}</h2>
      {children}
    </div>
  );
}
