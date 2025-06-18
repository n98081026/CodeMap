"use client";

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card'; // Using Card for styling
import { Button } from '@/components/ui/button'; // For suggestion items
import { XIcon } from 'lucide-react'; // Example icon for a dismiss button or part of suggestions

export interface SuggestionAction {
  id: string; // For key prop
  label: string;
  icon?: React.ElementType; // e.g., Lucide icon
  action: () => void; // Callback when clicked
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
      if (floaterRef.current && !floaterRef.current.contains(event.target as Node)) {
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
    <div ref={floaterRef} style={style} className="ai-suggestion-floater">
      <Card className="w-64 shadow-xl border border-border">
        <CardContent className="p-2">
          {title && (
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold">{title}</h4>
              <Button variant="ghost" size="iconSm" onClick={onDismiss} title="Dismiss">
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
          {props.title === "Quick Add Ideas" ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => {
                    suggestion.action();
                    onDismiss(); // Dismiss after action
                  }}
                  disabled={(suggestion as any).disabled} // Handle potential disabled prop
                  className={cn(
                    "px-3 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/30 cursor-pointer",
                    (suggestion as any).disabled && "opacity-50 cursor-not-allowed"
                  )}
                  title={suggestion.label} // Use full label for tooltip
                >
                  {/* For chip display, attempt to extract core text. This is a simple heuristic. */}
                  {suggestion.label.startsWith("Add: \"") ? suggestion.label.substring(6, suggestion.label.lastIndexOf("\"")) : suggestion.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col space-y-1">
              {suggestions.map((suggestion) => {
                const IconComponent = suggestion.icon;
                return (
                  <Button
                    key={suggestion.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      suggestion.action();
                      onDismiss(); // Dismiss after action
                    }}
                    disabled={(suggestion as any).disabled} // Handle potential disabled prop
                    className={cn(
                        "justify-start w-full text-left",
                        (suggestion as any).disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {IconComponent && <IconComponent className={cn("h-4 w-4 mr-2 flex-shrink-0", (suggestion as any).disabled && "animate-spin")} />}
                    <span className="flex-grow truncate">{suggestion.label}</span>
                  </Button>
                );
              })}
            </div>
          )}
           {suggestions.length === 0 && !title?.includes("Loading") && ( // Avoid "No suggestions" if title indicates loading
                <p className="text-xs text-muted-foreground p-2 text-center">No suggestions available.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AISuggestionFloater;
