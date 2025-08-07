import { useState, useCallback } from 'react';

import type { SuggestionAction } from '@/components/concept-map/ai-suggestion-floater';

interface FloaterState {
  isVisible: boolean;
  position?: { x: number; y: number };
  suggestions: SuggestionAction[];
  title?: string;
}

export const useEditorFloaterState = () => {
  const [floaterState, setFloaterState] = useState<FloaterState>({
    isVisible: false,
    suggestions: [],
  });

  const showFloater = useCallback(
    (
      position: { x: number; y: number },
      suggestions: SuggestionAction[],
      title?: string
    ) => {
      setFloaterState({
        isVisible: true,
        position,
        suggestions,
        title,
      });
    },
    []
  );

  const hideFloater = useCallback(() => {
    setFloaterState((prev) => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  const Floater_handleDismiss = useCallback(() => {
    hideFloater();
  }, [hideFloater]);

  return {
    floaterState,
    showFloater,
    hideFloater,
    Floater_handleDismiss,
  };
};
