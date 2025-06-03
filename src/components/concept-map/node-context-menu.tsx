
"use client";
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
  onDeleteNode: (nodeId: string) => void;
  isViewOnlyMode?: boolean;
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  x,
  y,
  nodeId,
  onClose,
  onDeleteNode,
  isViewOnlyMode,
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null);

  const handleDelete = () => {
    if (isViewOnlyMode) return;
    onDeleteNode(nodeId);
    onClose();
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div ref={menuRef} className="absolute z-[100]" style={{ top: y, left: x }}>
      <Card className="w-48 shadow-xl border bg-popover text-popover-foreground">
        <CardContent className="p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1.5 text-sm"
            onClick={handleDelete}
            disabled={isViewOnlyMode}
          >
            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
            Delete Node
          </Button>
          {/* Future actions can be added here */}
          {/* <DropdownMenuSeparator />
          <Button variant="ghost" size="sm" className="w-full justify-start px-2 py-1.5 text-sm">
            <Edit3 className="mr-2 h-4 w-4" /> Edit Label
          </Button> */}
        </CardContent>
      </Card>
    </div>
  );
};
