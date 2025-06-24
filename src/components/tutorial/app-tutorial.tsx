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
    isNavigationTrigger: false, // Explicitly false or remove: user right-clicks, Joyride doesn't trigger this.
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
    target: '.react-flow__node.is-ghost-node:first-of-type', // Updated selector
    content: "See those new 'ghost' nodes? The AI has suggested related concepts. Click on a ghost node to accept it, or use the controls that appear when you hover over the original node to accept all or cancel.",
    placement: 'bottom',
    title: 'Review AI Suggestions',
    pagePath: '/application/concept-maps/editor',
  },
];

const AppTutorial: React.FC<AppTutorialProps> = () => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // TEMPORARILY SET TO EXPAND_CONCEPT_FLOW_STEPS FOR DEVELOPMENT
  // In a real app, this would be managed by a global state or prop
  const activeSteps = expandConceptFlowSteps;
  // const activeSteps = projectUploadFlowSteps;

  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (activeSteps.length > 0 && pathname.startsWith(activeSteps[0].pagePath!)) {
      console.log(`Tutorial: Auto-starting active tour '${activeSteps[0].title}' on initial page: ${pathname}`);
      setStepIndex(0);
      setRun(true);
    } else if (activeSteps.length > 0) {
      const matchingStepIndex = activeSteps.findIndex(step => step.pagePath && pathname.startsWith(step.pagePath));
      if (matchingStepIndex !== -1) {
        const stepTarget = activeSteps[matchingStepIndex].target;
        if (typeof stepTarget === 'string' && document.querySelector(stepTarget)) {
          console.log(`Tutorial: Attempting to resume active tour at step ${matchingStepIndex} on path ${pathname}`);
          setStepIndex(matchingStepIndex);
          setRun(true);
        } else if (typeof stepTarget !== 'string') {
           console.log(`Tutorial: Attempting to resume active tour at general step ${matchingStepIndex} on path ${pathname}`);
           setStepIndex(matchingStepIndex);
           setRun(true);
        }
      }
    }
  }, [pathname, activeSteps]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type, step } = data;
    if (!activeSteps || index < 0 || index >= activeSteps.length) {
        console.warn(`Tutorial: Invalid step index ${index} or activeSteps not ready.`);
        if (status === STATUS.ERROR || status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRun(false); setStepIndex(0);
        }
        return;
    }
    const currentStepConfig = activeSteps[index] as TutorialStep;

    console.log(`Tutorial Callback: Type: ${type}, Action: ${action}, Status: ${status}, Index: ${index}, Step Target: ${step.target}`);

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
            }
        } else if (action === ACTIONS.CLOSE || action === ACTIONS.RESET) {
             console.log('Tutorial: Tour closed or reset by user.');
             setRun(false); setStepIndex(0);
        }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`Tutorial: Target not found for step ${index} ('${step.target}'). Current path: ${pathname}. Expected path: ${currentStepConfig?.pagePath}. Pausing tour.`);
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
  }, [activeSteps, pathname]);

  useEffect(() => {
    if (!run && activeSteps.length > 0 && stepIndex < activeSteps.length && stepIndex >= 0) {
      const currentStepConfig = activeSteps[stepIndex] as TutorialStep;
      const onCorrectPage = currentStepConfig.pagePath && pathname.startsWith(currentStepConfig.pagePath);

      if (onCorrectPage) {
        const targetElement = typeof currentStepConfig.target === 'string' ? document.querySelector(currentStepConfig.target) : true;
        if (targetElement) {
          console.log(`Tutorial: Resuming/Starting active tour at step ${stepIndex} ('${currentStepConfig.target}') on path ${pathname}.`);
          setTimeout(() => setRun(true), 150); // Increased timeout slightly for dynamic targets
        } else {
          console.log(`Tutorial: On correct page for step ${stepIndex} of active tour, but target '${currentStepConfig.target}' not found yet.`);
        }
      } else {
        console.log(`Tutorial: Not on correct page for step ${stepIndex} of active tour. Expected: ${currentStepConfig.pagePath}, Current: ${pathname}`);
      }
    }
  }, [run, stepIndex, activeSteps, pathname]);

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
