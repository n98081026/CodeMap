'use client';

import { XIcon, PlusCircleIcon } from 'lucide-react'; // Added PlusCircleIcon
import React, { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SuggestionAction {
  id: string;
  label: string;
  icon?: React.ElementType;
  action: () => void;
  suggestionType?: 'action' | 'content_chip'; // New property
}

export interface AISuggestionFloaterProps {
  isVisible: boolean;
  position: { x: number; y: number }; // Position for the floater (e.g., screen coordinates or relative to canvas)
  suggestions: SuggestionAction[];
  onDismiss: () => void;
  title?: string; // Optional title for the floater
}

const AISuggestionFloater: React.FC<AISuggestionFloaterProps> = ({
  isVisible,
  position,
  suggestions,
  onDismiss,
  title,
}) => {
  const floaterRef = useRef<HTMLDivElement>(null);

  // Handle Escape key press
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onDismiss]);

  // Handle click outside
  useEffect(() => {
    if (!isVisible) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        floaterRef.current &&
        !floaterRef.current.contains(event.target as Node)
      ) {
        onDismiss();
      }
    };
    // Add event listener with a slight delay to prevent immediate dismissal if opened by a click
    const timerId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onDismiss]);

  if (!isVisible) {
    return null;
  }

  // Note: The positioning (top, left) assumes these are screen coordinates
  // or coordinates relative to a positioned parent that encompasses the React Flow pane.
  // If `position` is in React Flow coordinates, a transform from flow to screen space might be needed,
  // or this component needs to be rendered within the React Flow pane itself and use flowToScreenPosition.
  // For this basic structure, we assume `position` is usable directly.
  const style: React.CSSProperties = {
    position: 'absolute', // Or 'fixed' if screen coordinates are used globally
    top: `${position.y}px`,
    left: `${position.x}px`,
    zIndex: 1600, // Ensure it's above other UI elements like mini-toolbar
  };

  return (
    <div ref={floaterRef} style={style} className='ai-suggestion-floater'>
      <Card className='w-64 shadow-xl border border-border'>
        <CardContent className='p-2'>
          {title && (
            <div className='flex justify-between items-center mb-2'>
              <h4 className='text-sm font-semibold'>{title}</h4>
              <Button
                variant='ghost'
                size='icon'
                onClick={onDismiss}
                title='Dismiss'
              >
                <XIcon className='h-4 w-4' />
              </Button>
            </div>
          )}
          <div className='flex flex-col space-y-1'>
            {suggestions.map((suggestion) => {
              if (suggestion.suggestionType === 'content_chip') {
                return (
                  <Button
                    key={suggestion.id}
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      suggestion.action();
                      onDismiss();
                    }}
                    className='justify-start w-full text-left text-muted-foreground hover:text-accent-foreground hover:bg-accent'
                    title={`Add: ${suggestion.label}`}
                  >
                    <PlusCircleIcon className='h-4 w-4 mr-2 flex-shrink-0' />
                    <span className='flex-grow truncate'>
                      {suggestion.label}
                    </span>
                  </Button>
                );
              } else {
                const IconComponent = suggestion.icon;
                return (
                  <Button
                    key={suggestion.id}
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      suggestion.action();
                      onDismiss(); // Dismiss after action
                    }}
                    className='justify-start w-full text-left'
                  >
                    {IconComponent && (
                      <IconComponent className='h-4 w-4 mr-2 flex-shrink-0' />
                    )}
                    <span className='flex-grow truncate'>
                      {suggestion.label}
                    </span>
                  </Button>
                );
              }
            })}
          </div>
          {suggestions.length === 0 && (
            <p className='text-xs text-muted-foreground p-2 text-center'>
              No suggestions available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AISuggestionFloater;
