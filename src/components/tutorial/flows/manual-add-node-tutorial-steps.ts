import { Step } from 'react-joyride';

export const getManualAddNodeTutorialSteps = (
  t: any,
  dynamicNodeId?: string | null
): Step[] => {
  const steps: Step[] = [
    {
      target: '#editor-toolbar-add-node',
      content: t('tutorialSteps.manualAddNodeTutorial.addNodeButton.content'),
      title: t('tutorialSteps.manualAddNodeTutorial.addNodeButton.title'),
      placement: 'bottom',
      disableBeacon: true,
    },
  ];

  if (dynamicNodeId) {
    steps.push({
      target: `#node-${dynamicNodeId}`,
      content: t('tutorialSteps.manualAddNodeTutorial.newNode.content'),
      title: t('tutorialSteps.manualAddNodeTutorial.newNode.title'),
      placement: 'bottom',
    });
  }

  return steps;
};
