'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<Record<string, unknown>>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<Record<string, unknown>>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='flex items-center justify-center min-h-[400px] p-6'>
          <Alert className='max-w-md'>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className='mt-2'>
              {this.state.error?.message || 'An unexpected error occurred'}
            </AlertDescription>
            <Button
              onClick={() => this.setState({ hasError: false })}
              className='mt-4'
              size='sm'
            >
              <RefreshCw className='h-4 w-4 mr-2' />
              Try again
            </Button>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
