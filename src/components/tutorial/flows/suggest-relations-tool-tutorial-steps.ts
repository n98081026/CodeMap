import { Step } from 'react-joyride';

export const getSuggestRelationsToolTutorialSteps = (t: any): Step[] => [
  {
    target: '#suggest-relations-button',
    content: t(
      'tutorialSteps.suggestRelationsToolTutorial.suggestRelationsButton.content'
    ),
    title: t(
      'tutorialSteps.suggestRelationsToolTutorial.suggestRelationsButton.title'
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#ai-suggestion-panel',
    content: t(
      'tutorialSteps.suggestRelationsToolTutorial.suggestionPanel.content'
    ),
    title: t(
      'tutorialSteps.suggestRelationsToolTutorial.suggestionPanel.title'
    ),
    placement: 'left',
  },
];
