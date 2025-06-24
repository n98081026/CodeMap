import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Step as JoyrideStep } from 'react-joyride';

// Re-define TutorialStep here or import from app-tutorial.tsx if it's moved to a types file
export interface TutorialStep extends JoyrideStep {
  pagePath?: string;
  isNavigationTrigger?: boolean;
  isModalTrigger?: boolean; // True if this step expects a modal to be opened by user action
}

interface TutorialState {
  activeTutorialKey: string | null;
  allTutorialFlows: Record<string, TutorialStep[]>;
  currentStepIndex: number;
  isTutorialRunning: boolean;
  completedTutorials: string[]; // Array of keys for completed tutorials
  isWaitingForNextStepTarget: boolean;
  isHydrated: boolean; // New state for hydration status
}

interface TutorialActions {
  initializeTutorials: (flows: Record<string, TutorialStep[]>) => void;
  startOrResumeTutorial: (key: string, specificStepIndex?: number, forceStart?: boolean) => void;
  stopTutorial: (markAsComplete?: boolean) => void;
  setTutorialStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  markTutorialAsCompleted: (key: string) => void;
  // loadCompletedTutorialsFromLocalStorage is now implicit via persist
  resetTutorialProgress: (key?: string) => void;
  setIsWaitingForNextStepTarget: (isWaiting: boolean) => void;
  _getCurrentFlowSteps: () => TutorialStep[] | null; // Helper
  _setIsHydrated: (hydrated: boolean) => void; // Internal action
}

const initialTutorialState: TutorialState = {
  activeTutorialKey: null,
  allTutorialFlows: {},
  currentStepIndex: 0,
  isTutorialRunning: false,
  completedTutorials: [],
  isWaitingForNextStepTarget: false,
  isHydrated: false, // Initialize as false
};

const useTutorialStore = create<TutorialState & TutorialActions>()(
  persist(
    (set, get) => ({
      ...initialTutorialState,

      _setIsHydrated: (hydrated) => set({ isHydrated: hydrated }),

      initializeTutorials: (flows) => set({ allTutorialFlows: flows }),

      _getCurrentFlowSteps: () => {
        const key = get().activeTutorialKey;
        if (!key) return null;
        return get().allTutorialFlows[key] || null;
      },

      startOrResumeTutorial: (key, specificStepIndex?: number, forceStart?: boolean) => {
        if (!forceStart && get().completedTutorials.includes(key) && specificStepIndex === undefined) {
          console.log(`TutorialStore: Tutorial '${key}' already completed and not forced. Not starting.`);
          return;
        }
        const flowSteps = get().allTutorialFlows[key];
        if (!flowSteps || flowSteps.length === 0) {
          console.warn(`TutorialStore: No steps found for tutorial key '${key}'.`);
          return;
        }

        const startIndex = specificStepIndex !== undefined ? specificStepIndex : 0;

        console.log(`TutorialStore: Starting/Resuming tutorial '${key}' at step ${startIndex}.`);
        set({
          activeTutorialKey: key,
          currentStepIndex: startIndex,
          isTutorialRunning: true,
          isWaitingForNextStepTarget: false,
        });
      },

      stopTutorial: (markAsComplete = false) => {
        const key = get().activeTutorialKey;
        if (markAsComplete && key) {
          get().markTutorialAsCompleted(key);
        }
        console.log(`TutorialStore: Stopping tutorial. Key: ${key}, Marked complete: ${markAsComplete}`);
        set({
          isTutorialRunning: false,
          activeTutorialKey: null, // Or keep for potential resume? For now, clear.
          currentStepIndex: 0,
          isWaitingForNextStepTarget: false,
        });
      },

      setTutorialStep: (index) => {
        const currentFlow = get()._getCurrentFlowSteps();
        if (currentFlow && index >= 0 && index < currentFlow.length) {
          console.log(`TutorialStore: Setting step to ${index}.`);
          set({ currentStepIndex: index, isWaitingForNextStepTarget: false });
        } else if (currentFlow && index >= currentFlow.length) {
          console.log(`TutorialStore: Attempted to set step beyond flow length. Completing tutorial.`);
          get().stopTutorial(true); // Auto-mark as complete if trying to go past the end
        } else {
            console.warn(`TutorialStore: Invalid step index ${index} for current flow.`);
        }
      },

      nextStep: () => {
        const currentFlow = get()._getCurrentFlowSteps();
        if (!currentFlow || !get().isTutorialRunning) return;

        const currentIndex = get().currentStepIndex;
        const currentStepConfig = currentFlow[currentIndex];

        if (currentStepConfig?.isNavigationTrigger || currentStepConfig?.isModalTrigger) {
            set({ isWaitingForNextStepTarget: true, isTutorialRunning: false });
            // Joyride will be paused, AppTutorial's useEffect will try to resume when target appears
        }

        if (currentIndex >= currentFlow.length - 1) {
          console.log(`TutorialStore: Reached end of tutorial '${get().activeTutorialKey}'.`);
          get().stopTutorial(true);
          return;
        }

        const nextIndex = currentIndex + 1;
        // const nextStepConfig = currentFlow[nextIndex]; // Config of the step we are GOING TO

        // Check the step we *just completed* (currentIndex) for triggers
        const currentStepConfig = currentFlow[currentIndex];
        if (currentStepConfig?.isNavigationTrigger || currentStepConfig?.isModalTrigger) {
            console.log(`TutorialStore: Step ${currentIndex} ('${currentStepConfig.target}') was a trigger. Setting waiting state for next step ${nextIndex}.`);
            set({
                currentStepIndex: nextIndex, // Advance index
                isWaitingForNextStepTarget: true,
                isTutorialRunning: false // Pause Joyride UI
            });
        } else {
            console.log(`TutorialStore: Advancing to step ${nextIndex}.`);
            set({
                currentStepIndex: nextIndex,
                isWaitingForNextStepTarget: false, // Not waiting if current wasn't a trigger
                // isTutorialRunning should already be true if we are here from a running tour
            });
        }
      },

      prevStep: () => {
        const currentFlow = get()._getCurrentFlowSteps();
        if (!currentFlow) return;

        const currentIndex = get().currentStepIndex;
        if (currentIndex > 0) {
          const prevIndex = currentIndex - 1;
          console.log(`TutorialStore: Going to previous step ${prevIndex}.`);
          set({
            currentStepIndex: prevIndex,
            isWaitingForNextStepTarget: false,
            isTutorialRunning: true // Explicitly set to running when going back
          });
        } else {
            console.log("TutorialStore: At the first step, cannot go back further.");
        }
      },

      markTutorialAsCompleted: (key) => {
        if (!get().completedTutorials.includes(key)) {
          console.log(`TutorialStore: Marking tutorial '${key}' as completed.`);
          set((state) => ({
            completedTutorials: [...state.completedTutorials, key],
          }));
        }
      },

      // loadCompletedTutorialsFromLocalStorage is effectively replaced by persist's rehydration

      resetTutorialProgress: (key) => {
        if (key) {
          console.log(`TutorialStore: Resetting progress for tutorial '${key}'.`);
          set((state) => ({
            completedTutorials: state.completedTutorials.filter(tKey => tKey !== key),
          }));
        } else {
          console.log("TutorialStore: Resetting progress for ALL tutorials.");
          set({ completedTutorials: [] });
        }
      },

      setIsWaitingForNextStepTarget: (isWaiting) => set({ isWaitingForNextStepTarget: isWaiting }),

    }),
    {
      name: 'codemap-tutorial-storage', // Name of the item in localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        completedTutorials: state.completedTutorials, // Only persist 'completedTutorials'
      }),
      onRehydrateStorage: () => {
        console.log('TutorialStore: Persist middleware rehydration process starting/completed.');
        return (state, error) => {
          if (error) {
            console.error('TutorialStore: Failed to rehydrate from localStorage:', error);
          } else {
            console.log('TutorialStore: Rehydration from localStorage complete. Completed tutorials:', state?.completedTutorials);
          }
          // Set hydration flag regardless of error, so app doesn't hang.
          // The store's initial state for completedTutorials will be used if rehydration fails.
          useTutorialStore.getState()._setIsHydrated(true);
        };
      },
    }
  )
);

// No need for manual call to load from local storage here, persist handles it.

export default useTutorialStore;
