'use client';

import { CheckSquare, Edit3, AlertCircle, ArrowRight } from 'lucide-react';
import React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { RelationLabelProps } from './AISuggestionPanelTypes';

export const EditableRelationLabel: React.FC<RelationLabelProps> = ({
  item,
  index,
  isViewOnlyMode,
  relationNodeExistence,
  onToggleEdit,
  onInputChange,
  onConfirmEdit,
  setDraggedRelationPreview,
  clearDragPreview,
}) => {
  const renderField = (
    field: 'source' | 'target' | 'relation',
    nodeExists?: boolean
  ) => {
    if (item.isEditing && item.editingField === field && !isViewOnlyMode) {
      return (
        <Input
          value={String(item.current[field] || '')}
          onChange={(e) => onInputChange(index, e.target.value, field)}
          className='h-7 text-xs px-1 py-0.5 mx-0.5 inline-block w-auto min-w-[60px] max-w-[120px]'
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirmEdit(index);
          }}
          onBlur={() => onConfirmEdit(index)}
          disabled={isViewOnlyMode}
          autoFocus
        />
      );
    }
    
    return (
      <span
        role='button'
        tabIndex={0}
        onClick={isViewOnlyMode ? undefined : () => onToggleEdit(index, field)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (!isViewOnlyMode) {
              onToggleEdit(index, field);
            }
          }
        }}
        className={cn(
          'hover:bg-muted/50 px-1 rounded inline-flex items-center',
          !isViewOnlyMode && 'cursor-pointer'
        )}
      >
        {String(item.current[field])}
        {nodeExists && field !== 'relation' && (
          <CheckSquare className='h-3 w-3 ml-1 text-green-600 inline-block' />
        )}
        {!nodeExists && field !== 'relation' && (
          <AlertCircle className='h-3 w-3 ml-1 text-orange-500 inline-block' />
        )}
      </span>
    );
  };

  return (
    <div
      data-tutorial-id={`suggested-relation-item-${index}`}
      className='flex items-center text-sm group w-full p-2 rounded-md border border-purple-200 bg-purple-50'
      draggable={!isViewOnlyMode && !item.isEditing}
      onDragStart={(e) => {
        if (isViewOnlyMode || item.isEditing) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', item.current.relation);
        setDraggedRelationPreview(item.current.relation);
      }}
      onDragEnd={() => {
        clearDragPreview();
      }}
    >
      <div className='flex items-center gap-2 flex-1 min-w-0'>
        {renderField('source', relationNodeExistence?.source)}
        <ArrowRight className='h-3 w-3 text-muted-foreground flex-shrink-0' />
        {renderField('relation')}
        <ArrowRight className='h-3 w-3 text-muted-foreground flex-shrink-0' />
        {renderField('target', relationNodeExistence?.target)}
      </div>

      {item.current.reason && (
        <div className='text-xs text-muted-foreground ml-2 truncate max-w-[100px]'>
          {item.current.reason}
        </div>
      )}

      {!isViewOnlyMode && !item.isEditing && (
        <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2'>
          <button
            onClick={() => onToggleEdit(index, 'source')}
            className='p-1 hover:bg-white/50 rounded'
            title='Edit relation'
          >
            <Edit3 className='h-3 w-3' />
          </button>
        </div>
      )}
    </div>
  );
};