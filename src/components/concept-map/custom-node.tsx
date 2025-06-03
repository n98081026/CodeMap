
"use client";
import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Data expected by our custom node
export interface CustomNodeData {
  label: string;
  details?: string;
  type?: string; // e.g., 'key_feature', 'service_component' - can be used for styling later
}

const CustomNodeComponent: React.FC<NodeProps<CustomNodeData>> = ({ data, selected, isConnectable, id }) => {
  const nodeTypeStyles: { [key: string]: string } = {
    key_feature: 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-700',
    service_component: 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-700',
    ui_view: 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 dark:border-purple-700',
    data_model: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 dark:border-yellow-700',
    code_module: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-700',
    external_dependency: 'bg-pink-100 dark:bg-pink-900/30 border-pink-500 dark:border-pink-700',
    user_role: 'bg-teal-100 dark:bg-teal-900/30 border-teal-500 dark:border-teal-700',
    core_process: 'bg-orange-100 dark:bg-orange-900/30 border-orange-500 dark:border-orange-700',
    'ai-extracted-concept': 'bg-gray-100 dark:bg-gray-700/30 border-gray-400 dark:border-gray-600',
    'ai-concept': 'bg-gray-100 dark:bg-gray-700/30 border-gray-400 dark:border-gray-600',
    'manual-node': 'bg-sky-100 dark:bg-sky-900/30 border-sky-500 dark:border-sky-700',
    default: 'bg-card border-border',
  };

  const baseStyle = "shadow-md rounded-lg transition-all duration-150 ease-in-out border";
  const selectedStyle = selected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background" : "hover:shadow-xl";
  const typeSpecificStyle = nodeTypeStyles[data.type || 'default'] || nodeTypeStyles['default'];

  // Handle style - subtle, appears more on hover/focus
  const handleBaseStyle = {
    width: 8,
    height: 8,
    background: 'hsl(var(--muted))', // Muted background
    border: '1px solid hsl(var(--border))',
    borderRadius: '2px',
    transition: 'all 0.2s ease',
  };
  const handleHoverStyle = { // To be applied via CSS :hover if possible, or JS if complex
    background: 'hsl(var(--primary))',
    boxShadow: '0 0 5px hsl(var(--primary))',
  };


  return (
    <Card className={cn(baseStyle, selectedStyle, typeSpecificStyle, 'min-w-[160px] max-w-[280px] group nodrag')}>
      <CardHeader className="p-2.5 border-b border-[inherit] cursor-move nodrag">
        <CardTitle className="text-sm font-medium text-center truncate group-hover:whitespace-normal">
          {data.label || 'Node'}
        </CardTitle>
      </CardHeader>
      {data.details && (
        <CardContent className="p-2.5 text-xs text-muted-foreground truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:text-clip max-h-20 overflow-y-auto">
          {data.details}
        </CardContent>
      )}

      {/* Handles - these act as both source and target */}
      <Handle
        type="source" // Also target by default
        position={Position.Top}
        id={`${id}-top`}
        style={{ ...handleBaseStyle, top: '-4px' }}
        isConnectable={isConnectable}
        className="react-flow__handle-custom"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${id}-bottom`}
        style={{ ...handleBaseStyle, bottom: '-4px' }}
        isConnectable={isConnectable}
        className="react-flow__handle-custom"
      />
      <Handle
        type="source"
        position={Position.Left}
        id={`${id}-left`}
        style={{ ...handleBaseStyle, left: '-4px' }}
        isConnectable={isConnectable}
        className="react-flow__handle-custom"
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-right`}
        style={{ ...handleBaseStyle, right: '-4px' }}
        isConnectable={isConnectable}
        className="react-flow__handle-custom"
      />
    </Card>
  );
};

export default memo(CustomNodeComponent);
