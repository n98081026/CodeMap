import { create } from 'zustand';

interface TutorialStoreState {
  activeTutorialKey: string | null;
  runTutorial: boolean;
  currentStepIndex: number;
  startOrResumeTutorial: (tutorialKey: string, stepIndex?: number, forceRestart?: boolean) => void;
  stopTutorial: () => void;
  setRunTutorialState: (run: boolean) => void;
  setStepIndex: (index: number) => void;
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
      set({
        activeTutorialKey: tutorialKey,
        runTutorial: true,
        currentStepIndex: stepIndex
      });
    } else {
      const isCompleted = localStorage.getItem(`${tutorialKey}_completed`) === 'true';
      if (isCompleted) {
        // If completed and not forced, don't run
        set({ runTutorial: false });
        return;
      }

      if (currentKey !== tutorialKey || !isRunning) {
        // Start new or restart a non-running tutorial (potentially from a saved step)
        set({
          activeTutorialKey: tutorialKey,
          runTutorial: true,
          currentStepIndex: currentStoredStepIndex > 0 ? currentStoredStepIndex : stepIndex
        });
      } else {
        // If same tutorial is already set to run, ensure currentStepIndex is respected
        set({ runTutorial: true, currentStepIndex: stepIndex });
      }
    }
  },
  stopTutorial: () => {
    const tutorialKey = get().activeTutorialKey;
    if (tutorialKey) {
      localStorage.setItem(`${tutorialKey}_completed`, 'true'); // Mark as completed when explicitly stopped
      localStorage.removeItem(`${tutorialKey}_stepIndex`); // Clear step index
    }
    set({ runTutorial: false, activeTutorialKey: null, currentStepIndex: 0 });
  },
  setRunTutorialState: (run) => { // Called by AppTutorial on finish/skip
    const tutorialKey = get().activeTutorialKey;
    if (!run && tutorialKey) { // Tutorial finished or skipped
      localStorage.setItem(`${tutorialKey}_completed`, 'true');
      localStorage.removeItem(`${tutorialKey}_stepIndex`);
      set({ runTutorial: false, activeTutorialKey: null, currentStepIndex: 0 });
    } else {
      set({ runTutorial: run });
    }
  },
  setStepIndex: (index: number) => { // Called by AppTutorial on step change
    const tutorialKey = get().activeTutorialKey;
    if (tutorialKey && get().runTutorial) { // Only save if tutorial is active
      localStorage.setItem(`${tutorialKey}_stepIndex`, index.toString());
    }
    set({ currentStepIndex: index });
  },
}));

export default useTutorialStore;
