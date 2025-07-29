import { Step } from 'react-joyride';

import { User } from '@/types';

export const getDashboardTutorialSteps = (
  t: (key: string) => string,
  user: User,
  commonWelcomeStep: Step,
  commonNavSteps: Step[]
): Step[] => [
  commonWelcomeStep,
  ...commonNavSteps,
  {
    target: '#tutorial-target-my-dashboard-header',
    content: t('tutorialSteps.dashboardTutorial.myDashboardHeader.content'),
    title: t('tutorialSteps.dashboardTutorial.myDashboardHeader.title'),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#tutorial-target-welcome-banner',
    content: t('tutorialSteps.dashboardTutorial.welcomeBanner.content'),
    title: t('tutorialSteps.dashboardTutorial.welcomeBanner.title'),
    placement: 'bottom',
  },
  {
    target: '#tutorial-target-quick-stats',
    content: t('tutorialSteps.dashboardTutorial.quickStats.content'),
    title: t('tutorialSteps.dashboardTutorial.quickStats.title'),
    placement: 'bottom',
  },
  {
    target: '#tutorial-target-recent-maps',
    content: t('tutorialSteps.dashboardTutorial.recentMaps.content'),
    title: t('tutorialSteps.dashboardTutorial.recentMaps.title'),
    placement: 'top',
  },
  {
    target: '#tutorial-target-recent-analyses',
    content: t('tutorialSteps.dashboardTutorial.recentAnalyses.content'),
    title: t('tutorialSteps.dashboardTutorial.recentAnalyses.title'),
    placement: 'top',
  },
];
