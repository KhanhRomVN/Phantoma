/**
 * ------------------------------------------------------------------
 * Design Card
 * ------------------------------------------------------------------
 * Card component displaying design preview with thumbnail and actions
 * ------------------------------------------------------------------
 */

import { useState } from 'react';
import { Palette, Edit2, Trash2, Eye } from 'lucide-react';
import type { Design } from '../../../types/design';

interface DesignCardProps {
  design: Design;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function DesignCard({ design, onOpen, onEdit, onDelete }: DesignCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Generate preview based on design type
  const renderPreview = () => {
    try {
      const data = JSON.parse(design.html);
      
      if (data.platform) {
        // React component template
        return (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {data.platform === 'website' && '🌐'}
                {data.platform === 'desktop' && '💻'}
                {data.platform === 'mobile' && '📱'}
              </div>
              <div className="text-xs font-medium text-gray-600 capitalize">
                {data.platform}
              </div>
            </div>
          </div>
        );
      }
    } catch {
      // HTML string template
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-4xl">📄</div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="group relative border border-border rounded-lg overflow-hidden bg-background hover:border-primary/50 transition-colors cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onOpen}
    >
      {/* Preview Thumbnail */}
      <div className="aspect-video bg-sidebar-background flex items-center justify-center relative overflow-hidden">
        {design.thumbnail ? (
          <img src={design.thumbnail} alt={design.name} className="w-full h-full object-cover" />
        ) : (
          renderPreview() || <Palette className="w-8 h-8 text-text-secondary/30" strokeWidth={1} />
        )}

        {/* Hover overlay with actions */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all transform hover:scale-110 shadow-lg"
              title="Open design"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2.5 rounded-full bg-white text-gray-900 hover:bg-gray-100 transition-all transform hover:scale-110 shadow-lg"
              title="Edit design"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2.5 rounded-full bg-error text-white hover:bg-error/90 transition-all transform hover:scale-110 shadow-lg"
              title="Delete design"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-text-primary mb-1 truncate">{design.name}</h4>
        {design.description && (
          <p className="text-xs text-text-secondary/60 line-clamp-2 mb-2">{design.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-text-secondary/40">
          <span>{new Date(design.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
