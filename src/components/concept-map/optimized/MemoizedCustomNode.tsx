'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

import type { CustomNodeData } from '../custom-node';

import { cn } from '@/lib/utils';

// Memoized handle component to prevent unnecessary re-renders
const MemoizedHandle = memo(
  ({
    type,
    position,
    id,
    isConnectable,
  }: {
    type: 'source' | 'target';
    position: Position;
    id?: string;
    isConnectable?: boolean;
  }) => (
    <Handle
      type={type}
      position={position}
      id={id}
      isConnectable={isConnectable}
      className={cn(
        'w-3 h-3 border-2 border-background',
        type === 'source' ? 'bg-primary' : 'bg-secondary'
      )}
    />
  )
);

MemoizedHandle.displayName = 'MemoizedHandle';

// Optimized custom node with memoization
export const MemoizedCustomNode: React.FC<NodeProps<CustomNodeData>> = memo(
  ({ id, data, selected, dragging }) => {
    // Memoize node styles to prevent recalculation
    const nodeStyles = useMemo(
      () => ({
        backgroundColor: data.backgroundColor || '#ffffff',
        borderColor: selected ? '#3b82f6' : '#e5e7eb',
        borderWidth: selected ? '2px' : '1px',
        opacity: data.isGhost ? 0.5 : 1,
        transform: dragging ? 'scale(1.05)' : 'scale(1)',
        transition: dragging ? 'none' : 'transform 0.2s ease',
      }),
      [data.backgroundColor, data.isGhost, selected, dragging]
    );

    // Memoize text content to prevent unnecessary re-renders
    const textContent = useMemo(() => {
      if (typeof data.label === 'string') {
        return data.label;
      }
      return data.text || 'Untitled Node';
    }, [data.label, data.text]);

    // Memoize node dimensions
    const dimensions = useMemo(
      () => ({
        width: data.width || 150,
        height: data.height || 70,
      }),
      [data.width, data.height]
    );

    // Memoized event handlers
    const handleAIExpand = useCallback(() => {
      if (data.onTriggerAIExpand && !data.isViewOnly) {
        data.onTriggerAIExpand(id);
      }
    }, [data.onTriggerAIExpand, data.isViewOnly, id]);

    const handleStartConnection = useCallback(() => {
      if (data.onStartConnectionRequest && !data.isViewOnly) {
        data.onStartConnectionRequest(id);
      }
    }, [data.onStartConnectionRequest, data.isViewOnly, id]);

    // Memoize shape classes
    const shapeClasses = useMemo(() => {
      const baseClasses =
        'relative flex items-center justify-center p-3 border rounded shadow-sm hover:shadow-md transition-all duration-200';

      switch (data.shape) {
        case 'circle':
          return cn(baseClasses, 'rounded-full');
        case 'diamond':
          return cn(baseClasses, 'transform rotate-45');
        case 'hexagon':
          return cn(baseClasses, 'clip-path-hexagon');
        default:
          return cn(baseClasses, 'rounded-lg');
      }
    }, [data.shape]);

    return (
      <div
        className={cn(
          shapeClasses,
          'node-move-handle cursor-move',
          data.isViewOnly && 'cursor-default',
          data.isDimmed && 'opacity-50',
          data.isStaged && 'border-dashed border-blue-400'
        )}
        style={{
          ...nodeStyles,
          width: dimensions.width,
          height: dimensions.height,
        }}
      >
        {/* Connection Handles */}
        {!data.isViewOnly && (
          <>
            <MemoizedHandle
              type='target'
              position={Position.Top}
              isConnectable={!data.isViewOnly}
            />
            <MemoizedHandle
              type='source'
              position={Position.Bottom}
              isConnectable={!data.isViewOnly}
            />
            <MemoizedHandle
              type='target'
              position={Position.Left}
              isConnectable={!data.isViewOnly}
            />
            <MemoizedHandle
              type='source'
              position={Position.Right}
              isConnectable={!data.isViewOnly}
            />
          </>
        )}

        {/* Node Content */}
        <div className='flex flex-col items-center justify-center text-center w-full h-full'>
          <div
            className='font-medium text-sm leading-tight break-words max-w-full'
            style={{
              fontSize: Math.max(10, Math.min(14, dimensions.width / 12)),
              lineHeight: 1.2,
            }}
          >
            {textContent}
          </div>

          {data.details && (
            <div
              className='text-xs text-muted-foreground mt-1 break-words max-w-full'
              style={{
                fontSize: Math.max(8, Math.min(10, dimensions.width / 16)),
              }}
            >
              {data.details}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!data.isViewOnly && selected && (
          <div className='absolute -top-8 left-1/2 transform -translate-x-1/2 flex gap-1 bg-background border rounded-md shadow-lg p-1'>
            {data.onTriggerAIExpand && (
              <button
                onClick={handleAIExpand}
                className='p-1 hover:bg-accent rounded text-xs'
                title='AI Expand'
              >
                🧠
              </button>
            )}
            {data.onStartConnectionRequest && (
              <button
                onClick={handleStartConnection}
                className='p-1 hover:bg-accent rounded text-xs'
                title='Connect'
              >
                🔗
              </button>
            )}
          </div>
        )}

        {/* Type Indicator */}
        {data.type && data.type !== 'default' && (
          <div className='absolute -top-2 -right-2 w-4 h-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold'>
            {data.type.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for better memoization
    const prevData = prevProps.data;
    const nextData = nextProps.data;

    // Check if any relevant props have changed
    return (
      prevProps.id === nextProps.id &&
      prevProps.selected === nextProps.selected &&
      prevProps.dragging === nextProps.dragging &&
      prevData.label === nextData.label &&
      prevData.text === nextData.text &&
      prevData.details === nextData.details &&
      prevData.backgroundColor === nextData.backgroundColor &&
      prevData.shape === nextData.shape &&
      prevData.width === nextData.width &&
      prevData.height === nextData.height &&
      prevData.isViewOnly === nextData.isViewOnly &&
      prevData.isGhost === nextData.isGhost &&
      prevData.isDimmed === nextData.isDimmed &&
      prevData.isStaged === nextData.isStaged &&
      prevData.type === nextData.type
    );
  }
);

MemoizedCustomNode.displayName = 'MemoizedCustomNode';
