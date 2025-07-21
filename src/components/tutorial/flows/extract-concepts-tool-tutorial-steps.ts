import { Step } from 'react-joyride';

export const getExtractConceptsToolTutorialSteps = (t: any): Step[] => [
  {
    target: '#extract-concepts-modal',
    content: t(
      'tutorialSteps.extractConceptsToolTutorial.extractConceptsModal.content'
    ),
    title: t(
      'tutorialSteps.extractConceptsToolTutorial.extractConceptsModal.title'
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '#text-for-extraction-input',
    content: t(
      'tutorialSteps.extractConceptsToolTutorial.textForExtractionInput.content'
    ),
    title: t(
      'tutorialSteps.extractConceptsToolTutorial.textForExtractionInput.title'
    ),
    placement: 'bottom',
  },
  {
    target: '#start-extraction-button',
    content: t(
      'tutorialSteps.extractConceptsToolTutorial.startExtractionButton.content'
    ),
    title: t(
      'tutorialSteps.extractConceptsToolTutorial.startExtractionButton.title'
    ),
    placement: 'bottom',
  },
];
