"use client";

import React, { useEffect, useCallback } from 'react'; // Removed useState as it's now from store
import Joyride, { Step as JoyrideStep, CallBackProps, EVENTS, ACTIONS, STATUS } from 'react-joyride';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import useTutorialStore, { type TutorialStep } from '@/stores/tutorial-store'; // Import the store and TutorialStep type

// Define tutorial flows (could also be imported from a separate definitions file)
const projectUploadFlowSteps: TutorialStep[] = [
  {
    target: '#tutorial-target-new-project-button',
    content: "Welcome to CodeMap! Let's visualize your code. Click here to start a new project analysis.",
    placement: 'bottom',
    title: 'Start a New Project',
    disableBeacon: true,
    pagePath: '/application/student/dashboard',
    isNavigationTrigger: true,
  },
  {
    target: '#tutorial-target-project-file-input',
    content: 'Select your project files (e.g., a .zip archive or a single source file).',
    placement: 'right',
    title: 'Upload Your Project',
    pagePath: '/application/student/projects/submit',
  },
  {
    target: '#tutorial-target-user-goals-input',
    content: 'Optionally, tell us your main goals for analyzing this project. This helps the AI create a more relevant map.',
    placement: 'right',
    title: 'Define Your Goals (Optional)',
    pagePath: '/application/student/projects/submit',
  },
  {
    target: '#tutorial-target-start-analysis-button',
    content: 'Once you\'ve selected your file and (optionally) set your goals, click here to begin the analysis.',
    placement: 'bottom',
    title: 'Start Analysis',
    pagePath: '/application/student/projects/submit',
    isNavigationTrigger: true,
  },
  {
    target: 'body',
    content: "Great! CodeMap is now analyzing your project. This might take a moment. The map will appear here once ready.",
    placement: 'center',
    title: 'Processing Your Project',
    pagePath: '/application/concept-maps/editor',
    isModalTrigger: true, // Special handling: this step waits for navigation AND content loading
  },
  {
    target: '#tutorial-target-map-canvas-wrapper',
    content: "Here's your initial concept map! Nodes (boxes) represent parts of your code or concepts, and edges (lines) show their relationships.",
    placement: 'top',
    title: 'Your Concept Map',
    pagePath: '/application/concept-maps/editor',
  },
  {
    target: '.react-flow__node:first-of-type',
    content: 'This is a node. It could be a file, a function, or a class. Click on it to see more details in the Properties Inspector.',
    placement: 'right',
    title: 'Understanding Nodes',
    pagePath: '/application/concept-maps/editor',
  },
];

const expandConceptFlowSteps: TutorialStep[] = [
  {
    target: '.react-flow__node:first-of-type',
    content: "Let's explore your map further with AI. Right-click this node to open the context menu, then find and select 'Expand Concept'.",
    placement: 'right',
    title: 'AI Tool: Expand Concept',
    disableBeacon: true,
    pagePath: '/application/concept-maps/editor',
    isModalTrigger: true, // User needs to open context menu, then modal
  },
  {
    target: '#tutorial-target-expand-concept-modal',
    content: "You can add details or guiding questions here to help the AI generate more relevant ideas. Or, just click 'Expand' for general suggestions.",
    placement: 'bottom',
    title: 'Refine Expansion (Optional)',
    pagePath: '/application/concept-maps/editor',
  },
  {
    target: '#tutorial-target-expand-concept-confirm-button',
    content: "Click here to let the AI generate new ideas related to your selected node.",
    placement: 'bottom',
    title: 'Generate Ideas',
    pagePath: '/application/concept-maps/editor',
    isNavigationTrigger: true, // This closes modal & triggers AI, results appear on canvas
  },
  {
    target: '.react-flow__node.is-ghost-node:first-of-type',
    content: "See those new 'ghost' nodes? The AI has suggested related concepts. Click on a ghost node to accept it, or use the controls that appear when you hover over the original node to accept all or cancel.",
    placement: 'bottom',
    title: 'Review AI Suggestions',
    pagePath: '/application/concept-maps/editor',
  },
];

const mapNavigationFlowSteps: TutorialStep[] = [
  {
    target: '#tutorial-target-map-canvas-wrapper',
    content: "You can pan the map by clicking and dragging on an empty area of the canvas. Use your scroll wheel to zoom in and out.",
    placement: 'center',
    title: 'Navigating the Map',
    disableBeacon: true,
    pagePath: '/application/concept-maps/editor',
  },
  {
    target: '.react-flow__node:first-of-type',
    content: "Click on any node (like this one) to select it. This will also show available actions for the node.",
    placement: 'right',
    title: 'Selecting Elements',
    pagePath: '/application/concept-maps/editor',
    isModalTrigger: true, // User needs to select a node, then properties inspector might show up
  },
  {
    target: '#tutorial-target-toggle-properties-button',
    content: "When a node or edge is selected, its details appear in the 'Properties Inspector'. Click this button to open it if it's not already visible.",
    placement: 'bottom',
    title: 'Open Properties Inspector',
    pagePath: '/application/concept-maps/editor',
    isModalTrigger: true, // User might need to click this to open the panel
  },
  {
    target: '#nodeLabel',
    content: "Here in the Properties Inspector, you can see and change the node's label (its main text).",
    placement: 'left',
    title: 'Node Label',
    pagePath: '/application/concept-maps/editor',
  },
  {
    target: '#nodeDetails',
    content: "And here you can view or edit more detailed information or descriptions about the selected node.",
    placement: 'left',
    title: 'Node Details',
    pagePath: '/application/concept-maps/editor',
  },
  {
    target: 'body',
    content: "Great! You've learned the basics of navigating the map and inspecting elements. Feel free to explore other properties and AI tools. This concludes our basic tour.",
    placement: 'center',
    title: 'Tour Complete!',
    pagePath: '/application/concept-maps/editor',
  },
];

interface AppTutorialProps {}

const AppTutorial: React.FC<AppTutorialProps> = () => {
  const {
    activeTutorialKey,
    currentStepIndex,
    isTutorialRunning,
    allTutorialFlows,
    isWaitingForNextStepTarget,
    initializeTutorials,
    startOrResumeTutorial,
    stopTutorial,
    nextStep,
    prevStep,
    setTutorialStep,
    setIsWaitingForNextStepTarget
  } = useTutorialStore();

  const activeSteps = activeTutorialKey ? allTutorialFlows[activeTutorialKey] : [];

  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  // Initialize tutorial definitions in the store once
  useEffect(() => {
    initializeTutorials({
      projectUpload: projectUploadFlowSteps,
      expandConcept: expandConceptFlowSteps,
      mapNavigation: mapNavigationFlowSteps,
      // Add other flows here
    });
    // Attempt to auto-start the main onboarding tutorial if not completed
    // This will be refined in the "Tutorial Triggering Logic" step
    // For now, let's try to start 'projectUpload' if no other tutorial is active and it's not completed.
    // This effect now depends on isHydrated from the store.
  }, [initializeTutorials]);

  // Auto-start logic, runs after hydration and if no tutorial is already active
  useEffect(() => {
    if (isHydrated && !activeTutorialKey && !completedTutorials.includes('projectUpload')) {
      if (projectUploadFlowSteps.length > 0 && projectUploadFlowSteps[0].pagePath && pathname.startsWith(projectUploadFlowSteps[0].pagePath)) {
        console.log("Tutorial: Auto-triggering 'projectUpload' flow.");
        startOrResumeTutorial('projectUpload');
      }
    }
  }, [isHydrated, activeTutorialKey, completedTutorials, pathname, startOrResumeTutorial]);


  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type, step } = data;

    if (!activeSteps || activeSteps.length === 0 || !activeTutorialKey) {
        if (status === STATUS.ERROR || status === STATUS.FINISHED || status === STATUS.SKIPPED) {
             stopTutorial();
        }
        return;
    }
    const currentStepConfig = activeSteps[currentStepIndex] as TutorialStep; // Use store's index

    console.log(`Tutorial Callback: Type: ${type}, Action: ${action}, Status: ${status}, Index: ${index} (Joyride), StoreIndex: ${currentStepIndex}, Step Target: ${step?.target}`);

    if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.NEXT) {
            nextStep(); // Let the store handle logic for advancing
        } else if (action === ACTIONS.PREV) {
            prevStep(); // Let the store handle logic for going back
        } else if (action === ACTIONS.CLOSE || action === ACTIONS.RESET) {
             console.log('Tutorial: Tour closed or reset by user.');
             stopTutorial();
        }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`Tutorial: Target not found for step ${currentStepIndex} ('${step?.target}'). Current path: ${pathname}. Expected path: ${currentStepConfig?.pagePath}. Pausing tour.`);
      setIsWaitingForNextStepTarget(true); // Inform store we are waiting
      useTutorialStore.setState({ isTutorialRunning: false }); // Directly pause Joyride via its 'run' prop
    } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log(`Tutorial: Tour '${activeTutorialKey}' finished or skipped.`);
      stopTutorial(status === STATUS.FINISHED); // Mark as complete if finished
    } else if (type === EVENTS.TOUR_START) {
      console.log('Tutorial: Tour started.');
      setIsWaitingForNextStepTarget(false);
    } else if (type === EVENTS.ERROR || status === STATUS.ERROR) {
      console.error('Tutorial: Joyride error: ', data);
      stopTutorial();
    }
  }, [activeSteps, activeTutorialKey, currentStepIndex, pathname, nextStep, prevStep, stopTutorial, setIsWaitingForNextStepTarget]);

  // Effect to resume tour when target becomes available or page changes
  useEffect(() => {
    if (isWaitingForNextStepTarget && activeSteps.length > 0 && currentStepIndex < activeSteps.length) {
      const currentStepConfig = activeSteps[currentStepIndex] as TutorialStep;
      const onCorrectPage = currentStepConfig.pagePath && pathname.startsWith(currentStepConfig.pagePath);

      if (onCorrectPage) {
        const targetElement = typeof currentStepConfig.target === 'string' ? document.querySelector(currentStepConfig.target) : true;
        if (targetElement) {
          console.log(`Tutorial: Target for step ${currentStepIndex} ('${currentStepConfig.target}') found on path ${pathname}. Resuming.`);
          setIsWaitingForNextStepTarget(false);
          useTutorialStore.setState({ isTutorialRunning: true }); // Resume Joyride
        } else {
          console.log(`Tutorial: Waiting. On correct page for step ${currentStepIndex}, but target '${currentStepConfig.target}' not found yet.`);
        }
      } else {
         console.log(`Tutorial: Waiting. Not on correct page for step ${currentStepIndex}. Expected: ${currentStepConfig.pagePath}, Current: ${pathname}`);
      }
    } else if (!isTutorialRunning && activeTutorialKey && activeSteps.length > 0 && currentStepIndex < activeSteps.length) {
        // This handles initial start on a specific page if conditions were met by startOrResumeTutorial
        const currentStepConfig = activeSteps[currentStepIndex] as TutorialStep;
        const onCorrectPage = currentStepConfig.pagePath && pathname.startsWith(currentStepConfig.pagePath);
        if (onCorrectPage) {
             const targetElement = typeof currentStepConfig.target === 'string' ? document.querySelector(currentStepConfig.target) : true;
             if (targetElement) {
                 console.log(`Tutorial: Initializing run for step ${currentStepIndex} on ${pathname}`);
                 useTutorialStore.setState({ isTutorialRunning: true });
             }
        }
    }
  }, [pathname, currentStepIndex, activeSteps, isWaitingForNextStepTarget, isTutorialRunning, activeTutorialKey, setIsWaitingForNextStepTarget]);

  const getJoyrideStyles = (theme: string | undefined) => {
    const isDark = theme === 'dark';
    const cardBg = isDark ? 'hsl(224, 71%, 4%)' : 'hsl(0, 0%, 100%)';
    const cardFg = isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222, 84%, 4.9%)';
    const primary = 'hsl(262.1, 83.3%, 57.8%)';
    const primaryFg = 'hsl(210, 40%, 98%)';

    return {
      options: {
        arrowColor: cardBg, backgroundColor: cardBg, overlayColor: 'rgba(0, 0, 0, 0.75)',
        primaryColor: primary, textColor: cardFg, zIndex: 10000,
      },
      tooltip: { borderRadius: '0.5rem', padding: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' },
      tooltipContent: { padding: '0.25rem 0' },
      tooltipTitle: { fontWeight: 600, fontSize: '1.125rem', margin: '0 0 0.5rem 0' },
      buttonClose: { color: isDark ? 'hsl(215, 20.2%, 65.1%)' : 'hsl(215, 20.2%, 65.1%)', height: '2rem', width: '2rem', fontSize: '1.25rem', top: '0.5rem', right: '0.5rem' },
      buttonNext: { backgroundColor: primary, borderRadius: '0.375rem', color: primaryFg, padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500 },
      buttonBack: { color: primary, borderRadius: '0.375rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, border: `1px solid ${primary}`, marginRight: '0.5rem' },
      buttonSkip: { color: isDark ? 'hsl(215, 20.2%, 65.1%)' : 'hsl(215, 20.2%, 65.1%)', fontSize: '0.875rem' },
      floater: { tooltip: { filter: 'none' } }
    };
  };

  const joyrideStyles = getJoyrideStyles(resolvedTheme);

  if (!activeSteps || activeSteps.length === 0 || !isTutorialRunning) {
    return null;
  }

  return (
    <Joyride
      steps={activeSteps}
      run={isTutorialRunning}
      stepIndex={currentStepIndex}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      scrollToFirstStep={true}
      disableScrollParentFix={true}
      styles={joyrideStyles}
      callback={handleJoyrideCallback}
      // debug
    />
  );
};

export default AppTutorial;
