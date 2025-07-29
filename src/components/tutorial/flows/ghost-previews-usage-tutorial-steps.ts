import { Step } from 'react-joyride';

export const getGhostPreviewsUsageTutorialSteps = (t: (key: string) => string): Step[] => [
  {
    target: '#ghost-preview-toolbar',
    content: t(
      'tutorialSteps.ghostPreviewsUsageTutorial.ghostPreviewToolbar.content'
    ),
    title: t(
      'tutorialSteps.ghostPreviewsUsageTutorial.ghostPreviewToolbar.title'
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.ghost-node',
    content: t('tutorialSteps.ghostPreviewsUsageTutorial.ghostNode.content'),
    title: t('tutorialSteps.ghostPreviewsUsageTutorial.ghostNode.title'),
    placement: 'bottom',
  },
  {
    target: '#accept-ghost-preview-button',
    content: t(
      'tutorialSteps.ghostPreviewsUsageTutorial.acceptGhostPreviewButton.content'
    ),
    title: t(
      'tutorialSteps.ghostPreviewsUsageTutorial.acceptGhostPreviewButton.title'
    ),
    placement: 'bottom',
  },
];
