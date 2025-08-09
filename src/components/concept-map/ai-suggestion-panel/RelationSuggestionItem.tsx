import { Edit3, CheckSquare, ArrowRight } from 'lucide-react';
import React from 'react';

import type { RelationSuggestion } from '../ai-suggestion-panel';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableRelationSuggestion {
  original: RelationSuggestion;
  current: RelationSuggestion;
  isEditing: boolean;
  editingField: 'source' | 'target' | 'relation' | 'reason' | null;
}

interface RelationSuggestionItemProps {
  item: EditableRelationSuggestion;
  index: number;
  isViewOnlyMode?: boolean;
  isSelected: boolean;
  nodesExistOnMap: boolean;
  onToggleSelection: (index: number) => void;
  onToggleEdit: (
    index: number,
    field: 'source' | 'target' | 'relation' | 'reason'
  ) => void;
  onInputChange: (
    index: number,
    value: string,
    field: 'source' | 'target' | 'relation' | 'reason'
  ) => void;
  onConfirmEdit: (index: number) => void;
  setDraggedRelationPreview: (relation: RelationSuggestion | null) => void;
}

const RelationSuggestionItem: React.FC<RelationSuggestionItemProps> =
  React.memo(
    ({
      item,
      index,
      isViewOnlyMode,
      isSelected,
      nodesExistOnMap,
      onToggleSelection,
      onToggleEdit,
      onInputChange,
      onConfirmEdit,
      setDraggedRelationPreview,
    }) => {
      const renderEditableField = (
        field: 'source' | 'target' | 'relation' | 'reason',
        value: string,
        placeholder: string
      ) => {
        if (item.isEditing && item.editingField === field) {
          return (
            <Input
              value={value}
              onChange={(e) => onInputChange(index, e.target.value, field)}
              onBlur={() => onConfirmEdit(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onConfirmEdit(index);
                }
              }}
              placeholder={placeholder}
              className='h-7 text-xs'
            />
          );
        }

        return (
          <div className='flex items-center gap-1 group'>
            <span className='text-xs truncate'>{value || placeholder}</span>
            {!isViewOnlyMode && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => onToggleEdit(index, field)}
                className='h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
              >
                <Edit3 className='h-2.5 w-2.5' />
              </Button>
            )}
          </div>
        );
      };

      return (
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded border transition-colors group',
            isSelected
              ? 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800'
              : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
            !nodesExistOnMap && 'opacity-60'
          )}
          draggable={!isViewOnlyMode && !item.isEditing && nodesExistOnMap}
          onDragStart={(e) => {
            if (isViewOnlyMode || item.isEditing || !nodesExistOnMap) {
              e.preventDefault();
              return;
            }
            setDraggedRelationPreview(item.current);
            e.dataTransfer.setData(
              'application/json',
              JSON.stringify(item.current)
            );
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onDragEnd={() => {
            setDraggedRelationPreview(null);
          }}
        >
          {/* Selection checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(index)}
            disabled={isViewOnlyMode || !nodesExistOnMap}
            className='flex-shrink-0'
          />

          {/* Nodes exist indicator */}
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              nodesExistOnMap
                ? 'text-green-600 dark:text-green-400'
                : 'text-orange-600 dark:text-orange-400'
            )}
          >
            <CheckSquare className='h-3 w-3' />
            <span className='hidden sm:inline'>
              {nodesExistOnMap ? 'Ready' : 'Missing nodes'}
            </span>
          </div>

          {/* Relation content */}
          <div className='flex-1 min-w-0 space-y-1'>
            {/* Source -> Target */}
            <div className='flex items-center gap-2 text-sm'>
              <div className='flex-1 min-w-0'>
                {renderEditableField(
                  'source',
                  item.current.source,
                  'Source node'
                )}
              </div>
              <ArrowRight className='h-3 w-3 text-muted-foreground flex-shrink-0' />
              <div className='flex-1 min-w-0'>
                {renderEditableField(
                  'target',
                  item.current.target,
                  'Target node'
                )}
              </div>
            </div>

            {/* Relation label */}
            <div className='text-sm font-medium'>
              {renderEditableField(
                'relation',
                item.current.relation,
                'Relation label'
              )}
            </div>

            {/* Reason */}
            {item.current.reason && (
              <div className='text-xs text-muted-foreground'>
                <span className='font-medium'>Reason:</span>{' '}
                {item.current.reason}
              </div>
            )}
          </div>
        </div>
      );
    }
  );

RelationSuggestionItem.displayName = 'RelationSuggestionItem';

export default RelationSuggestionItem;
