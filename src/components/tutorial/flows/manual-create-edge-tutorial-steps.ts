import { Step } from 'react-joyride';

export const getManualCreateEdgeTutorialSteps = (
  t: any,
  dynamicEdgeId?: string | null
): Step[] => {
  const steps: Step[] = [
    {
      target: '.react-flow__pane',
      content: t('tutorialSteps.manualCreateEdgeTutorial.dragEdge.content'),
      title: t('tutorialSteps.manualCreateEdgeTutorial.dragEdge.title'),
      placement: 'center',
      disableBeacon: true,
    },
  ];

  if (dynamicEdgeId) {
    steps.push({
      target: `#edge-${dynamicEdgeId}`,
      content: t('tutorialSteps.manualCreateEdgeTutorial.newEdge.content'),
      title: t('tutorialSteps.manualCreateEdgeTutorial.newEdge.title'),
      placement: 'bottom',
    });
  }

  return steps;
};
