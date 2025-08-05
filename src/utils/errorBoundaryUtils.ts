/**
 * Utility functions for error boundary and error handling
 */

export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

export interface ErrorReport {
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
}

/**
 * Creates a standardized error report
 */
export function createErrorReport(
  error: Error,
  errorInfo: ErrorInfo,
  userId?: string
): ErrorReport {
  return {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack || '',
    } as Error,
    errorInfo,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
    userId,
  };
}

/**
 * Logs error to console in development, could be extended to send to monitoring service
 */
export function logError(errorReport: ErrorReport): void {
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Boundary Caught Error');
    console.error('Error:', errorReport.error);
    console.error('Error Info:', errorReport.errorInfo);
    console.error('Timestamp:', errorReport.timestamp);
    console.error('URL:', errorReport.url);
    if (errorReport.userId) {
      console.error('User ID:', errorReport.userId);
    }
    console.groupEnd();
  }

  // In production, you might want to send this to a monitoring service
  // Example: sendToMonitoringService(errorReport);
}

/**
 * Determines if an error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  // Network errors are usually recoverable
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return true;
  }

  // Timeout errors are recoverable
  if (error.message.includes('timeout')) {
    return true;
  }

  // Chunk loading errors (common in React apps) are recoverable
  if (error.message.includes('Loading chunk') || error.message.includes('ChunkLoadError')) {
    return true;
  }

  // Most other errors are not recoverable
  return false;
}

/**
 * Gets a user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: Error): string {
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }

  if (error.message.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }

  if (error.message.includes('Loading chunk') || error.message.includes('ChunkLoadError')) {
    return 'Failed to load application resources. Please refresh the page.';
  }

  if (error.message.includes('permission') || error.message.includes('unauthorized')) {
    return 'You do not have permission to perform this action.';
  }

  // Generic fallback
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}