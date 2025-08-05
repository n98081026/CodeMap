import { useEffect, useRef } from 'react';

/**
 * Hook to help prevent memory leaks by cleaning up resources
 */
export function useMemoryCleanup() {
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const abortControllersRef = useRef<Set<AbortController>>(new Set());

  const addTimeout = (timeout: NodeJS.Timeout) => {
    timeoutsRef.current.add(timeout);
    return timeout;
  };

  const addInterval = (interval: NodeJS.Timeout) => {
    intervalsRef.current.add(interval);
    return interval;
  };

  const addAbortController = (controller: AbortController) => {
    abortControllersRef.current.add(controller);
    return controller;
  };

  const cleanup = () => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => {
      clearTimeout(timeout);
    });
    timeoutsRef.current.clear();

    // Clear all intervals
    intervalsRef.current.forEach(interval => {
      clearInterval(interval);
    });
    intervalsRef.current.clear();

    // Abort all controllers
    abortControllersRef.current.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });
    abortControllersRef.current.clear();
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return {
    addTimeout,
    addInterval,
    addAbortController,
    cleanup,
  };
}