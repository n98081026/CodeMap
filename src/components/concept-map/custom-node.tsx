
"use client";
import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Box, // Default
  Milestone, // key_feature
  ServerCog, // service_component
  MonitorPlay, // ui_view
  Database, // data_model
  FileCode2, // code_module
  ExternalLink, // external_dependency
  Users, // user_role
  Workflow, // core_process
  Brain, // ai-extracted-concept, ai-concept
  Lightbulb, // ai-expanded, ai-concept
  Puzzle, // manual-node
  AlignLeft // ai-summary-node
} from 'lucide-react';

// Data expected by our custom node
export interface CustomNodeData {
  label: string;
  details?: string;
  type?: string; 
}

const nodeTypeStyles: { [key: string]: string } = {
  key_feature: 'bg-blue-100 dark:bg-blue-900/50 border-blue-500 dark:border-blue-600 text-blue-900 dark:text-blue-200',
  service_component: 'bg-green-100 dark:bg-green-900/50 border-green-500 dark:border-green-600 text-green-900 dark:text-green-200',
  ui_view: 'bg-purple-100 dark:bg-purple-900/50 border-purple-500 dark:border-purple-600 text-purple-900 dark:text-purple-200',
  data_model: 'bg-yellow-100 dark:bg-yellow-800/50 border-yellow-500 dark:border-yellow-600 text-yellow-900 dark:text-yellow-200',
  code_module: 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200',
  external_dependency: 'bg-pink-100 dark:bg-pink-900/50 border-pink-500 dark:border-pink-600 text-pink-900 dark:text-pink-200',
  user_role: 'bg-teal-100 dark:bg-teal-900/50 border-teal-500 dark:border-teal-600 text-teal-900 dark:text-teal-200',
  core_process: 'bg-orange-100 dark:bg-orange-800/50 border-orange-500 dark:border-orange-600 text-orange-900 dark:text-orange-200',
  'ai-concept': 'bg-slate-100 dark:bg-slate-700/50 border-slate-400 dark:border-slate-500 text-slate-800 dark:text-slate-300',
  'ai-expanded': 'bg-fuchsia-100 dark:bg-fuchsia-900/50 border-fuchsia-500 dark:border-fuchsia-600 text-fuchsia-900 dark:text-fuchsia-200',
  'ai-summary-node': 'bg-cyan-100 dark:bg-cyan-900/50 border-cyan-500 dark:border-cyan-600 text-cyan-900 dark:text-cyan-200',
  'manual-node': 'bg-sky-100 dark:bg-sky-900/50 border-sky-500 dark:border-sky-600 text-sky-900 dark:text-sky-200',
  'text-derived-concept': 'bg-lime-100 dark:bg-lime-900/50 border-lime-500 dark:border-lime-600 text-lime-900 dark:text-lime-200',
  'ai-generated': 'bg-rose-100 dark:bg-rose-900/50 border-rose-500 dark:border-rose-600 text-rose-900 dark:text-rose-200',
  default: 'bg-card border-border text-card-foreground',
};

const nodeTypeIcons: { [key: string]: React.ElementType } = {
  key_feature: Milestone,
  service_component: ServerCog,
  ui_view: MonitorPlay,
  data_model: Database,
  code_module: FileCode2,
  external_dependency: ExternalLink,
  user_role: Users,
  core_process: Workflow,
  'ai-concept': Brain,
  'ai-expanded': Lightbulb,
  'ai-summary-node': AlignLeft,
  'manual-node': Puzzle,
  'text-derived-concept': FileCode2, 
  'ai-generated': Brain,
  default: Box,
};


const CustomNodeComponent: React.FC<NodeProps<CustomNodeData>> = ({ data, selected, isConnectable, id }) => {
  const baseStyle = "shadow-md rounded-lg transition-all duration-150 ease-in-out border-2";
  const selectedStyle = selected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background shadow-2xl" : "hover:shadow-xl";
  const typeSpecificStyle = nodeTypeStyles[data.type || 'default'] || nodeTypeStyles['default'];
  const IconComponent = nodeTypeIcons[data.type || 'default'] || nodeTypeIcons['default'];

  const handleBaseStyle = {
    width: 8,
    height: 8,
    transition: 'all 0.2s ease',
    pointerEvents: 'all' as React.CSSProperties['pointerEvents'], 
  };

  const handlePositions = [
    { position: Position.Top, idSuffix: 'top' },
    { position: Position.Bottom, idSuffix: 'bottom' },
    { position: Position.Left, idSuffix: 'left' },
    { position: Position.Right, idSuffix: 'right' },
  ];

  return (
    <Card className={cn(baseStyle, selectedStyle, typeSpecificStyle, 'min-w-[160px] max-w-[280px] group')}>
      <CardHeader 
        className={cn(
          "p-2.5 border-b border-[inherit] cursor-move flex flex-row items-center space-x-2",
          data.type && nodeTypeStyles[data.type] ? 'bg-opacity-20' : '' // Keep slight tint for header based on node type
        )}
        style={{ pointerEvents: 'all' }} 
      >
        <IconComponent className="h-4 w-4 text-[inherit] opacity-80 flex-shrink-0" />
        <CardTitle className="text-sm font-semibold text-center truncate group-hover:whitespace-normal flex-grow min-w-0">
          {data.label || 'Node'}
        </CardTitle>
      </CardHeader>
      {data.details && (
        <CardContent className="p-2.5 text-xs text-[inherit] opacity-90 truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:text-clip max-h-20 overflow-y-auto">
          {data.details}
        </CardContent>
      )}

      {handlePositions.map(hp => (
        <React.Fragment key={hp.idSuffix}>
          <Handle
            type="source"
            position={hp.position}
            id={`${id}-${hp.idSuffix}-source`}
            style={{
              ...handleBaseStyle,
              ...(hp.position === Position.Top && { top: '-5px' }),
              ...(hp.position === Position.Bottom && { bottom: '-5px' }),
              ...(hp.position === Position.Left && { left: '-5px' }),
              ...(hp.position === Position.Right && { right: '-5px' }),
            }}
            isConnectable={isConnectable}
            className="react-flow__handle-custom"
          />
          <Handle
            type="target"
            position={hp.position}
            id={`${id}-${hp.idSuffix}-target`}
             style={{
              ...handleBaseStyle,
              ...(hp.position === Position.Top && { top: '-5px' }),
              ...(hp.position === Position.Bottom && { bottom: '-5px' }),
              ...(hp.position === Position.Left && { left: '-5px' }),
              ...(hp.position === Position.Right && { right: '-5px' }),
            }}
            isConnectable={isConnectable}
            className="react-flow__handle-custom"
          />
        </React.Fragment>
      ))}
    </Card>
  );
};

export default memo(CustomNodeComponent);
