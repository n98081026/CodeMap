'use client';

import { CheckSquare, Edit3, AlertCircle } from 'lucide-react';
import React from 'react';

import type { ConceptLabelProps } from './AISuggestionPanelTypes';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const EditableConceptLabel: React.FC<ConceptLabelProps> = ({
  item,
  index,
  itemStatus,
  isViewOnlyMode,
  onToggleEdit,
  onInputChange,
  onConfirmEdit,
  setDragPreview,
  clearDragPreview,
}) => {
  const getStatusColor = () => {
    switch (itemStatus) {
      case 'exact-match':
        return 'text-green-600 border-green-200 bg-green-50';
      case 'similar-match':
        return 'text-orange-600 border-orange-200 bg-orange-50';
      default:
        return 'text-blue-600 border-blue-200 bg-blue-50';
    }
  };

  const getStatusIcon = () => {
    switch (itemStatus) {
      case 'exact-match':
        return <CheckSquare className='h-3 w-3 text-green-600' />;
      case 'similar-match':
        return <AlertCircle className='h-3 w-3 text-orange-500' />;
      default:
        return null;
    }
  };

  return (
    <div
      data-tutorial-id={`extracted-concept-item-${index}`}
      className={cn(
        'flex items-center justify-between p-2 rounded-md border text-sm group',
        getStatusColor()
      )}
      draggable={!isViewOnlyMode && !item.isEditing}
      onDragStart={(e) => {
        if (isViewOnlyMode || item.isEditing) {
          e.preventDefault();
          return;
        }
        const dragData = {
          text: item.current.concept,
          type: 'concept-suggestion',
          context: item.current.context,
          source: item.current.source,
        };
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        setDragPreview({
          text: item.current.concept,
          type: 'concept-suggestion',
        });
      }}
      onDragEnd={() => {
        clearDragPreview();
      }}
    >
      <div className='flex-1 min-w-0'>
        {item.isEditing &&
        item.editingField === 'concept' &&
        !isViewOnlyMode ? (
          <Input
            value={item.current.concept}
            onChange={(e) => onInputChange(index, e.target.value, 'concept')}
            className='h-7 text-sm'
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirmEdit(index);
              if (e.key === 'Escape') onConfirmEdit(index);
            }}
            onBlur={() => onConfirmEdit(index)}
          />
        ) : (
          <div className='flex items-center gap-2'>
            <button
              type='button'
              className={cn(
                'font-medium truncate text-left bg-transparent p-0 h-auto',
                !isViewOnlyMode && 'cursor-pointer hover:underline'
              )}
              onClick={
                isViewOnlyMode
                  ? undefined
                  : () => onToggleEdit(index, 'concept')
              }
              disabled={isViewOnlyMode}
            >
              {item.current.concept}
            </button>
            {getStatusIcon()}
          </div>
        )}

        {item.current.context && (
          <div className='text-xs text-muted-foreground mt-1 truncate'>
            Context: {item.current.context}
          </div>
        )}

        {item.current.source && (
          <div className='text-xs text-muted-foreground mt-1 truncate'>
            Source: {item.current.source}
          </div>
        )}
      </div>

      {!isViewOnlyMode && !item.isEditing && (
        <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
          <button
            onClick={() => onToggleEdit(index, 'concept')}
            className='p-1 hover:bg-white/50 rounded'
            title='Edit concept'
          >
            <Edit3 className='h-3 w-3' />
          </button>
        </div>
      )}
    </div>
  );
};
