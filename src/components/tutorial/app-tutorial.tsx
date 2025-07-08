import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, Step, EVENTS } from 'react-joyride';
import { useTranslation } from 'react-i18next'; // Import useTranslation

import type { LucideIcon } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import useConceptMapStore from '@/stores/concept-map-store';
import useTutorialStore from '@/stores/tutorial-store';

// TutorialMetaData remains the same, but its instances will be constructed using t()
export interface TutorialMetaData {
  key: string;
  title: string; // This will be populated by t()
  description?: string; // This will be populated by t()
  icon?: LucideIcon;
}

// availableTutorials will now be a function that takes t and returns the array,
// or it will be constructed inside the component where t is available.
// For now, we will define it inside the component.

interface AppTutorialProps {
  // Props are not used as state is managed by stores
}

const AppTutorial: React.FC<AppTutorialProps> = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user, loading } = useAuth();
  const [steps, setSteps] = useState<Step[]>([]);

  const {
    activeTutorialKey,
    runTutorial,
    currentStepIndex,
    setRunTutorialState,
    setStepIndex,
  } = useTutorialStore(
    useCallback(
      (s) => ({
        activeTutorialKey: s.activeTutorialKey,
        runTutorial: s.runTutorial,
        currentStepIndex: s.currentStepIndex,
        setRunTutorialState: s.setRunTutorialState,
        setStepIndex: s.setStepIndex,
      }),
      []
    )
  );

  const tutorialTempTargetNodeId = useConceptMapStore(
    (state) => state.tutorialTempTargetNodeId
  );
  const clearTutorialTempTargetNodeId = useConceptMapStore(
    (state) => state.setTutorialTempTargetNodeId
  );
  const tutorialTempTargetEdgeId = useConceptMapStore(
    (state) => state.tutorialTempTargetEdgeId
  );
  const clearTutorialTempTargetEdgeId = useConceptMapStore(
    (state) => state.setTutorialTempTargetEdgeId
  );

  // Construct availableTutorials using t()
  // useMemo is used to prevent re-creating this array on every render unless t changes (language change)
  const availableTutorials = useMemo((): TutorialMetaData[] => [
    {
      key: 'dashboardTutorial',
      title: t('availableTutorials.dashboardTutorial.title'),
      description: t('availableTutorials.dashboardTutorial.description')
    },
    {
      key: 'projectUploadTutorial',
      title: t('availableTutorials.projectUploadTutorial.title'),
      description: t('availableTutorials.projectUploadTutorial.description')
    },
    {
      key: 'editorTutorial',
      title: t('availableTutorials.editorTutorial.title'),
      description: t('availableTutorials.editorTutorial.description')
    },
    {
      key: 'extractConceptsToolTutorial',
      title: t('availableTutorials.extractConceptsToolTutorial.title'),
      description: t('availableTutorials.extractConceptsToolTutorial.description')
    },
    {
      key: 'manualAddNodeTutorial',
      title: t('availableTutorials.manualAddNodeTutorial.title'),
      description: t('availableTutorials.manualAddNodeTutorial.description')
    },
    {
      key: 'manualCreateEdgeTutorial',
      title: t('availableTutorials.manualCreateEdgeTutorial.title'),
      description: t('availableTutorials.manualCreateEdgeTutorial.description')
    },
    {
      key: 'suggestRelationsToolTutorial',
      title: t('availableTutorials.suggestRelationsToolTutorial.title'),
      description: t('availableTutorials.suggestRelationsToolTutorial.description')
    },
    {
      key: 'expandConceptStagingTutorial',
      title: t('availableTutorials.expandConceptStagingTutorial.title'),
      description: t('availableTutorials.expandConceptStagingTutorial.description')
    },
    {
      key: 'ghostPreviewLayoutTutorial',
      title: t('availableTutorials.ghostPreviewLayoutTutorial.title'),
      description: t('availableTutorials.ghostPreviewLayoutTutorial.description')
    },
    {
      key: 'ghostPreviewsUsageTutorial',
      title: t('availableTutorials.ghostPreviewsUsageTutorial.title'),
      description: t('availableTutorials.ghostPreviewsUsageTutorial.description')
    },
    {
      key: 'projectOverviewTutorial',
      title: t('availableTutorials.projectOverviewTutorial.title'),
      description: t('availableTutorials.projectOverviewTutorial.description')
    },
  ], [t]);

  // This export is problematic if `t` is needed at module scope.
  // For now, `availableTutorials` is used internally or passed down from a component that can use the hook.
  // If it needs to be exported, it should be a function `getAvailableTutorials(tFunction)`
  // For the purpose of this component, constructing it with useMemo is fine.


  const getStepsForTutorial = useCallback(
    (
      tutorialKey: string, // Renamed 'key' to 'tutorialKey' to avoid conflict with React key prop
      dynamicNodeId?: string | null,
      dynamicEdgeId?: string | null
    ): Step[] => {
      const commonWelcomeStep: Step = {
        target: 'body',
        content: t('tutorialSteps.common.welcomeContent'),
        placement: 'center',
        title: t('tutorialSteps.common.welcomeTitle'),
        disableBeacon: true,
      };

      const commonNavSteps: Step[] = [
        {
          target: '.sidebar-nav-container',
          content: t('tutorialSteps.common.navBarContent'),
          placement: 'right',
          title: t('tutorialSteps.common.navBarTitle'),
        },
        {
          target: '.main-layout-content-area',
          content: t('tutorialSteps.common.mainContentAreaContent'),
          placement: 'auto',
          title: t('tutorialSteps.common.mainContentAreaTitle'),
        },
        {
          target: '.navbar-user-button',
          content: t('tutorialSteps.common.userMenuContent'),
          placement: 'bottom-end',
          title: t('tutorialSteps.common.userMenuTitle'),
        },
      ];

      // Helper to create steps from an array of key indexes for a given tutorialKey
      // E.g., getSteps('dashboardTutorial', [0, 1])
      const mapStepKeys = (baseKey: string, count: number): Step[] => {
        return Array.from({ length: count }, (_, i) => ({
          target: t(`tutorialSteps.${baseKey}.${i}.target` as const, '') || 'body', // Provide default for target
          content: t(`tutorialSteps.${baseKey}.${i}.content` as const),
          title: t(`tutorialSteps.${baseKey}.${i}.title` as const),
          placement: t(`tutorialSteps.${baseKey}.${i}.placement` as const, 'auto') as Step['placement'],
          disableBeacon: t(`tutorialSteps.${baseKey}.${i}.disableBeacon` as const, undefined as unknown as boolean) || undefined, // Handle boolean
          spotlightClicks: t(`tutorialSteps.${baseKey}.${i}.spotlightClicks` as const, undefined as unknown as boolean) || undefined,
          isOptional: t(`tutorialSteps.${baseKey}.${i}.isOptional` as const, undefined as unknown as boolean) || undefined,
        }));
      };

      // Specific handling for dynamic content in manualAddNodeTutorial step 2
      const getManualAddNodeStep2Content = () => {
        if (dynamicNodeId) {
          // Assuming 'Concept' is the default label if not specified, or make it part of translation
          return t('tutorialSteps.manualAddNodeTutorial.2.content_dynamic', { nodeLabel: 'Concept' });
        }
        return t('tutorialSteps.manualAddNodeTutorial.2.content_static');
      };

      // Specific handling for dynamic content in manualCreateEdgeTutorial step 3
      const getManualCreateEdgeStep3Content = () => {
        if (dynamicEdgeId) {
          return t('tutorialSteps.manualCreateEdgeTutorial.3.content_dynamic');
        }
        return t('tutorialSteps.manualCreateEdgeTutorial.3.content_static');
      };


      if (tutorialKey === 'dashboardTutorial') {
        let roleSpecificSteps: Step[] = [];
        const baseKey = 'tutorialSteps.dashboardTutorial';
        if (user?.role === 'STUDENT') {
          roleSpecificSteps = [
            { target: "a[href='/student/concept-maps']", title: t(`${baseKey}.0.title`), content: t(`${baseKey}.0.content`) },
            { target: "a[href='/student/projects/submit']", title: t(`${baseKey}.1.title`), content: t(`${baseKey}.1.content`) },
          ];
        } else if (user?.role === 'TEACHER') {
          roleSpecificSteps = [
            { target: "a[href='/teacher/classrooms']", title: t(`${baseKey}.2.title`), content: t(`${baseKey}.2.content`) },
          ];
        } else if (user?.role === 'ADMIN') {
          roleSpecificSteps = [
            { target: "a[href='/admin/users']", title: t(`${baseKey}.3.title`), content: t(`${baseKey}.3.content`) },
            { target: "a[href='/admin/settings']", title: t(`${baseKey}.4.title`), content: t(`${baseKey}.4.content`) },
          ];
        }
        return [commonWelcomeStep, ...commonNavSteps, ...roleSpecificSteps];
      } else if (tutorialKey === 'projectUploadTutorial') {
        return mapStepKeys('projectUploadTutorial', 4);
      } else if (tutorialKey === 'editorTutorial') {
        return mapStepKeys('editorTutorial', 7);
      } else if (tutorialKey === 'extractConceptsToolTutorial') {
        return mapStepKeys('extractConceptsToolTutorial', 9);
      } else if (tutorialKey === 'manualAddNodeTutorial') {
        const steps = mapStepKeys('manualAddNodeTutorial', 7);
        // Update step 2 (index 2) for dynamic content and target
        if (steps[2]) { // Check if step exists
          steps[2].content = getManualAddNodeStep2Content();
          steps[2].target = dynamicNodeId ? `[data-id='${dynamicNodeId}']` : '.react-flow__pane';
        }
        return steps;
      } else if (tutorialKey === 'manualCreateEdgeTutorial') {
         const steps = mapStepKeys('manualCreateEdgeTutorial', 7);
        // Update step 3 (index 3) for dynamic content and target
        if (steps[3]) { // Check if step exists
            steps[3].content = getManualCreateEdgeStep3Content();
            steps[3].target = dynamicEdgeId ? `.react-flow__edge[id='${dynamicEdgeId}']` : '.react-flow__pane';
        }
        return steps;
      } else if (tutorialKey === 'suggestRelationsToolTutorial') {
        // Directly define steps for suggestRelationsToolTutorial to ensure correct targets
        const baseKey = 'suggestRelationsToolTutorial';
        const totalSteps = 10; // As specified by mapStepKeys before
        const generatedSteps = mapStepKeys(baseKey, totalSteps);

        // Override targets based on our data-tutorial-id attributes
        // Assuming translation files provide titles, content, placements etc.
        // We are primarily concerned with the 'target' selector here.
        const updatedSteps: Step[] = [
          { // Step 0: Intro (Usually target: 'body' or a general container)
            ...generatedSteps[0],
            target: generatedSteps[0]?.target || 'body', // Keep original or default to body
          },
          { // Step 1: Open AI Menu
            ...generatedSteps[1],
            target: "[data-tutorial-id='editor-toolbar-ai-tools-button']",
          },
          { // Step 2: Choose Suggest Relations Tool
            ...generatedSteps[2],
            target: "[data-tutorial-id='ai-tool-suggest-relations']",
          },
          { // Step 3: Suggest Relations Dialog
            ...generatedSteps[3],
            target: "[data-tutorial-id='suggest-relations-modal']", // Or [role='dialog'][aria-labelledby='suggest-relations-title']
          },
          { // Step 4: (Optional) Provide Additional Context
            ...generatedSteps[4],
            target: "[data-tutorial-id='suggest-relations-custom-prompt-input']",
          },
          { // Step 5: Start Suggesting (Click Modal Submit)
            ...generatedSteps[5],
            target: "[data-tutorial-id='suggest-relations-submit-button']",
          },
          { // Step 6: View Suggested Relations (AI Panel section)
            ...generatedSteps[6],
            target: "[data-tutorial-id='suggested-relations-section']", // Or specific panel toggle button
          },
          { // Step 7: Relations in AI Panel (Focus on one item)
            ...generatedSteps[7],
            // This target will point to the first item.
            // If no items, Joyride might show "target not found" or skip.
            // Good to have fallback content in translation if no items.
            target: "[data-tutorial-id='suggested-relation-item-0']",
          },
          { // Step 8: Review Individual Suggestions (Could be same as above or general to the list)
             ...generatedSteps[8],
             target: "[data-tutorial-id='suggested-relations-section']", // Or a specific part of the list
          },
          { // Step 9: Add Selected Relations
            ...generatedSteps[9],
            target: "[data-tutorial-id='add-selected-relations-button']", // Or 'add-all-new-relations-button' depending on flow
          },
          // Ensure we don't exceed the original number of steps if generatedSteps is shorter
        ];
        return updatedSteps.slice(0, totalSteps);
      } else if (tutorialKey === 'expandConceptStagingTutorial') {
        return mapStepKeys('expandConceptStagingTutorial', 11);
      } else if (tutorialKey === 'ghostPreviewLayoutTutorial') {
        return mapStepKeys('ghostPreviewLayoutTutorial', 5);
      } else if (tutorialKey === 'ghostPreviewsUsageTutorial') {
        return mapStepKeys('ghostPreviewsUsageTutorial', 8);
      } else if (tutorialKey === 'projectOverviewTutorial') {
        return mapStepKeys('projectOverviewTutorial', 5);
      }

      return []; // Default to no steps
    },
    [user, t] // Added t to dependency array
  );

  useEffect(() => {
    if (user && !loading && activeTutorialKey) {
      const tutorialHasBeenSeen =
        localStorage.getItem(activeTutorialKey) === 'true';
      const newSteps = getStepsForTutorial(
        activeTutorialKey,
        tutorialTempTargetNodeId,
        tutorialTempTargetEdgeId
      );

      if (runTutorial) {
        if (
          !tutorialHasBeenSeen ||
          steps.length === 0 ||
          (activeTutorialKey === 'manualAddNodeTutorial' &&
            tutorialTempTargetNodeId) ||
          (activeTutorialKey === 'manualCreateEdgeTutorial' &&
            tutorialTempTargetEdgeId)
        ) {
          setSteps(newSteps);
        }
      } else {
        if (steps.length > 0) setSteps([]);
      }
    } else if ((!user && !loading) || !activeTutorialKey) {
      if (runTutorial) setRunTutorialState(false);
      if (steps.length > 0) setSteps([]);
    }
  }, [
    user,
    loading,
    runTutorial,
    activeTutorialKey,
    setRunTutorialState,
    tutorialTempTargetNodeId,
    tutorialTempTargetEdgeId,
    getStepsForTutorial, // getStepsForTutorial will change if 't' or 'user' changes
    steps.length,
  ]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, lifecycle, index, action, step } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (
      ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND] as string[]).includes(type)
    ) {
      setStepIndex(index + (action === 'prev' ? -1 : 1));
    }

    if (
      finishedStatuses.includes(status) ||
      (type === EVENTS.TOOLTIP_CLOSE && action === 'close')
    ) {
      setRunTutorialState(false);
      if (activeTutorialKey === 'manualAddNodeTutorial') {
        clearTutorialTempTargetNodeId(null);
      }
      if (activeTutorialKey === 'manualCreateEdgeTutorial') {
        clearTutorialTempTargetEdgeId(null);
      }
    } else if (
      type === EVENTS.STEP_AFTER &&
      activeTutorialKey === 'manualAddNodeTutorial' &&
      step.title === t('tutorialSteps.manualAddNodeTutorial.2.title') // Compare with translated title
    ) {
      // Logic for specific step handling if needed
    } else if (
      type === EVENTS.STEP_AFTER &&
      activeTutorialKey === 'manualCreateEdgeTutorial' &&
      step.title === t('tutorialSteps.manualCreateEdgeTutorial.3.title') // Compare with translated title
    ) {
      // Logic for specific step handling if needed
    }
  };

  // Memoize joyrideLocale to prevent re-renders if t function hasn't changed
  const joyrideLocale = useMemo(() => ({
    back: t('joyride.back'),
    close: t('joyride.close'),
    last: t('joyride.last'),
    next: t('joyride.next'),
    skip: t('joyride.skip'),
  }), [t]);

  if (
    loading ||
    !user ||
    steps.length === 0 ||
    !runTutorial ||
    !activeTutorialKey
  ) {
    return null;
  }

  // Export availableTutorials constructed with t, if needed by other components.
  // This is slightly unconventional as it's instance-specific due to the hook.
  // A better pattern for external use might be a dedicated context or selector.
  // For now, if another component needs this, it should also use useTranslation.
  // AppTutorial.availableTutorials = availableTutorials; // This line is problematic for static export

  return (
    <Joyride
      steps={steps}
      run={runTutorial}
      stepIndex={currentStepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={joyrideLocale} // Use memoized locale
      styles={{
        options: {
          zIndex: 10000,
          arrowColor: 'hsl(var(--card-values))',
          backgroundColor: 'hsl(var(--card-values))',
          primaryColor: 'hsl(var(--primary-values))',
          textColor: 'hsl(var(--card-foreground-values))',
          overlayColor: `hsla(var(--background-values), 0.7)`,
        },
        tooltip: {
          borderRadius: 'var(--radius)',
          padding: '1rem',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid hsl(var(--border-values))',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          margin: 0,
          fontSize: '1.125rem',
          fontWeight: '600',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid hsl(var(--border-values))',
          marginBottom: '0.75rem',
        },
        tooltipContent: {
          fontSize: '0.875rem',
          lineHeight: '1.4',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary-values))',
          color: 'hsl(var(--primary-foreground-values))',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          textTransform: 'none',
        },
        buttonBack: {
          backgroundColor: 'hsl(var(--secondary-values))',
          color: 'hsl(var(--secondary-foreground-values))',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          marginRight: '0.5rem',
          textTransform: 'none',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground-values))',
          fontSize: '0.8rem',
          textTransform: 'none',
        },
        buttonClose: {
          top: '10px',
          right: '10px',
          height: '1rem',
          width: '1rem',
          color: 'hsl(var(--muted-foreground-values))',
        },
        beacon: {
          outlineColor: 'hsl(var(--primary-values))',
          backgroundColor: 'hsl(var(--primary-values))',
        },
        overlay: {
          // already handled by overlayColor in options
        },
        spotlight: {
          borderRadius: 'var(--radius-sm)',
        },
      }}
      // debug
    />
  );
};

// If `availableTutorials` needs to be exported and is dependent on `t`,
// it should be exported as a function that accepts `t`.
// export const getTranslatedAvailableTutorials = (t: TFunction): TutorialMetaData[] => { ... }
// However, since AppTutorial is the main consumer and it now constructs it internally,
// this static export is removed.
// export { availableTutorials }; // Remove this static export

export default AppTutorial;
