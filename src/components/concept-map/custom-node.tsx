
"use client";
import React, { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useConceptMapStore from '@/stores/concept-map-store';
import {
  Box, Milestone, ServerCog, MonitorPlay, Database, FileCode2, ExternalLink, Users, Workflow,
  Brain, Lightbulb, Puzzle, AlignLeft, PenLine, PlusCircle, Loader2, Sparkles
} from 'lucide-react';
import { getNodePlacement } from '@/lib/layout-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface CustomNodeData {
  label: string;
  details?: string;
  type?: string;
  isViewOnly?: boolean;
  backgroundColor?: string;
  shape?: 'rectangle' | 'ellipse';
  width?: number;
  height?: number;
  onTriggerAIExpand?: (nodeId: string) => void;
}

// Simplified rendering for debugging
const CustomNodeComponent: React.FC<NodeProps<CustomNodeData>> = ({ data, id, selected }) => {
  const { editingNodeId, setEditingNodeId, updateNode } = useConceptMapStore();
  const isCurrentNodeEditing = editingNodeId === id && !data.isViewOnly;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCurrentNodeEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isCurrentNodeEditing]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(id, { text: e.target.value });
  };

  const handleLabelEditCommit = () => {
    setEditingNodeId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLabelEditCommit();
    if (e.key === 'Escape') setEditingNodeId(null);
  };
  
  // ALWAYS RENDER A SIMPLE DIV FOR DEBUGGING
  return (
    <div 
      style={{ 
        padding: '10px', 
        border: selected ? '2px solid blue' : '1px solid black', 
        background: data.isViewOnly ? 'lightgray' : 'lightyellow', 
        minWidth: '100px', 
        minHeight: '50px',
        borderRadius: '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onDoubleClick={() => !data.isViewOnly && setEditingNodeId(id)}
    >
      {isCurrentNodeEditing ? (
         <Input
            ref={inputRef}
            value={data.label}
            onChange={handleLabelChange}
            onBlur={handleLabelEditCommit}
            onKeyDown={handleKeyDown}
            className="text-sm font-semibold h-7 px-1 py-0.5 border-primary focus:ring-primary flex-grow min-w-0 bg-background/80"
          />
      ) : (
        <div style={{ wordBreak: 'break-word' }}>{data.label || 'Node'}</div>
      )}
      <Handle type="source" position={Position.Top} id={`${id}-top-source`} style={{ background: '#555' }} isConnectable={!data.isViewOnly} />
      <Handle type="target" position={Position.Top} id={`${id}-top-target`} style={{ background: '#555' }} isConnectable={!data.isViewOnly} />
      <Handle type="source" position={Position.Right} id={`${id}-right-source`} style={{ background: '#555' }} isConnectable={!data.isViewOnly} />
      <Handle type="target" position={Position.Right} id={`${id}-right-target`} style={{ background: '#555' }} isConnectable={!data.isViewOnly} />
      <Handle type="source" position={Position.Bottom} id={`${id}-bottom-source`} style={{ background: '#555' }} isConnectable={!data.isViewOnly} />
      <Handle type="target" position={Position.Bottom} id={`${id}-bottom-target`} style={{ background: '#555' }} isConnectable={!data.isViewOnly} />
      <Handle type="source" position={Position.Left} id={`${id}-left-source`} style={{ background: '#555' }} isConnectable={!data.isViewOnly} />
      <Handle type="target" position={Position.Left} id={`${id}-left-target`} style={{ background: '#555' }} isConnectable={!data.isViewOnly} />
    </div>
  );
};

export default memo(CustomNodeComponent);
    