"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Type, Sparkles, MessageSquareQuote, Trash2, Lightbulb } from 'lucide-react';

interface SelectedNodeToolbarProps {
  nodeId: string;
  onEditLabel: () => void;
  onAIExpand: () => void;
  onAIRewrite: () => void;
  onAISuggestRelations: () => void; // New prop
  onDeleteNode: () => void;
}

const SelectedNodeToolbar: React.FC<SelectedNodeToolbarProps> = ({
  nodeId,
  onEditLabel,
  onAIExpand,
  onAIRewrite,
  onAISuggestRelations, // Destructure new prop
  onDeleteNode,
}) => {
  // Stop propagation for all events within the toolbar to prevent node deselection or other interactions with the node itself.
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="flex items-center space-x-1 p-1 bg-popover border rounded shadow-lg z-20"
      onClick={handleInteraction}
      onDoubleClick={handleInteraction}
      onMouseDown={handleInteraction}
      onMouseUp={handleInteraction}
      onTouchStart={handleInteraction}
      onTouchEnd={handleInteraction}
      onPointerDown={handleInteraction}
      onPointerUp={handleInteraction}
      // Add other event handlers if necessary, e.g., onContextMenu
    >
      <Button variant="ghost" size="icon" onClick={onEditLabel} title="Edit Label">
        <Type className="w-4 h-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="AI Actions">
            <Sparkles className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="bottom" sideOffset={5} onClick={handleInteraction}>
          <DropdownMenuItem onClick={onAIExpand}>
            <Sparkles className="w-4 h-4 mr-2" />
            Expand Concept
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAISuggestRelations}>
            <Lightbulb className="w-4 h-4 mr-2" />
            Suggest Relations
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAIRewrite}>
            <MessageSquareQuote className="w-4 h-4 mr-2" />
            Rewrite Content
          </DropdownMenuItem>
          {/* Add more AI actions here if needed in the future */}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" onClick={onDeleteNode} title="Delete Node">
        <Trash2 className="w-4 h-4 text-destructive hover:text-destructive/90" />
      </Button>
    </div>
  );
};

export default SelectedNodeToolbar;
