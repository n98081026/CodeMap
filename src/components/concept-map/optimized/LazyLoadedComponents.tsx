'use client';

import { Loader2 } from 'lucide-react';
import React, { Suspense, lazy } from 'react';

// Lazy load heavy components to improve initial bundle size
export const LazyAISuggestionPanel = lazy(() =>
  import('../ai-suggestion-panel').then((module) => ({
    default: module.default,
  }))
);

export const LazyEditorToolbar = lazy(() =>
  import('../editor-toolbar').then((module) => ({
    default: module.EditorToolbar,
  }))
);

export const LazyPropertiesInspector = lazy(() =>
  import('../properties-inspector').then((module) => ({
    default: module.PropertiesInspector,
  }))
);

export const LazyProjectOverviewDisplay = lazy(() =>
  import('../project-overview-display').then((module) => ({
    default: module.default,
  }))
);

export const LazyGhostPreviewToolbar = lazy(() =>
  import('../GhostPreviewToolbar').then((module) => ({
    default: module.default,
  }))
);

export const LazyNodeContextMenu = lazy(() =>
  import('../node-context-menu').then((module) => ({
    default: module.NodeContextMenu,
  }))
);

// Loading fallback component
const LoadingFallback: React.FC<{
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <Loader2
        className={`animate-spin text-muted-foreground ${sizeClasses[size]}`}
      />
    </div>
  );
};

// HOC for wrapping components with Suspense and loading fallback
export const withSuspense = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <Suspense fallback={fallback || <LoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );

  WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Pre-wrapped components with Suspense
export const SuspensedAISuggestionPanel = withSuspense(
  LazyAISuggestionPanel,
  <LoadingFallback className='h-64' />
);

export const SuspensedEditorToolbar = withSuspense(
  LazyEditorToolbar,
  <LoadingFallback size='sm' className='h-12' />
);

export const SuspensedPropertiesInspector = withSuspense(
  LazyPropertiesInspector,
  <LoadingFallback className='h-96' />
);

export const SuspensedProjectOverviewDisplay = withSuspense(
  LazyProjectOverviewDisplay,
  <LoadingFallback className='h-64' />
);

export const SuspensedGhostPreviewToolbar = withSuspense(
  LazyGhostPreviewToolbar,
  <LoadingFallback size='sm' className='h-10' />
);

export const SuspensedNodeContextMenu = withSuspense(
  LazyNodeContextMenu,
  <div className='w-48 h-32 bg-background border rounded-md shadow-lg animate-pulse' />
);
