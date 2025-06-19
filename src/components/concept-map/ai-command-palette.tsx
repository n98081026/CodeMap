"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils'; // For conditional styling

export interface AICommand {
  id: string;
  label: string;
  description?: string;
  icon?: React.ElementType; // e.g., Lucide icon
  action: () => void; // Simplified action for now
}

interface AICommandPaletteProps {
  isOpen: boolean;
  targetRef?: React.RefObject<HTMLElement>; // Ref of the input it's attached to
  commands: AICommand[];
  onSelectCommand: (command: AICommand) => void;
  onClose: () => void;
  query?: string; // To filter/highlight commands
}

const AICommandPalette: React.FC<AICommandPaletteProps> = ({
  isOpen,
  targetRef,
  commands,
  onSelectCommand,
  onClose,
  query,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paletteStyle, setPaletteStyle] = useState<React.CSSProperties>({});
  const paletteRef = useRef<HTMLDivElement>(null);

  const filteredCommands = React.useMemo(() => {
    if (!query) return commands;
    return commands.filter(command =>
      command.label.toLowerCase().includes(query.toLowerCase()) ||
      command.description?.toLowerCase().includes(query.toLowerCase())
    );
  }, [commands, query]);

  useEffect(() => {
    if (isOpen && targetRef?.current && paletteRef.current) {
      const targetRect = targetRef.current.getBoundingClientRect();
      // Basic positioning: below the targetRef
      setPaletteStyle({
        position: 'absolute',
        top: `${targetRect.bottom + window.scrollY + 2}px`, // +2 for a small gap
        left: `${targetRect.left + window.scrollX}px`,
        width: `${targetRect.width}px`, // Match width of target
        zIndex: 50, // Ensure it's above other elements
      });
    }
  }, [isOpen, targetRef, filteredCommands.length]); // Re-calculate if commands change, affecting height

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredCommands.length) {
          onSelectCommand(filteredCommands[activeIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, activeIndex, filteredCommands, onSelectCommand]);

  // Reset activeIndex when query changes or commands are re-filtered
  useEffect(() => {
    setActiveIndex(0);
  }, [query, filteredCommands.length]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && paletteRef.current) {
      const activeItem = paletteRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeItem?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, activeIndex]);


  if (!isOpen || filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      ref={paletteRef}
      className="bg-popover border border-border rounded-md shadow-lg p-2 max-h-60 overflow-y-auto"
      style={paletteStyle}
    >
      <ul>
        {filteredCommands.map((command, index) => {
          const IconComponent = command.icon;
          return (
            <li key={command.id} data-index={index}>
              <button
                type="button"
                onClick={() => onSelectCommand(command)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2",
                  "hover:bg-accent hover:text-accent-foreground",
                  index === activeIndex && "bg-accent text-accent-foreground"
                )}
              >
                {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
                <div className="flex-grow">
                  <div className="font-medium">{command.label}</div>
                  {command.description && (
                    <div className="text-xs text-muted-foreground">{command.description}</div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AICommandPalette;
