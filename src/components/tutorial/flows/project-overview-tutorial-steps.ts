import { Step } from 'react-joyride';

export const getProjectOverviewTutorialSteps = (t: (key: string) => string): Step[] => [
  {
    target: '#project-overview-panel',
    content: t('tutorialSteps.projectOverviewTutorial.overviewPanel.content'),
    title: t('tutorialSteps.projectOverviewTutorial.overviewPanel.title'),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '#project-overview-summary',
    content: t('tutorialSteps.projectOverviewTutorial.summary.content'),
    title: t('tutorialSteps.projectOverviewTutorial.summary.title'),
    placement: 'bottom',
  },
  {
    target: '#project-overview-modules',
    content: t('tutorialSteps.projectOverviewTutorial.modules.content'),
    title: t('tutorialSteps.projectOverviewTutorial.modules.title'),
    placement: 'top',
  },
];
