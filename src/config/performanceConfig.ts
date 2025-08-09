// Performance optimization configuration

export const PERFORMANCE_CONFIG = {
  // Virtual scrolling settings
  VIRTUAL_SCROLL: {
    OVERSCAN: 5,
    ESTIMATED_ITEM_SIZE: 50,
    BUFFER_SIZE: 10,
  },

  // Debounce and throttle settings
  DEBOUNCE: {
    SEARCH: 300,
    INPUT: 150,
    RESIZE: 100,
    SCROLL: 16, // ~60fps
  },

  THROTTLE: {
    DRAG: 16, // ~60fps
    MOUSE_MOVE: 16,
    WINDOW_RESIZE: 100,
  },

  // Memory management
  MEMORY: {
    MAX_CACHE_SIZE: 50,
    CLEANUP_INTERVAL: 30000, // 30 seconds
    HIGH_MEMORY_THRESHOLD: 80, // percentage
    CRITICAL_MEMORY_THRESHOLD: 90,
  },

  // Component optimization
  COMPONENTS: {
    LAZY_LOAD_THRESHOLD: 1000, // Load components when within 1000px
    MAX_RENDERED_NODES: 500,
    MAX_RENDERED_EDGES: 1000,
    BATCH_SIZE: 50,
  },

  // Animation and transitions
  ANIMATION: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500,
    },
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
    REDUCED_MOTION: false, // Will be set based on user preference
  },

  // Bundle optimization
  BUNDLE: {
    CHUNK_SIZE_WARNING: 244 * 1024, // 244KB
    ENABLE_CODE_SPLITTING: true,
    PRELOAD_CRITICAL_COMPONENTS: true,
  },

  // Development settings
  DEV: {
    ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development',
    LOG_SLOW_OPERATIONS: true,
    SLOW_OPERATION_THRESHOLD: 100, // ms
    ENABLE_MEMORY_MONITORING: true,
  },
} as const;

// Performance thresholds for different operations
export const PERFORMANCE_THRESHOLDS = {
  RENDER: {
    FAST: 16, // 60fps
    ACCEPTABLE: 33, // 30fps
    SLOW: 100,
  },

  COMPUTATION: {
    FAST: 10,
    ACCEPTABLE: 50,
    SLOW: 200,
  },

  NETWORK: {
    FAST: 100,
    ACCEPTABLE: 500,
    SLOW: 2000,
  },
} as const;

// Feature flags for performance optimizations
export const PERFORMANCE_FEATURES = {
  ENABLE_VIRTUAL_SCROLLING: true,
  ENABLE_MEMOIZATION: true,
  ENABLE_LAZY_LOADING: true,
  ENABLE_CODE_SPLITTING: true,
  ENABLE_MEMORY_OPTIMIZATION: true,
  ENABLE_DEBOUNCING: true,
  ENABLE_THROTTLING: true,
  ENABLE_PERFORMANCE_MONITORING:
    PERFORMANCE_CONFIG.DEV.ENABLE_PERFORMANCE_MONITORING,
} as const;

// Get performance config based on device capabilities
export const getDeviceOptimizedConfig = () => {
  const isLowEndDevice = navigator.hardwareConcurrency <= 2;
  const isSlowNetwork =
    'connection' in navigator &&
    (navigator as any).connection?.effectiveType === 'slow-2g';

  return {
    ...PERFORMANCE_CONFIG,
    COMPONENTS: {
      ...PERFORMANCE_CONFIG.COMPONENTS,
      MAX_RENDERED_NODES: isLowEndDevice ? 200 : 500,
      MAX_RENDERED_EDGES: isLowEndDevice ? 400 : 1000,
      BATCH_SIZE: isLowEndDevice ? 25 : 50,
    },
    DEBOUNCE: {
      ...PERFORMANCE_CONFIG.DEBOUNCE,
      SEARCH: isSlowNetwork ? 500 : 300,
      INPUT: isSlowNetwork ? 300 : 150,
    },
    ANIMATION: {
      ...PERFORMANCE_CONFIG.ANIMATION,
      REDUCED_MOTION:
        isLowEndDevice ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    },
  };
};
