import React from 'react';
import { $ } from '../../utils/color';

const TestPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Tailwind Variable Test</h1>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-secondary">
          So sánh 2 cách dùng màu primary
        </h2>

        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          {/* Box 1: dùng class bg-primary từ Tailwind */}
          <div className="p-4 rounded-lg border border-border bg-primary">
            <div className="text-sm font-medium text-white">class="bg-primary"</div>
          </div>

          {/* Box 2: dùng $('--primary') - CSS variable với helper */}
          <div
            className="p-4 rounded-lg border border-border"
            style={{ backgroundColor: $('--primary') }}
          >
            <div className="text-sm font-medium text-white">$('--primary')</div>
          </div>

          {/* Box 3: dùng class bg-primary/10 từ Tailwind */}
          <div className="p-4 rounded-lg border border-border bg-primary/10">
            <div className="text-sm font-medium text-text-primary">class="bg-primary/10"</div>
          </div>

          {/* Box 4: dùng $('--primary', 0.1) - CSS variable với alpha */}
          <div
            className="p-4 rounded-lg border border-border"
            style={{ backgroundColor: $('--primary', 0.1) }}
          >
            <div className="text-sm font-medium text-text-primary">$('--primary', 0.1)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
