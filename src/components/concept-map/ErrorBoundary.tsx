import { AlertTriangle, RefreshCw } from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ConceptMapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      'ConceptMap Error Boundary caught an error:',
      error,
      errorInfo
    );
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className='w-full max-w-2xl mx-auto mt-8'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-red-600'>
              <AlertTriangle className='h-5 w-5' />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-muted-foreground'>
              An error occurred while rendering the concept map. This might be
              due to:
            </p>
            <ul className='list-disc list-inside text-sm text-muted-foreground space-y-1'>
              <li>Corrupted map data</li>
              <li>Network connectivity issues</li>
              <li>Browser compatibility problems</li>
              <li>Temporary system issues</li>
            </ul>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className='mt-4'>
                <summary className='cursor-pointer text-sm font-medium'>
                  Error Details (Development)
                </summary>
                <pre className='mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto'>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className='flex gap-2 pt-4'>
              <Button onClick={this.handleReset} variant='outline'>
                <RefreshCw className='h-4 w-4 mr-2' />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant='default'
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ConceptMapErrorBoundary;
