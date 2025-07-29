import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import Joyride, { CallBackProps, STATUS, Step, EVENTS } from 'react-joyride';

// TutorialMetaData remains the same, but its instances will be constructed using t()
export interface TutorialMetaData {
  key: string;
  title: string; // This will be populated by t()
  description?: string; // This will be populated by t()
  icon?: LucideIcon;
}

import { getCommonTutorialSteps } from './flows/common-tutorial-steps';
import { getDashboardTutorialSteps } from './flows/dashboard-tutorial-steps';
import { getEditorTutorialSteps } from './flows/editor-tutorial-steps';
import { getExpandConceptStagingTutorialSteps } from './flows/expand-concept-staging-tutorial-steps';
import { getExtractConceptsToolTutorialSteps } from './flows/extract-concepts-tool-tutorial-steps';
import { getGhostPreviewLayoutTutorialSteps } from './flows/ghost-preview-layout-tutorial-steps';
import { getGhostPreviewsUsageTutorialSteps } from './flows/ghost-previews-usage-tutorial-steps';
import { getManualAddNodeTutorialSteps } from './flows/manual-add-node-tutorial-steps';
import { getManualCreateEdgeTutorialSteps } from './flows/manual-create-edge-tutorial-steps';
import { getProjectOverviewTutorialSteps } from './flows/project-overview-tutorial-steps';
import { getProjectUploadTutorialSteps } from './flows/project-upload-tutorial-steps';
import { getSuggestRelationsToolTutorialSteps } from './flows/suggest-relations-tool-tutorial-steps';

import type { LucideIcon } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useConceptMapStore } from '@/stores/concept-map-store';
import useTutorialStore from '@/stores/tutorial-store';

// TutorialMetaData remains the same
export interface TutorialMetaData {
  key: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
}

// This will be a static list of keys, titles and descriptions will be fetched via i18n in Navbar
export const TUTORIAL_KEYS = [
  'dashboardTutorial',
  'projectUploadTutorial',
  'editorTutorial',
  'extractConceptsToolTutorial',
  'manualAddNodeTutorial',
  'manualCreateEdgeTutorial',
  'suggestRelationsToolTutorial',
  'expandConceptStagingTutorial',
  'ghostPreviewLayoutTutorial', // This might be deprecated or merged
  'ghostPreviewsUsageTutorial',
  'projectOverviewTutorial',
];

// Function to get metadata, to be used in Navbar
export const getAvailableTutorials = (t: any): TutorialMetaData[] =>
  TUTORIAL_KEYS.map((key) => ({
    key,
    title: t(`availableTutorials.${key}.title`),
    description: t(`availableTutorials.${key}.description`),
    // Icon can be mapped here if needed, or handled in Navbar directly
  }));

interface AppTutorialProps {}

const AppTutorial: React.FC<AppTutorialProps> = () => {
  const { t } = useTranslation();
  const { user, isLoading: loading } = useAuth();
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

  const getStepsForTutorial = useCallback(
    (
      tutorialKey: string,
      dynamicNodeId?: string | null,
      dynamicEdgeId?: string | null
    ): Step[] => {
      const { commonWelcomeStep, commonNavSteps } = getCommonTutorialSteps(t);

      switch (tutorialKey) {
        case 'dashboardTutorial':
          return getDashboardTutorialSteps(
            t,
            user,
            commonWelcomeStep,
            commonNavSteps
          );
        case 'projectUploadTutorial':
          return getProjectUploadTutorialSteps(t);
        case 'editorTutorial':
          return getEditorTutorialSteps(t);
        case 'extractConceptsToolTutorial':
          return getExtractConceptsToolTutorialSteps(t);
        case 'manualAddNodeTutorial':
          return getManualAddNodeTutorialSteps(t, dynamicNodeId);
        case 'manualCreateEdgeTutorial':
          return getManualCreateEdgeTutorialSteps(t, dynamicEdgeId);
        case 'suggestRelationsToolTutorial':
          return getSuggestRelationsToolTutorialSteps(t);
        case 'expandConceptStagingTutorial':
          return getExpandConceptStagingTutorialSteps(t);
        case 'ghostPreviewLayoutTutorial':
          return getGhostPreviewLayoutTutorialSteps(t);
        case 'ghostPreviewsUsageTutorial':
          return getGhostPreviewsUsageTutorialSteps(t);
        case 'projectOverviewTutorial':
          return getProjectOverviewTutorialSteps(t);
        default:
          return [];
      }
    },
    [user, t]
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
      (type === EVENTS.TOOLTIP && action === 'close')
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
  const joyrideLocale = useMemo(
    () => ({
      back: t('joyride.back'),
      close: t('joyride.close'),
      last: t('joyride.last'),
      next: t('joyride.next'),
      skip: t('joyride.skip'),
    }),
    [t]
  );

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
          arrowColor: 'hsl(var(--popover-values))',
          backgroundColor: 'hsl(var(--popover-values))',
          primaryColor: 'hsl(var(--primary-values))',
          textColor: 'hsl(var(--popover-foreground-values))',
          overlayColor: 'hsla(var(--background-values), 0.85)',
        },
        tooltip: {
          borderRadius: 'var(--radius-lg)',
          padding: '1rem', // Maintained padding
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid hsl(var(--border-values))',
          maxWidth: 'calc(100vw - 32px)', // Ensure tooltip does not exceed viewport width minus some margin
          width: 'auto', // Allow shrinking
          boxSizing: 'border-box',
        },
        tooltipContainer: {
          textAlign: 'left',
          // Joyride might handle internal scrolling if content overflows the tooltip's height.
          // We ensure the tooltip itself doesn't get too wide.
        },
        tooltipTitle: {
          margin: 0,
          fontSize: '1.15rem', // Slightly reduced from 1.25rem for smaller screens
          fontWeight: '600',
          paddingBottom: '0.6rem', // Adjusted padding
          borderBottom: '1px solid hsl(var(--border-values))',
          marginBottom: '0.85rem', // Adjusted margin
        },
        tooltipContent: {
          fontSize: '0.875rem', // Slightly reduced from 0.9rem
          lineHeight: '1.5', // Adjusted line height
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary-values))',
          color: 'hsl(var(--primary-foreground-values))',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 1rem', // Reduced padding for smaller screens
          fontSize: '0.875rem', // Reduced font size
          textTransform: 'none',
          fontWeight: '500',
        },
        buttonBack: {
          backgroundColor: 'hsl(var(--secondary-values))',
          color: 'hsl(var(--secondary-foreground-values))',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 1rem', // Reduced padding
          fontSize: '0.875rem', // Reduced font size
          marginRight: '0.5rem', // Reduced margin
          textTransform: 'none',
          fontWeight: '500',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground-values))',
          fontSize: '0.8rem', // Reduced font size
          textTransform: 'none',
          textDecoration: 'underline',
        },
        buttonClose: {
          top: '10px', // Maintained position
          right: '10px',
          height: '1.25rem',
          width: '1.25rem',
          color: 'hsl(var(--muted-foreground-values))',
          transition: 'color 0.2s ease-in-out',
          // For better touch target, consider a wrapper if Joyride allows, or rely on its default.
        },
        beacon: {
          outlineOffset: '2px',
          outlineColor: 'hsla(var(--primary-values), 0.5)',
          backgroundColor: 'hsl(var(--primary-values))',
        },
        spotlight: {
          borderRadius: 'var(--radius-md)',
          // The boxShadow for overlay effect is good, keep as is.
          boxShadow:
            '0 0 0 9999px hsla(var(--background-values), 0.85), 0 0 15px hsla(var(--primary-values), 0.5)',
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
