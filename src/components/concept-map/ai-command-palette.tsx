'use client';

import React, { useState, useEffect, useRef } from 'react';

import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AICommand {
  id: string;
  label: string;
  icon?: LucideIcon;
  action: () => void; // The actual function to call
  description?: string;
}

interface AICommandPaletteProps {
  isOpen: boolean;
  targetRect?: DOMRect | null; // For positioning near the text input caret
  commands: AICommand[];
  filterText: string;
  onSelectCommand: (command: AICommand) => void;
  onClose: () => void;
}

export const AICommandPalette: React.FC<AICommandPaletteProps> = ({
  isOpen,
  targetRect,
  commands,
  filterText,
  onSelectCommand,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const paletteRef = useRef<HTMLDivElement>(null);

  const filteredCommands = React.useMemo(() => {
    if (!filterText) {
      return commands;
    }
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(filterText.toLowerCase()) ||
        command.id.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [commands, filterText]);

  useEffect(() => {
    setSelectedIndex(0); // Reset index when filter text changes
  }, [filterText]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredCommands.length) % filteredCommands.length
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelectCommand(filteredCommands[selectedIndex]);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, filteredCommands, selectedIndex, onSelectCommand, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && paletteRef.current) {
      const selectedButton = paletteRef.current.querySelector(
        `[data-command-index="${selectedIndex}"]`
      ) as HTMLElement;
      if (selectedButton) {
        selectedButton.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen || filteredCommands.length === 0) {
    // If no commands match filter, also close or don't show.
    // Or, show a "No results" message if preferred. For now, just don't show.
    // If it was open and filter makes commands empty, call onClose.
    if (isOpen && filteredCommands.length === 0 && commands.length > 0) {
      // Check commands.length to avoid closing if initially empty due to no commands prop
      onClose();
    }
    return null;
  }

  const paletteStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 2000, // High z-index
  };

  if (targetRect) {
    paletteStyle.top = `${targetRect.bottom + window.scrollY + 2}px`; // Position below caret
    paletteStyle.left = `${targetRect.left + window.scrollX}px`;
  } else {
    // Fallback position if targetRect is not available (e.g., center screen)
    // This should ideally not happen if triggered from an input.
    paletteStyle.top = '50%';
    paletteStyle.left = '50%';
    paletteStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <div ref={paletteRef} style={paletteStyle}>
      <Card className='w-72 shadow-xl max-h-72 overflow-y-auto'>
        <CardContent className='p-1'>
          {filteredCommands.map((command, index) => {
            const IconComponent = command.icon;
            return (
              <Button
                key={command.id}
                variant='ghost'
                size='sm'
                data-command-index={index}
                className={cn(
                  'w-full justify-start text-left flex items-center space-x-2',
                  index === selectedIndex && 'bg-accent text-accent-foreground'
                )}
                onClick={() => onSelectCommand(command)}
                onMouseEnter={() => setSelectedIndex(index)} // Allow mouse hover to change selection
              >
                {IconComponent && (
                  <IconComponent className='h-4 w-4 text-muted-foreground' />
                )}
                <div className='flex flex-col'>
                  <span className='font-medium'>{command.label}</span>
                  {command.description && (
                    <span className='text-xs text-muted-foreground'>
                      {command.description}
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default AICommandPalette;
