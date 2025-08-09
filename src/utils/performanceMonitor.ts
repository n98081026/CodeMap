'use client';

interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private entries: PerformanceEntry[] = [];
  private activeTimers: Map<string, number> = new Map();
  private maxEntries: number = 100;

  /**
   * Start timing a performance measurement
   */
  start(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.activeTimers.set(name, startTime);

    if (process.env.NODE_ENV === 'development') {
      console.time(`Performance: ${name}`);
    }
  }

  /**
   * End timing and record the measurement
   */
  end(name: string): PerformanceEntry | null {
    const endTime = performance.now();
    const startTime = this.activeTimers.get(name);

    if (!startTime) {
      console.warn(`Performance timer "${name}" was not started`);
      return null;
    }

    const duration = endTime - startTime;
    const entry: PerformanceEntry = {
      name,
      startTime,
      endTime,
      duration,
    };

    this.entries.push(entry);
    this.activeTimers.delete(name);

    // Keep only the most recent entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(`Performance: ${name}`);
      console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`);
    }

    return entry;
  }

  /**
   * Measure a function execution time
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Measure an async function execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(name?: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    total: number;
    entries: PerformanceEntry[];
  } {
    const filteredEntries = name
      ? this.entries.filter((entry) => entry.name === name)
      : this.entries;

    if (filteredEntries.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        total: 0,
        entries: [],
      };
    }

    const durations = filteredEntries.map((entry) => entry.duration);
    const total = durations.reduce((sum, duration) => sum + duration, 0);

    return {
      count: filteredEntries.length,
      average: total / filteredEntries.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total,
      entries: filteredEntries,
    };
  }

  /**
   * Get all unique measurement names
   */
  getNames(): string[] {
    return Array.from(new Set(this.entries.map((entry) => entry.name)));
  }

  /**
   * Clear all performance entries
   */
  clear(): void {
    this.entries = [];
    this.activeTimers.clear();
  }

  /**
   * Get a performance report
   */
  getReport(): string {
    const names = this.getNames();
    const report = names
      .map((name) => {
        const stats = this.getStats(name);
        return `${name}: ${stats.count} calls, avg: ${stats.average.toFixed(2)}ms, min: ${stats.min.toFixed(2)}ms, max: ${stats.max.toFixed(2)}ms`;
      })
      .join('\n');

    return `Performance Report:\n${report}`;
  }

  /**
   * Log performance report to console
   */
  logReport(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.getReport());
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    start: performanceMonitor.start.bind(performanceMonitor),
    end: performanceMonitor.end.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    getStats: performanceMonitor.getStats.bind(performanceMonitor),
    getReport: performanceMonitor.getReport.bind(performanceMonitor),
    logReport: performanceMonitor.logReport.bind(performanceMonitor),
    clear: performanceMonitor.clear.bind(performanceMonitor),
  };
};
