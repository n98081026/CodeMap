/**
 * Performance utilities for CodeMap
 * Provides helpers for optimizing large concept maps and AI operations
 */

import { useCallback, useMemo } from 'react';

// Debounce utility for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for high-frequency events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Chunk array for processing large datasets
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Performance monitoring hook
export function usePerformanceMonitor(operationName: string) {
  const startTiming = useCallback(() => {
    return performance.now();
  }, []);
  
  const endTiming = useCallback((startTime: number) => {
    const duration = performance.now() - startTime;
    console.log(`⏱️ ${operationName} took ${duration.toFixed(2)}ms`);
    
    // Report to analytics if available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'timing_complete', {
        name: operationName,
        value: Math.round(duration)
      });
    }
    
    return duration;
  }, [operationName]);
  
  return { startTiming, endTiming };
}

// Memory usage monitoring
export function getMemoryUsage(): string {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
    const memory = (performance as any).memory;
    const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
    return `${used}MB / ${total}MB`;
  }
  return 'Memory info not available';
}

// Optimize large concept map rendering
export function shouldRenderNode(
  nodePosition: { x: number; y: number },
  viewport: { x: number; y: number; zoom: number },
  canvasSize: { width: number; height: number }
): boolean {
  const buffer = 200; // Render buffer outside viewport
  const scaledX = (nodePosition.x + viewport.x) * viewport.zoom;
  const scaledY = (nodePosition.y + viewport.y) * viewport.zoom;
  
  return (
    scaledX > -buffer &&
    scaledX < canvasSize.width + buffer &&
    scaledY > -buffer &&
    scaledY < canvasSize.height + buffer
  );
}

// Batch updates for better performance
export class BatchProcessor<T> {
  private batch: T[] = [];
  private batchSize: number;
  private processor: (items: T[]) => void;
  private timeout: NodeJS.Timeout | null = null;
  
  constructor(batchSize: number, processor: (items: T[]) => void) {
    this.batchSize = batchSize;
    this.processor = processor;
  }
  
  add(item: T): void {
    this.batch.push(item);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else {
      // Auto-flush after delay if batch isn't full
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(() => this.flush(), 100);
    }
  }
  
  flush(): void {
    if (this.batch.length > 0) {
      this.processor([...this.batch]);
      this.batch = [];
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

// Web Vitals reporting
export function reportWebVitals(metric: any): void {
  console.log(`📊 ${metric.name}: ${metric.value}`);
  
  // Report to analytics
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
}