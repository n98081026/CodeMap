import { Edit3, AlertCircle } from 'lucide-react';
import React from 'react';

import type { ExtractedConceptItem } from '../ai-suggestion-panel';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableExtractedConcept {
  original: ExtractedConceptItem;
  current: ExtractedConceptItem;
  isEditing: boolean;
  editingField: 'concept' | 'context' | 'source' | null;
}

type ItemStatus = 'new' | 'exact-match' | 'similar-match';

interface ConceptSuggestionItemProps {
  item: EditableExtractedConcept;
  index: number;
  itemStatus: ItemStatus;
  isViewOnlyMode?: boolean;
  isSelected: boolean;
  onToggleSelection: (index: number) => void;
  onToggleEdit: (index: number, field: 'concept') => void;
  onInputChange: (index: number, value: string, field: 'concept') => void;
  onConfirmEdit: (index: number) => void;
  setDragPreview: (item: { text: string; type: string } | null) => void;
  clearDragPreview: () => void;
}

const ConceptSuggestionItem: React.FC<ConceptSuggestionItemProps> = React.memo(
  ({
    item,
    index,
    itemStatus,
    isViewOnlyMode,
    isSelected,
    onToggleSelection,
    onToggleEdit,
    onInputChange,
    onConfirmEdit,
    setDragPreview,
    clearDragPreview,
  }) => {
    const getStatusColor = (status: ItemStatus) => {
      switch (status) {
        case 'exact-match':
          return 'text-orange-600 dark:text-orange-400';
        case 'similar-match':
          return 'text-yellow-600 dark:text-yellow-400';
        default:
          return 'text-green-600 dark:text-green-400';
      }
    };

    const getStatusIcon = (status: ItemStatus) => {
      switch (status) {
        case 'exact-match':
          return <AlertCircle className='h-3 w-3' />;
        case 'similar-match':
          return <AlertCircle className='h-3 w-3' />;
        default:
          return null;
      }
    };

    const getStatusText = (status: ItemStatus) => {
      switch (status) {
        case 'exact-match':
          return 'Already exists';
        case 'similar-match':
          return 'Similar exists';
        default:
          return 'New';
      }
    };

    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded border transition-colors',
          isSelected
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
            : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
        )}
        draggable={!isViewOnlyMode && !item.isEditing}
        onDragStart={(e) => {
          if (isViewOnlyMode || item.isEditing) {
            e.preventDefault();
            return;
          }
          setDragPreview({
            text: item.current.concept,
            type: 'concept',
          });
          e.dataTransfer.setData('text/plain', item.current.concept);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onDragEnd={() => {
          clearDragPreview();
        }}
      >
        {/* Selection checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(index)}
          disabled={isViewOnlyMode || itemStatus === 'exact-match'}
          className='flex-shrink-0'
        />

        {/* Status indicator */}
        <div
          className={cn(
            'flex items-center gap-1 text-xs',
            getStatusColor(itemStatus)
          )}
        >
          {getStatusIcon(itemStatus)}
          <span className='hidden sm:inline'>{getStatusText(itemStatus)}</span>
        </div>

        {/* Concept text */}
        <div className='flex-1 min-w-0'>
          {item.isEditing && item.editingField === 'concept' ? (
            <Input
              value={item.current.concept}
              onChange={(e) => onInputChange(index, e.target.value, 'concept')}
              onBlur={() => onConfirmEdit(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onConfirmEdit(index);
                }
              }}
              className='h-8 text-sm'
            />
          ) : (
            <div className='flex items-center gap-2'>
              <span className='font-medium text-sm truncate'>
                {item.current.concept}
              </span>
              {!isViewOnlyMode && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => onToggleEdit(index, 'concept')}
                  className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
                >
                  <Edit3 className='h-3 w-3' />
                </Button>
              )}
            </div>
          )}

          {/* Context and source */}
          {(item.current.context || item.current.source) && (
            <div className='text-xs text-muted-foreground mt-1 space-y-1'>
              {item.current.context && (
                <div className='truncate'>
                  <span className='font-medium'>Context:</span>{' '}
                  {item.current.context}
                </div>
              )}
              {item.current.source && (
                <div className='truncate'>
                  <span className='font-medium'>Source:</span>{' '}
                  {item.current.source}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ConceptSuggestionItem.displayName = 'ConceptSuggestionItem';

export default ConceptSuggestionItem;
