import { TFunction } from 'i18next';
import { Step } from 'react-joyride';

export const getCommonTutorialSteps = (
  t: TFunction
): { commonWelcomeStep: Step; commonNavSteps: Step[] } => {
  const commonWelcomeStep: Step = {
    target: 'body',
    content: t(
      'tutorialSteps.common.welcomeContent',
      'Welcome to CodeMap! This tool helps you understand and visualize code structures.'
    ),
    placement: 'center',
    title: t('tutorialSteps.common.welcomeTitle', 'Welcome!'),
    disableBeacon: true,
  };

  const commonNavSteps: Step[] = [
    {
      target: '.sidebar-nav-container',
      content: t(
        'tutorialSteps.common.navBarContent',
        'This is the main navigation bar. Access different feature areas based on your role.'
      ),
      placement: 'right',
      title: t('tutorialSteps.common.navBarTitle', 'Navigation Bar'),
    },
    {
      target: '.main-layout-content-area',
      content: t(
        'tutorialSteps.common.mainContentAreaContent',
        'This area will display your selected feature pages and main content.'
      ),
      placement: 'auto',
      title: t(
        'tutorialSteps.common.mainContentAreaTitle',
        'Main Content Area'
      ),
    },
    {
      target: '.navbar-user-button',
      content: t(
        'tutorialSteps.common.userMenuContent',
        'Click here to manage your profile or log out.'
      ),
      placement: 'bottom-end',
      title: t('tutorialSteps.common.userMenuTitle', 'User Menu'),
    },
  ];

  return { commonWelcomeStep, commonNavSteps };
};
