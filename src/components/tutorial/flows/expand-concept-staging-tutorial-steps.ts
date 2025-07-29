import { Step } from 'react-joyride';

export const getExpandConceptStagingTutorialSteps = (t: (key: string) => string): Step[] => [
  {
    target: '#ghost-preview-toolbar',
    content: t(
      'tutorialSteps.expandConceptStagingTutorial.ghostPreviewToolbar.content'
    ),
    title: t(
      'tutorialSteps.expandConceptStagingTutorial.ghostPreviewToolbar.title'
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.ghost-node',
    content: t('tutorialSteps.expandConceptStagingTutorial.ghostNode.content'),
    title: t('tutorialSteps.expandConceptStagingTutorial.ghostNode.title'),
    placement: 'bottom',
  },
];
