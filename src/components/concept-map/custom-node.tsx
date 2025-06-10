
"use client";
import React, { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import useConceptMapStore from '@/stores/concept-map-store';
// Lucide icons removed for simplification, will be added back if basic rendering works.

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

const CustomNodeComponent: React.FC<NodeProps<CustomNodeData>> = ({ data, id, selected, xPos, yPos }) => {
  const {
    isViewOnlyMode: globalIsViewOnlyMode
  } = useConceptMapStore();

  const nodeIsViewOnly = data.isViewOnly || globalIsViewOnlyMode;

  const nodeStyle: React.CSSProperties = {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    background: data.backgroundColor || 'white', // Basic background
    width: data.width ? `${data.width}px` : '150px', // Basic width
    minHeight: data.height ? `${data.height}px` : '50px', // Basic height
    opacity: selected ? 0.8 : 1, // Example selection style
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontSize: '12px', // Basic font size
  };

  if (data.shape === 'ellipse') {
    nodeStyle.borderRadius = '50%';
    nodeStyle.width = data.width || data.height || 100; // Make ellipse a circle
    nodeStyle.height = nodeStyle.width;
    nodeStyle.display = 'flex';
    nodeStyle.alignItems = 'center';
    nodeStyle.justifyContent = 'center';
  }


  return (
    <div
      style={nodeStyle}
      className={cn(
        "nodrag relative shadow-md", // Basic classes
        selected ? "ring-2 ring-primary" : "",
        nodeIsViewOnly && "cursor-default",
        !nodeIsViewOnly && "cursor-grab"
      )}
      data-node-id={id}
    >
      <div>{data.label || "Untitled"}</div>

      {/* Basic Handles - Keep these for connectivity testing */}
      <Handle type="source" position={Position.Top} id={`${id}-top-source`} className="react-flow__handle-custom !-top-1" isConnectable={!nodeIsViewOnly} />
      <Handle type="target" position={Position.Top} id={`${id}-top-target`} className="react-flow__handle-custom !-top-1" isConnectable={!nodeIsViewOnly} />
      <Handle type="source" position={Position.Right} id={`${id}-right-source`} className="react-flow__handle-custom !-right-1" isConnectable={!nodeIsViewOnly} />
      <Handle type="target" position={Position.Right} id={`${id}-right-target`} className="react-flow__handle-custom !-right-1" isConnectable={!nodeIsViewOnly} />
      <Handle type="source" position={Position.Bottom} id={`${id}-bottom-source`} className="react-flow__handle-custom !-bottom-1" isConnectable={!nodeIsViewOnly} />
      <Handle type="target" position={Position.Bottom} id={`${id}-bottom-target`} className="react-flow__handle-custom !-bottom-1" isConnectable={!nodeIsViewOnly} />
      <Handle type="source" position={Position.Left} id={`${id}-left-source`} className="react-flow__handle-custom !-left-1" isConnectable={!nodeIsViewOnly} />
      <Handle type="target" position={Position.Left} id={`${id}-left-target`} className="react-flow__handle-custom !-left-1" isConnectable={!nodeIsViewOnly} />
    </div>
  );
};

export default memo(CustomNodeComponent);
