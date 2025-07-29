'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useCallback } from 'react';

interface UseVirtualizedListOptions<T> {
  items: T[];
  estimateSize?: (index: number) => number;
  overscan?: number;
  getItemKey?: (index: number, item: T) => string | number;
}

export const useVirtualizedList = <T>({
  items,
  estimateSize = () => 50,
  overscan = 5,
  getItemKey,
}: UseVirtualizedListOptions<T>) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Memoize the virtualizer to prevent unnecessary recalculations
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
    getItemKey: getItemKey ? (index) => getItemKey(index, items[index]) : undefined,
  });

  // Memoize virtual items to prevent unnecessary re-renders
  const virtualItems = useMemo(() => {
    return virtualizer.getVirtualItems();
  }, [virtualizer]);

  // Memoized scroll to item function
  const scrollToItem = useCallback(
    (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => {
      virtualizer.scrollToIndex(index, options);
    },
    [virtualizer]
  );

  // Memoized scroll to top function
  const scrollToTop = useCallback(() => {
    virtualizer.scrollToOffset(0);
  }, [virtualizer]);

  // Memoized get item at index function
  const getItemAtIndex = useCallback(
    (index: number): T | undefined => {
      return items[index];
    },
    [items]
  );

  // Performance metrics
  const metrics = useMemo(() => ({
    totalSize: virtualizer.getTotalSize(),
    visibleItemsCount: virtualItems.length,
    totalItemsCount: items.length,
    startIndex: virtualItems[0]?.index ?? 0,
    endIndex: virtualItems[virtualItems.length - 1]?.index ?? 0,
  }), [virtualizer, virtualItems, items.length]);

  return {
    parentRef,
    virtualItems,
    totalSize: virtualizer.getTotalSize(),
    scrollToItem,
    scrollToTop,
    getItemAtIndex,
    metrics,
    // Expose virtualizer for advanced use cases
    virtualizer,
  };
};