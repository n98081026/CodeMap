'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercentage: number;
}

/**
 * Hook for monitoring and optimizing memory usage
 */
export const useMemoryOptimization = () => {
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Get current memory stats
  const getMemoryStats = useCallback((): MemoryStats | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usedPercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  }, []);

  // Register a cleanup function
  const registerCleanup = useCallback((cleanupFn: () => void) => {
    cleanupFunctionsRef.current.push(cleanupFn);
    
    // Return unregister function
    return () => {
      const index = cleanupFunctionsRef.current.indexOf(cleanupFn);
      if (index > -1) {
        cleanupFunctionsRef.current.splice(index, 1);
      }
    };
  }, []);

  // Force garbage collection (if available)
  const forceGarbageCollection = useCallback(() => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('Garbage collection not available. Run with --expose-gc flag for manual GC.');
    }
  }, []);

  // Run all cleanup functions
  const runCleanup = useCallback(() => {
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    cleanupFunctionsRef.current = [];
  }, []);

  // Check if memory usage is high
  const isMemoryHigh = useCallback((threshold: number = 80): boolean => {
    const stats = getMemoryStats();
    return stats ? stats.usedPercentage > threshold : false;
  }, [getMemoryStats]);

  // Optimize memory by running cleanup and GC
  const optimizeMemory = useCallback(() => {
    runCleanup();
    forceGarbageCollection();
    
    // Update stats after optimization
    setTimeout(() => {
      setMemoryStats(getMemoryStats());
    }, 100);
  }, [runCleanup, forceGarbageCollection, getMemoryStats]);

  // Start memory monitoring
  const startMonitoring = useCallback((interval: number = 5000) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const stats = getMemoryStats();
      setMemoryStats(stats);

      // Auto-optimize if memory usage is very high
      if (stats && stats.usedPercentage > 90) {
        console.warn('High memory usage detected, running optimization...');
        optimizeMemory();
      }
    }, interval);
  }, [getMemoryStats, optimizeMemory]);

  // Stop memory monitoring
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
      runCleanup();
    };
  }, [stopMonitoring, runCleanup]);

  return {
    memoryStats,
    getMemoryStats,
    registerCleanup,
    forceGarbageCollection,
    runCleanup,
    isMemoryHigh,
    optimizeMemory,
    startMonitoring,
    stopMonitoring,
  };
};

/**
 * Hook for creating memory-efficient refs that auto-cleanup
 */
export const useMemoryEfficientRef = <T>() => {
  const ref = useRef<T | null>(null);
  const { registerCleanup } = useMemoryOptimization();

  useEffect(() => {
    const unregister = registerCleanup(() => {
      ref.current = null;
    });

    return unregister;
  }, [registerCleanup]);

  return ref;
};

/**
 * Hook for creating memory-efficient state with auto-cleanup
 */
export const useMemoryEfficientState = <T>(initialValue: T) => {
  const [state, setState] = useState<T>(initialValue);
  const { registerCleanup } = useMemoryOptimization();

  useEffect(() => {
    const unregister = registerCleanup(() => {
      setState(initialValue);
    });

    return unregister;
  }, [registerCleanup, initialValue]);

  return [state, setState] as const;
};