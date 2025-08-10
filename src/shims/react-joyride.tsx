import React from 'react';

// Minimal type shapes used by our code
export type Step = {
  target: string | HTMLElement;
  title?: string;
  content?: React.ReactNode;
  disableBeacon?: boolean;
  placement?: string;
  spotlightPadding?: number;
  [key: string]: any;
};

export type CallBackProps = {
  action: 'start' | 'stop' | 'next' | 'prev' | 'close' | string;
  index: number;
  lifecycle?: string;
  origin?: string;
  size?: number;
  status: 'idle' | 'running' | 'paused' | 'finished' | 'skipped' | string;
  step: Step;
  type:
    | 'tour:start'
    | 'tour:end'
    | 'step:before'
    | 'step:after'
    | 'target:notFound'
    | 'error:target_not_found'
    | 'beacon'
    | 'tooltip'
    | string;
};

// No-op Joyride component that renders nothing in production builds
// Accepts the same props our app uses to satisfy TS
export type JoyrideProps = {
  steps?: Step[];
  run?: boolean;
  stepIndex?: number;
  continuous?: boolean;
  showProgress?: boolean;
  showSkipButton?: boolean;
  callback?: (data: CallBackProps) => void;
  locale?: Record<string, any>;
  styles?: Record<string, any>;
  [key: string]: any;
};

const Joyride: React.FC<JoyrideProps> = () => null;

export default Joyride;
