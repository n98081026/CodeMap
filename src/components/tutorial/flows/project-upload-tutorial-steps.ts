import { Step } from 'react-joyride';

export const getProjectUploadTutorialSteps = (t: any): Step[] => [
  {
    target: '#tutorial-target-project-file-input',
    content: t(
      'tutorialSteps.projectUploadTutorial.projectFileInput.content'
    ),
    title: t('tutorialSteps.projectUploadTutorial.projectFileInput.title'),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#tutorial-target-user-goals-input',
    content: t('tutorialSteps.projectUploadTutorial.userGoalsInput.content'),
    title: t('tutorialSteps.projectUploadTutorial.userGoalsInput.title'),
    placement: 'bottom',
  },
  {
    target: '#tutorial-target-start-analysis-button',
    content: t(
      'tutorialSteps.projectUploadTutorial.startAnalysisButton.content'
    ),
    title: t('tutorialSteps.projectUploadTutorial.startAnalysisButton.title'),
    placement: 'top',
  },
];
