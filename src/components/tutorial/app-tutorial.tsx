"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Joyride, { Step as JoyrideStep, CallBackProps, EVENTS, ACTIONS, STATUS } from 'react-joyride';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';

interface TutorialStep extends JoyrideStep {
  pagePath?: string;
  isNavigationTrigger?: boolean;
}

interface AppTutorialProps {}

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
    isNavigationTrigger: false,
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
    isNavigationTrigger: true,
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
    // isNavigationTrigger: true, // User clicks node, then "Next" on tooltip.
  },
  {
    target: '#tutorial-target-toggle-properties-button', // Placeholder - NEEDS ID IN EditorToolbar.tsx
    content: "When a node or edge is selected, its details appear in the 'Properties Inspector'. Click this button to open it if it's not already visible.",
    placement: 'bottom',
    title: 'Open Properties Inspector',
    pagePath: '/application/concept-maps/editor',
    // isNavigationTrigger: true, // User clicks button, then "Next"
  },
  {
    target: '#nodeLabel', // Assumes PropertiesInspector is open and a node is selected
    content: "Here in the Properties Inspector, you can see and change the node's label (its main text).",
    placement: 'left',
    title: 'Node Label',
    pagePath: '/application/concept-maps/editor',
  },
  {
    target: '#nodeDetails', // Assumes PropertiesInspector is open and a node is selected
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

const AppTutorial: React.FC<AppTutorialProps> = () => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // TEMPORARILY SET TO MAP_NAVIGATION_FLOW_STEPS FOR DEVELOPMENT
  const activeSteps = mapNavigationFlowSteps;
  // const activeSteps = expandConceptFlowSteps;
  // const activeSteps = projectUploadFlowSteps;

  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    // This effect tries to start or resume the tour when the pathname or activeSteps change.
    // It specifically checks if the current page matches the expected page for the *current stepIndex*.
    if (activeSteps.length > 0 && stepIndex < activeSteps.length && stepIndex >= 0) {
        const currentStepConfig = activeSteps[stepIndex];
        const onCorrectPageForCurrentStep = currentStepConfig.pagePath && pathname.startsWith(currentStepConfig.pagePath);

        if (onCorrectPageForCurrentStep) {
            if (!run) { // Only attempt to start/resume if not already running
                const targetElement = typeof currentStepConfig.target === 'string' ? document.querySelector(currentStepConfig.target) : true;
                if (targetElement) {
                    console.log(`Tutorial: Attempting to start/resume active tour at step ${stepIndex} ('${currentStepConfig.target}') on path ${pathname}.`);
                    setTimeout(() => setRun(true), 150);
                } else {
                    console.log(`Tutorial: On correct page for step ${stepIndex}, but target '${currentStepConfig.target}' not found yet.`);
                }
            }
        } else if (run) { // If running but on wrong page for current step, pause.
             console.log(`Tutorial: Pausing tour. Not on correct page for step ${stepIndex}. Expected: ${currentStepConfig.pagePath}, Current: ${pathname}`);
             setRun(false);
        }
    } else if (run) { // If stepIndex is out of bounds but tour is running, stop it.
        console.log("Tutorial: stepIndex out of bounds or no activeSteps, stopping tour.");
        setRun(false);
        setStepIndex(0);
    }
  }, [pathname, activeSteps, stepIndex, run]);


  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type, step } = data;
    if (!activeSteps || activeSteps.length === 0) return; // Guard against no steps

    // Use a local variable for the current step config if valid
    const currentStepConfig = (index >= 0 && index < activeSteps.length) ? activeSteps[index] as TutorialStep : null;

    console.log(`Tutorial Callback: Type: ${type}, Action: ${action}, Status: ${status}, Index: ${index}, Step Target: ${step?.target}`);

    if (type === EVENTS.STEP_AFTER) {
      const nextStepUserWouldTake = index + (action === ACTIONS.PREV ? -1 : 1);
        if (action === ACTIONS.NEXT) {
            if (currentStepConfig?.isNavigationTrigger) {
                console.log(`Tutorial: User clicked Next on a navigation/action trigger step (${index}). Expecting action to resolve. Pausing tour.`);
                setRun(false);
            }
            if (nextStepUserWouldTake >= 0 && nextStepUserWouldTake < activeSteps.length) {
                setStepIndex(nextStepUserWouldTake);
            } else if (nextStepUserWouldTake >= activeSteps.length) {
                console.log('Tutorial: Reached end of current flow via NEXT.');
                setRun(false); setStepIndex(0);
            }
        } else if (action === ACTIONS.PREV) {
             if (nextStepUserWouldTake >= 0) {
                setStepIndex(nextStepUserWouldTake);
            } else {
                // Optionally handle trying to go "back" from the first step
                console.log("Tutorial: At the first step, cannot go back further.");
            }
        } else if (action === ACTIONS.CLOSE || action === ACTIONS.RESET) {
             console.log('Tutorial: Tour closed or reset by user.');
             setRun(false); setStepIndex(0);
        }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`Tutorial: Target not found for step ${index} ('${step?.target}'). Current path: ${pathname}. Expected path: ${currentStepConfig?.pagePath}. Pausing tour.`);
      setRun(false);
    } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log('Tutorial: Tour finished or skipped.');
      setRun(false); setStepIndex(0);
      // localStorage.setItem('someTutorialFlowCompleted', 'true');
    } else if (type === EVENTS.TOUR_START) {
      console.log('Tutorial: Tour started.');
    } else if (type === EVENTS.ERROR || status === STATUS.ERROR) {
      console.error('Tutorial: Joyride error: ', data);
      setRun(false); setStepIndex(0);
    }
  }, [activeSteps, pathname]); // Removed stepIndex from deps of callback as it's managed by setStepIndex

  // This useEffect handles the initial start of the tour when the component mounts
  // and the user is on the page of the first step of the active tutorial.
  useEffect(() => {
    if (activeSteps.length > 0 && pathname.startsWith(activeSteps[0].pagePath!) && stepIndex === 0 && !run ) {
        const firstStepTarget = activeSteps[0].target;
        if (typeof firstStepTarget === 'string' && document.querySelector(firstStepTarget) || typeof firstStepTarget !== 'string') {
            console.log(`Tutorial: Initializing and starting active tour '${activeSteps[0].title}' on page: ${pathname}.`);
            setTimeout(() => setRun(true), 200); // Delay to ensure page is settled
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, activeSteps]); // Only run when pathname or activeSteps definition changes for initial load

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

  if (!activeSteps || activeSteps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={activeSteps}
      run={run}
      stepIndex={stepIndex}
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
