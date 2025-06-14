"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { SparklesIcon, ZapIcon } from 'lucide-react'; // Using Zap for Quick Expand as an example

interface AISuggestionMiniToolbarProps {
  nodeId: string;
  nodeRect: { x: number, y: number, width: number, height: number } | null;
  isVisible: boolean;
  onQuickExpand: (nodeId: string) => void;
  onRewriteConcise: (nodeId: string) => void;
  // TODO: Add onSummarize, onAskQuestion etc. later
}

const AISuggestionMiniToolbar: React.FC<AISuggestionMiniToolbarProps> = ({
  nodeId,
  nodeRect,
  isVisible,
  onQuickExpand,
  onRewriteConcise,
}) => {
  if (!isVisible || !nodeRect) {
    return null;
  }

  // Basic positioning: top-right of the node, adjust as needed
  // This will need refinement, especially considering canvas zoom/pan.
  // For now, let's assume nodeRect is relative to a container that toolbar can be absolute to,
  // or that these are screen coordinates. This part is complex and will be iterated.
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${nodeRect.y - 40}px`, // Example: 40px above the node
    left: `${nodeRect.x + nodeRect.width / 2}px`, // Example: centered horizontally
    transform: 'translateX(-50%)', // Center align
    zIndex: 1500, // Ensure it's above nodes/edges
    padding: '4px',
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    gap: '4px',
  };

  return (
    <div style={style} className="ai-mini-toolbar">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onQuickExpand(nodeId)}
        title="Quick Expand (AI)"
      >
        <ZapIcon className="h-4 w-4 mr-1" />
        Expand
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRewriteConcise(nodeId)}
        title="Rewrite Concise (AI)"
      >
        <SparklesIcon className="h-4 w-4 mr-1" />
        Concise
      </Button>
      {/* Add more buttons here: Summarize, Ask Question, etc. */}
    </div>
  );
};

export default AISuggestionMiniToolbar;
