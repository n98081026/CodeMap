'use client';

import { useCallback, useMemo, useRef } from 'react';

/**
 * Performance optimization hook for heavy computations
 */
export const usePerformanceOptimization = () => {
  const performanceRef = useRef<{
    lastComputeTime: number;
    computeCache: Map<string, any>;
  }>({
    lastComputeTime: 0,
    computeCache: new Map(),
  });

  // Debounced computation with caching
  const debouncedCompute = useCallback(
    <T>(
      key: string,
      computeFn: () => T,
      dependencies: any[],
      debounceMs: number = 100
    ): T | undefined => {
      const now = Date.now();
      const cache = performanceRef.current.computeCache;

      // Create cache key from dependencies
      const cacheKey = `${key}-${JSON.stringify(dependencies)}`;

      // Check if we have cached result
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      // Debounce computation
      if (now - performanceRef.current.lastComputeTime < debounceMs) {
        return undefined;
      }

      // Perform computation
      const result = computeFn();
      cache.set(cacheKey, result);
      performanceRef.current.lastComputeTime = now;

      // Clean old cache entries (keep only last 50)
      if (cache.size > 50) {
        const entries = Array.from(cache.entries());
        cache.clear();
        entries.slice(-25).forEach(([k, v]) => cache.set(k, v));
      }

      return result;
    },
    []
  );

  // Throttled function execution
  const throttle = useCallback(
    <T extends (...args: any[]) => any>(
      func: T,
      limit: number
    ): ((...args: Parameters<T>) => void) => {
      let inThrottle: boolean;
      return (...args: Parameters<T>) => {
        if (!inThrottle) {
          func.apply(null, args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    },
    []
  );

  // Measure performance
  const measurePerformance = useCallback(<T>(name: string, fn: () => T): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`);
    }

    return result;
  }, []);

  return {
    debouncedCompute,
    throttle,
    measurePerformance,
  };
};
