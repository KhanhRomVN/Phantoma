/**
 * Toggle Switch Component
 */

import { useState } from 'react';

interface ToggleSwitchProps {
  label: string;
  description: string;
  defaultChecked?: boolean;
}

export function ToggleSwitch({ label, description, defaultChecked = false }: ToggleSwitchProps) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <h3 className="text-base font-medium text-gray-900 mb-1">{label}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <button
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          checked ? 'bg-purple-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
