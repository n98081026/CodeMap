import { Step } from 'react-joyride';

export const getGhostPreviewLayoutTutorialSteps = (
  t: (key: string) => string
): Step[] => [
  {
    target: '#ghost-preview-toolbar',
    content: t(
      'tutorialSteps.ghostPreviewLayoutTutorial.ghostPreviewToolbar.content'
    ),
    title: t(
      'tutorialSteps.ghostPreviewLayoutTutorial.ghostPreviewToolbar.title'
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#accept-ghost-preview-button',
    content: t(
      'tutorialSteps.ghostPreviewLayoutTutorial.acceptGhostPreviewButton.content'
    ),
    title: t(
      'tutorialSteps.ghostPreviewLayoutTutorial.acceptGhostPreviewButton.title'
    ),
    placement: 'bottom',
  },
];
