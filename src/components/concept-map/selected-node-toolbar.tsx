'use client';

import {
  Type,
  Sparkles,
  MessageSquareQuote,
  Trash2,
  Lightbulb,
  Palette,
  Share2,
  LayoutGrid,
} from 'lucide-react';
import React, { memo } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
// import { useConceptMapAITools } from '@/hooks/useConceptMapAITools'; // Added
import useConceptMapStore from '@/stores/concept-map-store'; // Added to get isViewOnlyMode if needed

interface SelectedNodeToolbarProps {
  nodeId: string;
  numMultiSelectedNodes: number;
  multiSelectedNodeIds: string[];
  onEditLabel: () => void;
  onChangeColor: (color: string) => void;
  onStartConnection: () => void;
  onAIExpand: () => void;
  onAIRewrite: () => void;
  onAISuggestRelations: () => void;
  onDeleteNode: () => void;
}

const PREDEFINED_COLORS = [
  '#FFFFFF',
  '#FFF1F0',
  '#E6F7FF',
  '#F6FFED',
  '#FFFBE6',
  '#F0F0F0',
  '#D9D9D9',
  '#B5F5EC',
  '#E6F7FF',
  '#CFE2F3',
  '#D9EAD3',
  '#FFF2CC',
  '#FFE5CC',
  '#F4CCCC',
  '#EAD1DC',
];

const SelectedNodeToolbar: React.FC<SelectedNodeToolbarProps> = ({
  nodeId,
  numMultiSelectedNodes,
  multiSelectedNodeIds, // Will be used by the actual Dagre call via handleDagreLayoutSelection
  onEditLabel,
  onChangeColor,
  onStartConnection,
  onAIExpand,
  onAIRewrite,
  onAISuggestRelations,
  onDeleteNode,
}) => {
  const isViewOnlyMode = useConceptMapStore((state) => state.isViewOnlyMode); // Get from store
  // const { handleDagreLayoutSelection } = useConceptMapAITools(isViewOnlyMode); // Get the new function

  const handleInteraction = (
    e: React.MouseEvent | React.TouchEvent | React.PointerEvent
  ) => {
    e.stopPropagation();
  };

  return (
    <div
      className='flex items-center space-x-1 p-1 bg-popover border rounded shadow-lg z-20'
      onClick={handleInteraction}
      onDoubleClick={handleInteraction}
      onMouseDown={handleInteraction}
      onMouseUp={handleInteraction}
      onTouchStart={handleInteraction}
      onTouchEnd={handleInteraction}
      onPointerDown={handleInteraction}
      onPointerUp={handleInteraction}
    >
      <Button
        variant='ghost'
        size='icon'
        onClick={onEditLabel}
        title='Edit Label'
      >
        <Type className='w-4 h-4' />
      </Button>

      <Button
        variant='ghost'
        size='icon'
        onClick={onStartConnection}
        title='Start Connection'
      >
        <Share2 className='w-4 h-4' />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant='ghost' size='icon' title='Change Color'>
            <Palette className='w-4 h-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='p-2 flex flex-wrap gap-2 w-[160px]'
          onClick={handleInteraction}
        >
          {PREDEFINED_COLORS.map((color) => (
            <button
              key={color}
              title={color === '#FFFFFF' ? 'Default (Clear)' : color}
              onClick={() => onChangeColor(color === '#FFFFFF' ? '' : color)}
              className='w-5 h-5 rounded-full border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity'
              style={{ backgroundColor: color }}
            />
          ))}
        </PopoverContent>
      </Popover>

      <Button
        variant='ghost'
        size='icon'
        onClick={() => {
          // Placeholder for Dagre layout logic
        }}
        title='Auto-Layout Selection (Dagre)'
        disabled={numMultiSelectedNodes < 2 || isViewOnlyMode} // Also disable in view-only mode
      >
        <LayoutGrid className='w-4 h-4' />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' title='AI Actions'>
            <Sparkles className='w-4 h-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='center'
          side='bottom'
          sideOffset={5}
          onClick={handleInteraction}
        >
          <DropdownMenuItem onClick={onAIExpand}>
            <Sparkles className='w-4 h-4 mr-2' />
            Expand Concept
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAISuggestRelations}>
            <Lightbulb className='w-4 h-4 mr-2' />
            Suggest Relations
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAIRewrite}>
            <MessageSquareQuote className='w-4 h-4 mr-2' />
            Rewrite Content
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant='ghost'
        size='icon'
        onClick={onDeleteNode}
        title='Delete Node'
      >
        <Trash2 className='w-4 h-4 text-destructive hover:text-destructive/90' />
      </Button>
    </div>
  );
};

export default memo(SelectedNodeToolbar);
