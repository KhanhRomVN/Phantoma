/**
 * ------------------------------------------------------------------
 * Inspector
 * ------------------------------------------------------------------
 * Floating property panel for editing selected element properties
 * ------------------------------------------------------------------
 */

import { useState, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import type { SelectedElement } from './types';

interface InspectorProps {
  element: SelectedElement;
  onUpdate: (updates: Record<string, any>) => void;
  onClose: () => void;
}

export function Inspector({ element, onUpdate, onClose }: InspectorProps) {
  const [properties, setProperties] = useState(element.properties);

  useEffect(() => {
    setProperties(element.properties);
  }, [element]);

  const handleChange = (key: string, value: any) => {
    const updated = { ...properties, [key]: value };
    setProperties(updated);
    onUpdate(updated);
  };

  const incrementFontSize = () => {
    const current = properties.fontSize || 16;
    handleChange('fontSize', current + 1);
  };

  const decrementFontSize = () => {
    const current = properties.fontSize || 16;
    handleChange('fontSize', Math.max(1, current - 1));
  };

  return (
    <div className="fixed right-5 top-20 w-[264px] bg-sidebar-background border border-border rounded-3.5 shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.75 border-b border-divider">
        <span className="text-text-secondary/40 text-xs tracking-widest">⋮⋮</span>
        <span className="text-xs font-semibold flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-text-primary">
          {element.label}
        </span>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded-[5px] bg-transparent text-text-secondary flex items-center justify-center text-sm hover:bg-sidebar-item-hover hover:text-text-primary transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Typography Section */}
      {element.type === 'text' && (
        <div className="px-3.25 py-3 border-b border-divider">
          <div className="font-mono text-2.375 tracking-wider text-text-secondary/60 uppercase mb-2.25">
            Typography
          </div>
          <div className="grid grid-cols-2 gap-1.75">
            {/* Font */}
            <div className="col-span-2 flex flex-col gap-1">
              <div className="text-2.375 text-text-secondary/60 font-mono">FONT</div>
              <div className="bg-sidebar-item-hover border border-border rounded-lg px-2 py-1.5 text-2.875 text-text-primary flex items-center gap-1.5">
                <select
                  value={properties.fontFamily || 'Inter'}
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                  className="bg-transparent border-none outline-none text-2.875 text-text-primary w-full appearance-none cursor-pointer"
                >
                  <option>Inter</option>
                  <option>Söhne</option>
                  <option>General Sans</option>
                  <option>Fraunces</option>
                </select>
              </div>
            </div>

            {/* Size */}
            <div className="flex flex-col gap-1">
              <div className="text-2.375 text-text-secondary/60 font-mono">SIZE</div>
              <div className="bg-sidebar-item-hover border border-border rounded-lg px-2 py-1.5 text-2.875 text-text-primary flex items-center gap-1.5">
                <button onClick={decrementFontSize} className="text-text-secondary hover:text-primary">
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="text"
                  value={properties.fontSize || 16}
                  onChange={(e) => handleChange('fontSize', parseInt(e.target.value) || 16)}
                  className="bg-transparent border-none outline-none text-2.875 text-text-primary w-full text-center"
                />
                <span className="text-text-secondary/60">px</span>
                <button onClick={incrementFontSize} className="text-text-secondary hover:text-primary">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Weight */}
            <div className="flex flex-col gap-1">
              <div className="text-2.375 text-text-secondary/60 font-mono">WEIGHT</div>
              <div className="bg-sidebar-item-hover border border-border rounded-lg px-2 py-1.5 text-2.875 text-text-primary flex items-center gap-1.5">
                <select
                  value={properties.fontWeight || 400}
                  onChange={(e) => handleChange('fontWeight', parseInt(e.target.value))}
                  className="bg-transparent border-none outline-none text-2.875 text-text-primary w-full appearance-none cursor-pointer"
                >
                  <option value="400">400</option>
                  <option value="500">500</option>
                  <option value="600">600</option>
                  <option value="700">700</option>
                  <option value="800">800</option>
                </select>
              </div>
            </div>

            {/* Color */}
            <div className="flex flex-col gap-1">
              <div className="text-2.375 text-text-secondary/60 font-mono">COLOR</div>
              <div className="bg-sidebar-item-hover border border-border rounded-lg px-2 py-1.5 text-2.875 text-text-primary flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded border border-border flex-shrink-0"
                  style={{ backgroundColor: properties.color }}
                />
                <input
                  type="text"
                  value={properties.color || '#111111'}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="bg-transparent border-none outline-none text-2.875 text-text-primary w-full"
                />
              </div>
            </div>

            {/* Line Height */}
            <div className="flex flex-col gap-1">
              <div className="text-2.375 text-text-secondary/60 font-mono">LINE HEIGHT</div>
              <div className="bg-sidebar-item-hover border border-border rounded-lg px-2 py-1.5 text-2.875 text-text-primary flex items-center gap-1.5">
                <input
                  type="text"
                  value={properties.lineHeight || 1.2}
                  onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value) || 1.2)}
                  className="bg-transparent border-none outline-none text-2.875 text-text-primary w-full"
                />
              </div>
            </div>

            {/* Align */}
            <div className="col-span-2 flex flex-col gap-1">
              <div className="text-2.375 text-text-secondary/60 font-mono">ALIGN</div>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => handleChange('textAlign', align)}
                    className={cn(
                      'flex-1 bg-sidebar-item-hover border border-border rounded-md py-1.5 text-text-secondary text-2.625 font-mono transition-all',
                      properties.textAlign === align &&
                        'bg-primary/20 border-primary/50 text-primary'
                    )}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fill Section */}
      {(element.type === 'button' || element.type === 'container') && (
        <div className="px-3.25 py-3 border-b border-divider">
          <div className="font-mono text-2.375 tracking-wider text-text-secondary/60 uppercase mb-2.25">
            Fill
          </div>
          <div className="grid grid-cols-2 gap-1.75">
            {/* Background */}
            <div className="col-span-2 flex flex-col gap-1">
              <div className="text-2.375 text-text-secondary/60 font-mono">BACKGROUND</div>
              <div className="bg-sidebar-item-hover border border-border rounded-lg px-2 py-1.5 text-2.875 text-text-primary flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded border border-border flex-shrink-0"
                  style={{ backgroundColor: properties.backgroundColor }}
                />
                <input
                  type="text"
                  value={properties.backgroundColor || '#A5602F'}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="bg-transparent border-none outline-none text-2.875 text-text-primary w-full"
                />
              </div>
            </div>

            {/* Radius */}
            <div className="flex flex-col gap-1">
              <div className="text-2.375 text-text-secondary/60 font-mono">RADIUS</div>
              <div className="bg-sidebar-item-hover border border-border rounded-lg px-2 py-1.5 text-2.875 text-text-primary flex items-center gap-1.5">
                <input
                  type="text"
                  value={properties.borderRadius || 9}
                  onChange={(e) => handleChange('borderRadius', parseInt(e.target.value) || 0)}
                  className="bg-transparent border-none outline-none text-2.875 text-text-primary w-full"
                />
                <span className="text-text-secondary/60">px</span>
              </div>
            </div>

            {/* Padding */}
            <div className="flex flex-col gap-1">
              <div className="text-2.375 text-text-secondary/60 font-mono">PADDING</div>
              <div className="bg-sidebar-item-hover border border-border rounded-lg px-2 py-1.5 text-2.875 text-text-primary flex items-center gap-1.5">
                <input
                  type="text"
                  value={properties.padding || '16/30'}
                  onChange={(e) => handleChange('padding', e.target.value)}
                  className="bg-transparent border-none outline-none text-2.875 text-text-primary w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-2 px-3.25 py-2.75">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg text-2.875 font-semibold py-2 border border-border bg-transparent text-text-secondary hover:text-text-primary hover:border-primary/50 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded-lg text-2.875 font-semibold py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
