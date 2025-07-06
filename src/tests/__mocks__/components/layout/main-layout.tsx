import React from 'react';

// This is the mock for MainLayout.tsx
// It needs to provide a default export that is a React component.
// If AppLayout also tries to import a named export `MainLayout`, we should provide that too.

const MockMainLayout = ({ children }: { children: React.ReactNode }) => {
  // console.log('MockMainLayout rendered with children:', children);
  return <div data-testid='main-layout'>{children}</div>;
};

export default MockMainLayout;

// If AppLayout.tsx or other files also use a named import like: import { MainLayout } from '...'
// then we also need to export it as a named export.
export const MainLayout = MockMainLayout;
