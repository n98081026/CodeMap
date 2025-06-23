"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Joyride, { Step as JoyrideStep, CallBackProps, EVENTS, ACTIONS, STATUS } from 'react-joyride';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation'; // Import usePathname

// Define an extended Step type to include pagePath
interface TutorialStep extends JoyrideStep {
  pagePath?: string; // The path where this step should be shown
  isNavigationTrigger?: boolean; // True if clicking "Next" on this step implies user will navigate
}

interface AppTutorialProps {
  // Props to control the tour, e.g., specific tour key to run
  // For now, Flow 1 will auto-start.
}

// Define steps for Flow 1: Project Upload & Initial Map Understanding
// Note: The order matters and corresponds to the user's journey.
const projectUploadFlowSteps: TutorialStep[] = [
  {
    target: '#tutorial-target-new-project-button',
    content: "Welcome to CodeMap! Let's visualize your code. Click here to start a new project analysis.",
    placement: 'bottom',
    title: 'Start a New Project',
    disableBeacon: true,
    pagePath: '/application/student/dashboard', // Or a more generic dashboard path
    isNavigationTrigger: true, // Clicking the target navigates
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
    isNavigationTrigger: true, // Clicking the target submits form and navigates
  },
  {
    target: 'body', // General step, not tied to a specific element
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


const AppTutorial: React.FC<AppTutorialProps> = () => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // The active steps for the tour. For now, it's always projectUploadFlowSteps.
  // Later, this could be determined by a prop or a global state (e.g. Zustand store).
  const activeSteps = projectUploadFlowSteps;
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    // Auto-start Flow 1 if on the first step's page
    if (pathname === activeSteps[0].pagePath && activeSteps.length > 0) {
      console.log("Tutorial: Auto-starting tour on initial page.");
      setStepIndex(0);
      setRun(true);
    } else {
      // If landing on another page that's part of the tour, try to find the correct step.
      const matchingStepIndex = activeSteps.findIndex(step => pathname && step.pagePath && pathname.startsWith(step.pagePath));
      if (matchingStepIndex !== -1) {
        const stepTarget = activeSteps[matchingStepIndex].target;
        if (typeof stepTarget === 'string' && document.querySelector(stepTarget)) {
          console.log(`Tutorial: Attempting to resume tour at step ${matchingStepIndex} on path ${pathname}`);
          setStepIndex(matchingStepIndex);
          setRun(true);
        } else if (typeof stepTarget !== 'string') {
           console.log(`Tutorial: Attempting to resume tour at general step ${matchingStepIndex} on path ${pathname}`);
           setStepIndex(matchingStepIndex);
           setRun(true);
        }
      }
    }
  }, [pathname, activeSteps]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type, step } = data;
    const currentStepConfig = activeSteps[index] as TutorialStep;

    console.log(`Joyride Callback: Type: ${type}, Action: ${action}, Status: ${status}, Index: ${index}, Step Target: ${step.target}`);

    if (type === EVENTS.STEP_AFTER) {
      const nextStepUserWouldTake = index + (action === ACTIONS.PREV ? -1 : 1);
        if (action === ACTIONS.NEXT) {
            if (currentStepConfig?.isNavigationTrigger) {
                console.log(`Tutorial: User clicked Next on a navigation trigger step (${index}). Expecting navigation. Pausing tour.`);
                setRun(false); // Pause the tour, expect navigation to handle restart via useEffect
            }
            setStepIndex(nextStepUserWouldTake);
        } else if (action === ACTIONS.PREV) {
            setStepIndex(nextStepUserWouldTake);
        } else if (action === ACTIONS.CLOSE || action === ACTIONS.RESET) {
             console.log('Tutorial: Tour closed or reset by user.');
             setRun(false);
             setStepIndex(0);
        }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`Tutorial: Target not found for step ${index} ('${step.target}'). Current path: ${pathname}. Expected path: ${currentStepConfig?.pagePath}. Pausing tour.`);
      setRun(false);
    } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log('Tutorial: Tour finished or skipped.');
      setRun(false);
      setStepIndex(0);
      // localStorage.setItem('projectUploadFlowCompleted', 'true');
    } else if (type === EVENTS.TOUR_START) {
      console.log('Tutorial: Tour started.');
    } else if (type === EVENTS.ERROR || status === STATUS.ERROR) {
      console.error('Tutorial: Joyride error: ', data);
      setRun(false);
      setStepIndex(0);
    }
  }, [activeSteps, pathname]);

  useEffect(() => {
    if (!run && stepIndex < activeSteps.length && stepIndex >= 0) {
      const currentStepConfig = activeSteps[stepIndex] as TutorialStep;
      const onCorrectPage = currentStepConfig.pagePath && pathname.startsWith(currentStepConfig.pagePath);

      if (onCorrectPage) {
        const targetElement = typeof currentStepConfig.target === 'string' ? document.querySelector(currentStepConfig.target) : true; // true for body/general steps
        if (targetElement) {
          console.log(`Tutorial: Resuming/Starting tour at step ${stepIndex} ('${currentStepConfig.target}') on path ${pathname}.`);
          // Ensure DOM is updated if target just appeared after navigation
          setTimeout(() => setRun(true), 100);
        } else {
          console.log(`Tutorial: On correct page for step ${stepIndex}, but target '${currentStepConfig.target}' not found yet.`);
        }
      } else {
        console.log(`Tutorial: Not on correct page for step ${stepIndex}. Expected: ${currentStepConfig.pagePath}, Current: ${pathname}`);
      }
    }
  }, [run, stepIndex, activeSteps, pathname]);

  // Dynamically generate styles based on the current theme
  const getJoyrideStyles = (theme: string | undefined) => {
    const isDark = theme === 'dark';
    const cardBg = isDark ? 'hsl(224, 71%, 4%)' : 'hsl(0, 0%, 100%)'; // Approx slate-950 / white
    const cardFg = isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222, 84%, 4.9%)'; // Approx slate-50 / slate-950
    const primary = 'hsl(262.1, 83.3%, 57.8%)'; // Default primary from shadcn (violet)
    const primaryFg = 'hsl(210, 40%, 98%)'; // Text on primary button (slate-50)

    return {
      options: {
        arrowColor: cardBg,
        backgroundColor: cardBg,
        overlayColor: 'rgba(0, 0, 0, 0.75)',
        primaryColor: primary,
        textColor: cardFg,
        zIndex: 10000,
      },
      tooltip: {
        borderRadius: '0.5rem', // rounded-lg
        padding: '1rem',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' // shadow-lg
      },
      tooltipContent: {
        padding: '0.25rem 0', // Add some vertical padding if title is present
      },
      tooltipTitle: {
        fontWeight: 600, // semibold
        fontSize: '1.125rem', // text-lg
        margin: '0 0 0.5rem 0', // mb-2
      },
      buttonClose: {
        color: isDark ? 'hsl(215, 20.2%, 65.1%)' : 'hsl(215, 20.2%, 65.1%)', // slate-400
        height: '2rem',
        width: '2rem',
        fontSize: '1.25rem',
        top: '0.5rem',
        right: '0.5rem',
      },
      buttonNext: {
        backgroundColor: primary,
        borderRadius: '0.375rem', // rounded-md
        color: primaryFg,
        padding: '0.5rem 1rem', // px-4 py-2
        fontSize: '0.875rem', // text-sm
        fontWeight: 500, // medium
      },
      buttonBack: {
        color: primary,
        borderRadius: '0.375rem',
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        border: `1px solid ${primary}`,
        marginRight: '0.5rem',
      },
      buttonSkip: {
        color: isDark ? 'hsl(215, 20.2%, 65.1%)' : 'hsl(215, 20.2%, 65.1%)', // slate-400
        fontSize: '0.875rem',
      },
      floater: {
        tooltip: { filter: 'none' }
      }
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
