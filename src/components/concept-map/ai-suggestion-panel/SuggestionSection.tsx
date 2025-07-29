'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, PlusCircle, Trash2, type LucideIcon } from 'lucide-react';
import React, { useState, useMemo, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SuggestionSectionProps<T> {
  title: string;
  icon: LucideIcon;
  items: T[];
  selectedIndices: Set<number>;
  onSelectionChange: (indices: Set<number>) => void;
  onAddSelected: (items: T[]) => void;
  onClearAll?: () => void;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  isViewOnlyMode?: boolean;
  className?: string;
  headerClassName?: string;
}

export function SuggestionSection<T>({
  title,
  icon: Icon,
  items,
  selectedIndices,
  onSelectionChange,
  onAddSelected,
  onClearAll,
  renderItem,
  isViewOnlyMode,
  className,
  headerClassName,
}: SuggestionSectionProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    
    return items.filter((item, index) => {
      // Convert item to string for searching
      const itemString = JSON.stringify(item).toLowerCase();
      return itemString.includes(searchTerm.toLowerCase());
    });
  }, [items, searchTerm]);

  // Virtual scrolling for performance
  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated height per item
    overscan: 5,
  });

  const handleSelectAll = () => {
    if (selectedIndices.size === items.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map((_, index) => index)));
    }
  };

  const handleItemSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    onSelectionChange(newSelection);
  };

  const handleAddSelected = () => {
    const selectedItems = Array.from(selectedIndices).map(index => items[index]);
    onAddSelected(selectedItems);
    onSelectionChange(new Set()); // Clear selection after adding
  };

  const selectedCount = selectedIndices.size;
  const hasItems = items.length > 0;
  const hasFilteredItems = filteredItems.length > 0;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <CardHeader className={cn('pb-3', headerClassName)}>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <Icon className='h-5 w-5' />
          {title}
          {hasItems && (
            <span className='text-sm font-normal text-muted-foreground'>
              ({items.length})
            </span>
          )}
        </CardTitle>

        {hasItems && (
          <div className='space-y-2'>
            {/* Search */}
            <div className='relative'>
              <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-8 h-9'
              />
            </div>

            {/* Select All */}
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id={`select-all-${title}`}
                  checked={selectedIndices.size === items.length}
                  onCheckedChange={handleSelectAll}
                  disabled={isViewOnlyMode}
                />
                <Label
                  htmlFor={`select-all-${title}`}
                  className='text-sm font-medium'
                >
                  Select All
                </Label>
              </div>
              
              {selectedCount > 0 && (
                <span className='text-xs text-muted-foreground'>
                  {selectedCount} selected
                </span>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      {/* Items List */}
      <div className='flex-1 px-4'>
        {!hasItems ? (
          <div className='flex flex-col items-center justify-center h-32 text-center'>
            <Icon className='h-8 w-8 text-muted-foreground mb-2' />
            <p className='text-sm text-muted-foreground'>
              No {title.toLowerCase()} available
            </p>
          </div>
        ) : !hasFilteredItems ? (
          <div className='flex flex-col items-center justify-center h-32 text-center'>
            <Search className='h-8 w-8 text-muted-foreground mb-2' />
            <p className='text-sm text-muted-foreground'>
              No results found for "{searchTerm}"
            </p>
          </div>
        ) : (
          <ScrollArea className='h-full'>
            <div
              ref={parentRef}
              className='space-y-2'
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const item = filteredItems[virtualItem.index];
                const originalIndex = items.indexOf(item);
                const isSelected = selectedIndices.has(originalIndex);

                return (
                  <div
                    key={virtualItem.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className='flex items-start gap-2 p-2'>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleItemSelection(originalIndex)}
                        disabled={isViewOnlyMode}
                        className='mt-1'
                      />
                      <div className='flex-1 min-w-0'>
                        {renderItem(item, originalIndex, isSelected)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Actions */}
      {hasItems && !isViewOnlyMode && (
        <CardFooter className='pt-3 flex gap-2'>
          <Button
            onClick={handleAddSelected}
            disabled={selectedCount === 0}
            size='sm'
            className='flex-1'
          >
            <PlusCircle className='h-4 w-4 mr-2' />
            Add Selected ({selectedCount})
          </Button>
          
          {onClearAll && (
            <Button
              onClick={onClearAll}
              variant='outline'
              size='sm'
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Clear All
            </Button>
          )}
        </CardFooter>
      )}
    </div>
  );
}