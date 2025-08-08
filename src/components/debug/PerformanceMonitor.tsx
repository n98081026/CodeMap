'use client';

import { Activity, Clock, Cpu, HardDrive, Zap } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PERFORMANCE_CONFIG,
  PERFORMANCE_THRESHOLDS,
} from '@/config/performanceConfig';
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';
import { usePerformanceMonitor } from '@/utils/performanceMonitor';

interface PerformanceMonitorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isOpen,
  onClose,
}) => {
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const {
    memoryStats,
    startMonitoring: startMemoryMonitoring,
    stopMonitoring: stopMemoryMonitoring,
    optimizeMemory,
    isMemoryHigh,
  } = useMemoryOptimization();

  const {
    getStats,
    getReport,
    logReport,
    clear: clearPerformanceStats,
  } = usePerformanceMonitor();

  // FPS monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime >= lastTime + 1000) {
        const currentFPS = Math.round(
          (frameCount * 1000) / (currentTime - lastTime)
        );
        const currentFrameTime = (currentTime - lastTime) / frameCount;

        setFps(currentFPS);
        setFrameTime(currentFrameTime);

        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isMonitoring]);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      setIsMonitoring(false);
      stopMemoryMonitoring();
    } else {
      setIsMonitoring(true);
      startMemoryMonitoring(1000); // Update every second
    }
  }, [isMonitoring, startMemoryMonitoring, stopMemoryMonitoring]);

  // Get performance statistics
  const allStats = getStats();

  // Format memory size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get performance status color
  const getPerformanceColor = (
    value: number,
    thresholds: { FAST: number; ACCEPTABLE: number; SLOW: number }
  ) => {
    if (value <= thresholds.FAST) return 'text-green-600';
    if (value <= thresholds.ACCEPTABLE) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <Card className='w-full max-w-4xl max-h-[90vh] overflow-auto'>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle className='flex items-center gap-2'>
            <Activity className='h-5 w-5' />
            Performance Monitor
          </CardTitle>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' onClick={toggleMonitoring}>
              {isMonitoring ? 'Stop' : 'Start'} Monitoring
            </Button>
            <Button variant='outline' size='sm' onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue='overview' className='w-full'>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='memory'>Memory</TabsTrigger>
              <TabsTrigger value='performance'>Performance</TabsTrigger>
              <TabsTrigger value='config'>Config</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value='overview' className='space-y-4'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <Card>
                  <CardContent className='p-4'>
                    <div className='flex items-center gap-2'>
                      <Zap className='h-4 w-4 text-blue-500' />
                      <div>
                        <p className='text-sm font-medium'>FPS</p>
                        <p
                          className={`text-2xl font-bold ${getPerformanceColor(60 - fps, PERFORMANCE_THRESHOLDS.RENDER)}`}
                        >
                          {fps}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className='p-4'>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-4 w-4 text-green-500' />
                      <div>
                        <p className='text-sm font-medium'>Frame Time</p>
                        <p
                          className={`text-2xl font-bold ${getPerformanceColor(frameTime, PERFORMANCE_THRESHOLDS.RENDER)}`}
                        >
                          {frameTime.toFixed(1)}ms
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className='p-4'>
                    <div className='flex items-center gap-2'>
                      <HardDrive className='h-4 w-4 text-purple-500' />
                      <div>
                        <p className='text-sm font-medium'>Memory Usage</p>
                        <p
                          className={`text-2xl font-bold ${isMemoryHigh() ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {memoryStats
                            ? `${memoryStats.usedPercentage.toFixed(1)}%`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className='p-4'>
                    <div className='flex items-center gap-2'>
                      <Cpu className='h-4 w-4 text-orange-500' />
                      <div>
                        <p className='text-sm font-medium'>Operations</p>
                        <p className='text-2xl font-bold'>{allStats.count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={optimizeMemory}
                  disabled={!memoryStats}
                >
                  Optimize Memory
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={clearPerformanceStats}
                >
                  Clear Stats
                </Button>
                <Button variant='outline' size='sm' onClick={logReport}>
                  Log Report
                </Button>
              </div>
            </TabsContent>

            {/* Memory Tab */}
            <TabsContent value='memory' className='space-y-4'>
              {memoryStats ? (
                <>
                  <div className='space-y-2'>
                    <div className='flex justify-between text-sm'>
                      <span>Used JS Heap Size</span>
                      <span>{formatBytes(memoryStats.usedJSHeapSize)}</span>
                    </div>
                    <Progress
                      value={memoryStats.usedPercentage}
                      className='h-2'
                    />
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
                    <div>
                      <p className='font-medium'>Used</p>
                      <p>{formatBytes(memoryStats.usedJSHeapSize)}</p>
                    </div>
                    <div>
                      <p className='font-medium'>Total</p>
                      <p>{formatBytes(memoryStats.totalJSHeapSize)}</p>
                    </div>
                    <div>
                      <p className='font-medium'>Limit</p>
                      <p>{formatBytes(memoryStats.jsHeapSizeLimit)}</p>
                    </div>
                  </div>

                  {isMemoryHigh() && (
                    <div className='p-4 bg-red-50 border border-red-200 rounded-md'>
                      <p className='text-red-800 font-medium'>
                        High Memory Usage Detected
                      </p>
                      <p className='text-red-600 text-sm mt-1'>
                        Consider optimizing memory usage or running cleanup.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className='text-muted-foreground'>
                  Memory monitoring not available in this browser.
                </p>
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value='performance' className='space-y-4'>
              <div className='space-y-4'>
                <div>
                  <h3 className='text-lg font-semibold mb-2'>
                    Performance Statistics
                  </h3>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                    <div>
                      <p className='font-medium'>Total Operations</p>
                      <p>{allStats.count}</p>
                    </div>
                    <div>
                      <p className='font-medium'>Average Time</p>
                      <p
                        className={getPerformanceColor(
                          allStats.average,
                          PERFORMANCE_THRESHOLDS.COMPUTATION
                        )}
                      >
                        {allStats.average.toFixed(2)}ms
                      </p>
                    </div>
                    <div>
                      <p className='font-medium'>Min Time</p>
                      <p>{allStats.min.toFixed(2)}ms</p>
                    </div>
                    <div>
                      <p className='font-medium'>Max Time</p>
                      <p
                        className={getPerformanceColor(
                          allStats.max,
                          PERFORMANCE_THRESHOLDS.COMPUTATION
                        )}
                      >
                        {allStats.max.toFixed(2)}ms
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className='text-lg font-semibold mb-2'>
                    Performance Report
                  </h3>
                  <pre className='text-xs bg-muted p-4 rounded-md overflow-auto max-h-64'>
                    {getReport()}
                  </pre>
                </div>
              </div>
            </TabsContent>

            {/* Config Tab */}
            <TabsContent value='config' className='space-y-4'>
              <div>
                <h3 className='text-lg font-semibold mb-2'>
                  Performance Configuration
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                  <div>
                    <h4 className='font-medium mb-2'>Virtual Scrolling</h4>
                    <ul className='space-y-1 text-muted-foreground'>
                      <li>
                        Overscan: {PERFORMANCE_CONFIG.VIRTUAL_SCROLL.OVERSCAN}
                      </li>
                      <li>
                        Item Size:{' '}
                        {PERFORMANCE_CONFIG.VIRTUAL_SCROLL.ESTIMATED_ITEM_SIZE}
                        px
                      </li>
                      <li>
                        Buffer: {PERFORMANCE_CONFIG.VIRTUAL_SCROLL.BUFFER_SIZE}
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className='font-medium mb-2'>Debounce Settings</h4>
                    <ul className='space-y-1 text-muted-foreground'>
                      <li>Search: {PERFORMANCE_CONFIG.DEBOUNCE.SEARCH}ms</li>
                      <li>Input: {PERFORMANCE_CONFIG.DEBOUNCE.INPUT}ms</li>
                      <li>Resize: {PERFORMANCE_CONFIG.DEBOUNCE.RESIZE}ms</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className='font-medium mb-2'>Memory Limits</h4>
                    <ul className='space-y-1 text-muted-foreground'>
                      <li>
                        Cache Size: {PERFORMANCE_CONFIG.MEMORY.MAX_CACHE_SIZE}
                      </li>
                      <li>
                        High Threshold:{' '}
                        {PERFORMANCE_CONFIG.MEMORY.HIGH_MEMORY_THRESHOLD}%
                      </li>
                      <li>
                        Critical:{' '}
                        {PERFORMANCE_CONFIG.MEMORY.CRITICAL_MEMORY_THRESHOLD}%
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className='font-medium mb-2'>Component Limits</h4>
                    <ul className='space-y-1 text-muted-foreground'>
                      <li>
                        Max Nodes:{' '}
                        {PERFORMANCE_CONFIG.COMPONENTS.MAX_RENDERED_NODES}
                      </li>
                      <li>
                        Max Edges:{' '}
                        {PERFORMANCE_CONFIG.COMPONENTS.MAX_RENDERED_EDGES}
                      </li>
                      <li>
                        Batch Size: {PERFORMANCE_CONFIG.COMPONENTS.BATCH_SIZE}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
