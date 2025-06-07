
"use client";
import React, { memo, useEffect, useRef } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import useConceptMapStore from '@/stores/concept-map-store';
import {
  Box, Milestone, ServerCog, MonitorPlay, Database, FileCode2, ExternalLink, Users, Workflow,
  Brain, Lightbulb, Puzzle, AlignLeft, PenLine, PlusCircle, Loader2
} from 'lucide-react';
import { getNodePlacement } from '@/lib/layout-utils';

export interface CustomNodeData {
  label: string;
  details?: string;
  type?: string;
  isViewOnly?: boolean;
  backgroundColor?: string;
  shape?: 'rectangle' | 'ellipse';
  width?: number; // Explicit width from store/user
  height?: number; // Explicit height from store/user
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
  'ai-rewritten-node': 'bg-gray-100 dark:bg-gray-800/50 border-gray-400 dark:border-gray-500 text-gray-800 dark:text-gray-300',
  'manual-node': 'bg-sky-100 dark:bg-sky-900/50 border-sky-500 dark:border-sky-600 text-sky-900 dark:text-sky-200',
  'text-derived-concept': 'bg-lime-100 dark:bg-lime-900/50 border-lime-500 dark:border-lime-600 text-lime-900 dark:text-lime-200',
  'ai-generated': 'bg-rose-100 dark:bg-rose-900/50 border-rose-500 dark:border-rose-600 text-rose-900 dark:text-rose-200',
  default: 'bg-card border-border text-card-foreground',
};

const nodeTypeIcons: { [key: string]: React.ElementType } = {
  key_feature: Milestone, service_component: ServerCog, ui_view: MonitorPlay, data_model: Database, code_module: FileCode2,
  external_dependency: ExternalLink, user_role: Users, core_process: Workflow, 'ai-concept': Brain, 'ai-expanded': Lightbulb,
  'ai-summary-node': AlignLeft, 'ai-rewritten-node': PenLine, 'manual-node': Puzzle, 'text-derived-concept': FileCode2, 'ai-generated': Brain, default: Box,
};

const GRID_SIZE_FOR_CHILD_PLACEMENT = 20;

const CustomNodeComponent: React.FC<NodeProps<CustomNodeData>> = ({ data, selected, isConnectable, id, xPos, yPos, width, height }) => {
  const { editingNodeId, setEditingNodeId, updateNode, addNode, addEdge, aiProcessingNodeId, setSelectedElement } = useConceptMapStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const isCurrentNodeEditing = editingNodeId === id && !data.isViewOnly;
  const isCurrentNodeAiProcessing = aiProcessingNodeId === id;

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
    if (e.key === 'Escape') {
      setEditingNodeId(null);
    }
  };

  const handleCreateChild = (direction: 'top' | 'right' | 'bottom' | 'left') => {
    if (data.isViewOnly || isCurrentNodeAiProcessing) return;

    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const parentNodeFromProps = {
      id, x: xPos, y: yPos, width, height, text: data.label, type: data.type || 'default'
    };
    
    const childPosition = getNodePlacement(currentNodes, 'child', parentNodeFromProps, null, GRID_SIZE_FOR_CHILD_PLACEMENT);
    
    const newChildNodeId = addNode({ text: "New Idea", type: 'manual-node', position: childPosition, parentNode: id });
    addEdge({ source: id, target: newChildNodeId, label: "connects" });
    setSelectedElement(newChildNodeId, 'node');
    setEditingNodeId(newChildNodeId);
  };

  const baseStyle = "shadow-md transition-all duration-150 ease-in-out border-2 flex flex-col";
  const selectedStyle = selected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background shadow-2xl" : "hover:shadow-xl";
  
  const typeClass = nodeTypeStyles[data.type || 'default'] || nodeTypeStyles.default;
  const customBgStyle = data.backgroundColor ? { backgroundColor: data.backgroundColor } : {};
  
  const shapeClass = data.shape === 'ellipse' ? 'rounded-full' : 'rounded-lg';

  const explicitSizeStyle = {
    width: data.width ? `${data.width}px` : undefined,
    height: data.height ? `${data.height}px` : undefined,
  };
  
  const IconComponent = nodeTypeIcons[data.type || 'default'] || nodeTypeIcons.default;

  const handleBaseStyle = { width: 8, height: 8, transition: 'all 0.2s ease', pointerEvents: 'all' as React.CSSProperties['pointerEvents'] };
  const handlePositions = [
    { position: Position.Top, idSuffix: 'top' }, { position: Position.Bottom, idSuffix: 'bottom' },
    { position: Position.Left, idSuffix: 'left' }, { position: Position.Right, idSuffix: 'right' },
  ];

  const plusButtonPositions = [
    { direction: 'top', style: { top: -12, left: '50%', transform: 'translateX(-50%)' } },
    { direction: 'bottom', style: { bottom: -12, left: '50%', transform: 'translateX(-50%)' } },
    { direction: 'left', style: { left: -12, top: '50%', transform: 'translateY(-50%)' } },
    { direction: 'right', style: { right: -12, top: '50%', transform: 'translateY(-50%)' } },
  ] as const;

  return (
    <Card
      className={cn(
        baseStyle, selectedStyle, typeClass, shapeClass, 
        'group relative', 
        isCurrentNodeAiProcessing && 'opacity-70',
        !data.width && 'min-w-[150px] max-w-xs', 
        !data.height && 'min-h-[70px]' 
      )}
      style={{...customBgStyle, ...explicitSizeStyle }}
    >
      {isCurrentNodeAiProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm z-10 rounded-[inherit]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <CardHeader
        className={cn("p-2.5 border-b border-[inherit] cursor-move flex flex-row items-center space-x-2 shrink-0", shapeClass === 'rounded-full' ? 'rounded-t-full' : 'rounded-t-lg')}
        style={{ pointerEvents: 'all' }}
      >
        <IconComponent className="h-4 w-4 text-[inherit] opacity-80 flex-shrink-0" />
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
          <CardTitle
            className={cn("text-sm font-semibold text-center whitespace-normal break-words flex-grow min-w-0", data.isViewOnly ? "" : "cursor-text")}
            onDoubleClick={() => !data.isViewOnly && setEditingNodeId(id)}
          >
            {data.label || 'Node'}
          </CardTitle>
        )}
      </CardHeader>
      {data.details && (
        <CardContent className={cn("p-2.5 text-xs text-[inherit] opacity-90 whitespace-normal break-words flex-grow", !data.height && "max-h-32 overflow-y-auto")}>
          {data.details}
        </CardContent>
      )}
      {!data.details && <div className="flex-grow"></div>} 


      {handlePositions.map(hp => (
        <React.Fragment key={hp.idSuffix}>
          <Handle type="source" position={hp.position} id={`${id}-${hp.idSuffix}-source`} style={handleBaseStyle} isConnectable={isConnectable} className="react-flow__handle-custom" />
          <Handle type="target" position={hp.position} id={`${id}-${hp.idSuffix}-target`} style={handleBaseStyle} isConnectable={isConnectable} className="react-flow__handle-custom" />
        </React.Fragment>
      ))}

      {!data.isViewOnly && !isCurrentNodeAiProcessing && plusButtonPositions.map(btn => (
        <button
          key={btn.direction}
          onClick={() => handleCreateChild(btn.direction)}
          className="absolute z-10 flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          style={btn.style as React.CSSProperties}
          title={`Add child node ${btn.direction}`}
        >
          <PlusCircle className="w-3 h-3" />
        </button>
      ))}
    </Card>
  );
};

export default memo(CustomNodeComponent);
