/**
 * Toggle Switch Component (Mobile)
 */

import { useState } from 'react';

interface ToggleSwitchProps {
  label: string;
  defaultChecked?: boolean;
}

export function ToggleSwitch({ label, defaultChecked = false }: ToggleSwitchProps) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
            checked ? 'bg-purple-100' : 'bg-gray-100'
          }`}
        >
          🔔
        </div>
        <span className="font-medium text-gray-900 text-sm">{label}</span>
      </div>

      <button
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          checked ? 'bg-purple-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
