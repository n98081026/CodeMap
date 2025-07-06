import { create } from 'zustand';

import { create } from 'zustand';
import { availableTutorials } from '@/components/tutorial/app-tutorial'; // Import to access all tutorial keys

interface TutorialStoreState {
  activeTutorialKey: string | null;
  runTutorial: boolean;
  currentStepIndex: number;
  startOrResumeTutorial: (tutorialKey: string, stepIndex?: number, forceRestart?: boolean) => void;
  stopTutorial: () => void;
  setRunTutorialState: (run: boolean) => void;
  setStepIndex: (index: number) => void;
  resetTutorialProgress: (tutorialKey?: string) => void; // Can reset one or all
}

const useTutorialStore = create<TutorialStoreState>((set, get) => ({
  activeTutorialKey: null,
  runTutorial: false,
  currentStepIndex: 0,
  startOrResumeTutorial: (tutorialKey, stepIndex = 0, forceRestart = false) => {
    const currentKey = get().activeTutorialKey;
    const isRunning = get().runTutorial;
    const currentStoredStepIndex = parseInt(localStorage.getItem(`${tutorialKey}_stepIndex`) || '0', 10);

    if (forceRestart) {
      localStorage.removeItem(`${tutorialKey}_completed`);
      localStorage.removeItem(`${tutorialKey}_stepIndex`);
      console.log(`Tutorial ${tutorialKey} progress reset and (re)starting.`);
      set({
        activeTutorialKey: tutorialKey,
        runTutorial: true,
        currentStepIndex: stepIndex
      });
    } else {
      const isCompleted = localStorage.getItem(`${tutorialKey}_completed`) === 'true';
      if (isCompleted) {
        console.log(`Tutorial ${tutorialKey} already completed. Not starting.`);
        set({ runTutorial: false });
        return;
      }

      if (currentKey !== tutorialKey || !isRunning) {
        console.log(`Starting/resuming tutorial ${tutorialKey} from step ${currentStoredStepIndex > 0 ? currentStoredStepIndex : stepIndex}.`);
        set({
          activeTutorialKey: tutorialKey,
          runTutorial: true,
          currentStepIndex: currentStoredStepIndex > 0 ? currentStoredStepIndex : stepIndex
        });
      } else {
         console.log(`Tutorial ${tutorialKey} is already set to run. Forcing step index to ${stepIndex}.`);
        set({ runTutorial: true, currentStepIndex: stepIndex });
      }
    }
  },
  stopTutorial: () => {
    const tutorialKey = get().activeTutorialKey;
    if (tutorialKey) {
      localStorage.setItem(`${tutorialKey}_completed`, 'true');
      localStorage.removeItem(`${tutorialKey}_stepIndex`);
      console.log(`Tutorial ${tutorialKey} stopped and marked as completed.`);
    }
    set({ runTutorial: false, activeTutorialKey: null, currentStepIndex: 0 });
  },
  setRunTutorialState: (run) => {
    const tutorialKey = get().activeTutorialKey;
    if (!run && tutorialKey) {
      localStorage.setItem(`${tutorialKey}_completed`, 'true');
      localStorage.removeItem(`${tutorialKey}_stepIndex`);
      console.log(`Tutorial ${tutorialKey} run state set to false (completed/skipped).`);
      set({ runTutorial: false, activeTutorialKey: null, currentStepIndex: 0 });
    } else {
      console.log(`Tutorial ${tutorialKey || 'None'} run state set to ${run}.`);
      set({ runTutorial: run });
    }
  },
  setStepIndex: (index: number) => {
    const tutorialKey = get().activeTutorialKey;
    if (tutorialKey && get().runTutorial) {
      localStorage.setItem(`${tutorialKey}_stepIndex`, index.toString());
    }
    set({ currentStepIndex: index });
  },
  resetTutorialProgress: (tutorialKey?: string) => {
    if (tutorialKey) {
      localStorage.removeItem(`${tutorialKey}_completed`);
      localStorage.removeItem(`${tutorialKey}_stepIndex`);
      console.log(`Progress for tutorial ${tutorialKey} reset.`);
      if (get().activeTutorialKey === tutorialKey) {
        set({ runTutorial: false, activeTutorialKey: null, currentStepIndex: 0 });
      }
    } else {
      // Reset all known tutorials
      availableTutorials.forEach(t => {
        localStorage.removeItem(`${t.key}_completed`);
        localStorage.removeItem(`${t.key}_stepIndex`);
      });
      console.log("Progress for all tutorials reset.");
      set({ runTutorial: false, activeTutorialKey: null, currentStepIndex: 0 });
    }
  },
}));

export default useTutorialStore;
