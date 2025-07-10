'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(s => 
        s.key.toLowerCase() === event.key.toLowerCase() &&
        !!s.ctrlKey === event.ctrlKey &&
        !!s.shiftKey === event.shiftKey &&
        !!s.altKey === event.altKey
      );

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const showShortcuts = () => {
    const shortcutList = shortcuts.map(s => {
      const keys = [];
      if (s.ctrlKey) keys.push('Ctrl');
      if (s.shiftKey) keys.push('Shift');
      if (s.altKey) keys.push('Alt');
      keys.push(s.key.toUpperCase());
      return `${keys.join(' + ')}: ${s.description}`;
    }).join('\n');

    toast({
      title: 'Keyboard Shortcuts',
      description: shortcutList,
      duration: 5000,
    });
  };

  return { showShortcuts };
};