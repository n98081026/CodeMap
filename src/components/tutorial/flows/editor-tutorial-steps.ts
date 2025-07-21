import { Step } from 'react-joyride';

export const getEditorTutorialSteps = (t: any): Step[] => [
  {
    target: '#editor-toolbar',
    content: t('tutorialSteps.editorTutorial.editorToolbar.content'),
    title: t('tutorialSteps.editorTutorial.editorToolbar.title'),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#properties-inspector',
    content: t('tutorialSteps.editorTutorial.propertiesInspector.content'),
    title: t('tutorialSteps.editorTutorial.propertiesInspector.title'),
    placement: 'left',
  },
  {
    target: '#ai-suggestion-panel',
    content: t('tutorialSteps.editorTutorial.aiSuggestionPanel.content'),
    title: t('tutorialSteps.editorTutorial.aiSuggestionPanel.title'),
    placement: 'left',
  },
  {
    target: '.react-flow__pane',
    content: t('tutorialSteps.editorTutorial.canvas.content'),
    title: t('tutorialSteps.editorTutorial.canvas.title'),
    placement: 'center',
  },
];
