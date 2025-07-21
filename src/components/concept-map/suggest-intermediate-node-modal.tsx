'use client';

import { ArrowRight, Info, Lightbulb } from 'lucide-react'; // Added Lightbulb and Info
import React from 'react';

import { type SuggestIntermediateNodeOutputSchema as IntermediateNodeSuggestionResponse } from '@/ai/flows/suggest-intermediate-node';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SuggestIntermediateNodeModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  suggestionData: IntermediateNodeSuggestionResponse | null;
  onConfirm: () => void;
  onCancel: () => void;
  sourceNodeText?: string;
  targetNodeText?: string;
  originalEdgeLabel?: string;
}

export const SuggestIntermediateNodeModal: React.FC<
  SuggestIntermediateNodeModalProps
> = ({
  isOpen,
  onOpenChange,
  suggestionData,
  onConfirm,
  onCancel,
  sourceNodeText = 'Source Node', // Default values
  targetNodeText = 'Target Node', // Default values
  originalEdgeLabel = '(unlabeled)', // Default values
}) => {
  if (!isOpen || !suggestionData) return null; // Ensure isOpen is also checked here

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className='max-w-lg'>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center'>
            <Lightbulb className='mr-2 h-5 w-5 text-primary' />
            AI 建議：加入一個中間概念
          </AlertDialogTitle>
          <AlertDialogDescription>
            AI 建議在節點{' '}
            <Badge variant='outline' className='mx-1 whitespace-nowrap'>
              {sourceNodeText}
            </Badge>
            和
            <Badge variant='outline' className='ml-1 whitespace-nowrap'>
              {targetNodeText}
            </Badge>
            之間加入一個中間概念。原本的連接是：
            <Badge variant='outline' className='ml-1 whitespace-nowrap'>
              {originalEdgeLabel}
            </Badge>
            。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='my-4 space-y-3 text-sm'>
          <p className='font-semibold'>AI 建議的新想法：</p>
          <div className='p-3 border rounded-md bg-muted/30'>
            <p>
              <strong className='font-medium'>內容：</strong>{' '}
              {suggestionData.intermediateNodeText}
            </p>
            {suggestionData.intermediateNodeDetails && (
              <p className='mt-1 text-xs text-muted-foreground'>
                <strong>詳細說明：</strong>{' '}
                {suggestionData.intermediateNodeDetails}
              </p>
            )}
          </div>

          {suggestionData.reasoning && (
            <div className='mt-3 p-3 border rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'>
              <div className='flex items-start'>
                <Info className='h-4 w-4 mr-2 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='font-semibold text-xs'>AI 的理由：</p>
                  <p className='text-xs'>{suggestionData.reasoning}</p>
                </div>
              </div>
            </div>
          )}

          <p className='font-semibold mt-3'>新的連接方式：</p>
          <div className='space-y-2'>
            <div className='flex items-center text-xs p-2 border rounded-md'>
              <Badge variant='secondary' className='mr-2 whitespace-nowrap'>
                {sourceNodeText}
              </Badge>
              <ArrowRight className='h-3 w-3 text-muted-foreground mx-1 flex-shrink-0' />
              <Badge
                variant='default'
                className='mr-2 bg-blue-500 hover:bg-blue-600 whitespace-nowrap'
              >
                {suggestionData.labelSourceToIntermediate || '相關'}
              </Badge>
              <ArrowRight className='h-3 w-3 text-muted-foreground mx-1 flex-shrink-0' />
              <Badge
                variant='outline'
                className='bg-green-100 dark:bg-green-700 dark:text-green-50 border-green-500 whitespace-nowrap'
              >
                {suggestionData.intermediateNodeText}
              </Badge>
            </div>
            <div className='flex items-center text-xs p-2 border rounded-md'>
              <Badge
                variant='outline'
                className='mr-2 bg-green-100 dark:bg-green-700 dark:text-green-50 border-green-500 whitespace-nowrap'
              >
                {suggestionData.intermediateNodeText}
              </Badge>
              <ArrowRight className='h-3 w-3 text-muted-foreground mx-1 flex-shrink-0' />
              <Badge
                variant='default'
                className='mr-2 bg-blue-500 hover:bg-blue-600 whitespace-nowrap'
              >
                {suggestionData.labelIntermediateToTarget || '相關'}
              </Badge>
              <ArrowRight className='h-3 w-3 text-muted-foreground mx-1 flex-shrink-0' />
              <Badge variant='secondary' className='mr-2 whitespace-nowrap'>
                {targetNodeText}
              </Badge>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className='bg-primary hover:bg-primary/90'
          >
            新增到地圖
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
