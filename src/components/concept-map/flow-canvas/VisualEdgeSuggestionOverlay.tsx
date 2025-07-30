import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VisualEdgeSuggestion } from '@/types';

interface VisualEdgeSuggestionOverlayProps {
  suggestion: VisualEdgeSuggestion;
  onAccept?: (suggestionId: string) => void;
  onReject?: (suggestionId: string) => void;
}

const VisualEdgeSuggestionOverlay: React.FC<VisualEdgeSuggestionOverlayProps> = React.memo(({
  suggestion,
  onAccept,
  onReject,
}) => {
  const handleAccept = () => {
    onAccept?.(suggestion.id);
  };

  const handleReject = () => {
    onReject?.(suggestion.id);
  };

  // Calculate position for the overlay (midpoint of the suggested edge)
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    left: suggestion.midpointX || 0,
    top: suggestion.midpointY || 0,
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
  };

  return (
    <div style={overlayStyle} className="pointer-events-auto">
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          {suggestion.suggestedLabel || 'Add connection?'}
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAccept}
            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
});

VisualEdgeSuggestionOverlay.displayName = 'VisualEdgeSuggestionOverlay';

export default VisualEdgeSuggestionOverlay;