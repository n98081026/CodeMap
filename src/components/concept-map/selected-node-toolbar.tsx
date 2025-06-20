"use client";

import React, { memo } from 'react'; // Imported memo
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
<<<<<<< HEAD
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Added Popover imports
import { Type, Sparkles, MessageSquareQuote, Trash2, Lightbulb, Palette, Spline } from 'lucide-react'; // Added Palette and Spline
=======
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Type, Sparkles, MessageSquareQuote, Trash2, Lightbulb, Palette, Share2, Link as LinkIcon } from 'lucide-react';
>>>>>>> master

interface SelectedNodeToolbarProps {
  nodeId: string;
  onEditLabel: () => void;
  onChangeColor: (color: string) => void; // New prop
<<<<<<< HEAD
  onStartConnection?: () => void; // New prop for starting a connection
=======
  onStartConnection: () => void; // New prop for starting a connection
>>>>>>> master
  onAIExpand: () => void;
  onAIRewrite: () => void;
  onAISuggestRelations: () => void;
  onDeleteNode: () => void;
}

const PREDEFINED_COLORS = ['#FFFFFF', '#FFF1F0', '#E6F7FF', '#F6FFED', '#FFFBE6', '#F0F0F0', '#D9D9D9', '#B5F5EC', '#E6F7FF', '#CFE2F3', '#D9EAD3', '#FFF2CC', '#FFE5CC', '#F4CCCC', '#EAD1DC'];

const SelectedNodeToolbar: React.FC<SelectedNodeToolbarProps> = ({
  nodeId,
  onEditLabel,
  onChangeColor, // Destructure new prop
  onStartConnection, // Destructure new prop
  onAIExpand,
  onAIRewrite,
  onAISuggestRelations,
  onDeleteNode,
}) => { // Renamed to SelectedNodeToolbarInternal for memo wrapping
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

      <Button variant="ghost" size="icon" onClick={onStartConnection} title="Start Connection">
        <Share2 className="w-4 h-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" title="Change Color">
            <Palette className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2 flex flex-wrap gap-2 w-[160px]" onClick={handleInteraction}>
          {PREDEFINED_COLORS.map((color) => (
            <button
              key={color}
              title={color === '#FFFFFF' ? 'Default (Clear)' : color}
              onClick={() => onChangeColor(color === '#FFFFFF' ? '' : color)}
              className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: color }}
            />
          ))}
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" onClick={onStartConnection} title="Start Connection" disabled={!onStartConnection}>
        <Spline className="w-4 h-4" />
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

export default memo(SelectedNodeToolbar); // Wrapped with memo
