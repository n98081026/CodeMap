
"use client";
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2, Brain, Lightbulb, SearchCode, HelpCircle, Sparkles, TextSearch, MessageSquareQuote } from 'lucide-react'; 

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
  onDeleteNode: (nodeId: string) => void;
  onExpandConcept: (nodeId: string) => void;
  onSuggestRelations: (nodeId: string) => void;
  onExtractConcepts: (nodeId: string) => void;
  onAskQuestion: (nodeId: string) => void; 
  onRewriteContent: (nodeId: string) => void;
  isViewOnlyMode?: boolean;
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  x,
  y,
  nodeId,
  onClose,
  onDeleteNode,
  onExpandConcept,
  onSuggestRelations,
  onExtractConcepts,
  onAskQuestion, 
  onRewriteContent,
  isViewOnlyMode,
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null);

  const handleDelete = () => {
    if (isViewOnlyMode) return;
    onDeleteNode(nodeId);
    onClose();
  };

  const handleExpand = () => {
    if (isViewOnlyMode) return;
    onExpandConcept(nodeId);
    onClose();
  };

  const handleSuggest = () => {
    if (isViewOnlyMode) return;
    onSuggestRelations(nodeId);
    onClose();
  };

  const handleExtract = () => { 
    if (isViewOnlyMode) return;
    onExtractConcepts(nodeId);
    onClose();
  };

  const handleAsk = () => { 
    if (isViewOnlyMode) return;
    onAskQuestion(nodeId);
    onClose();
  };

  const handleRewrite = () => {
    if (isViewOnlyMode) return;
    onRewriteContent(nodeId);
    onClose();
  }

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
      <Card className="w-64 shadow-xl border bg-popover text-popover-foreground">
        <CardContent className="p-1 space-y-1">
           <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1.5 text-sm"
            onClick={handleExtract} 
            disabled={isViewOnlyMode}
          >
            <SearchCode className="mr-2 h-4 w-4 text-blue-500" />
            Extract Concepts (AI)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1.5 text-sm"
            onClick={handleExpand}
            disabled={isViewOnlyMode}
          >
            <Brain className="mr-2 h-4 w-4 text-purple-500" />
            Expand Concept (AI)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1.5 text-sm"
            onClick={handleSuggest}
            disabled={isViewOnlyMode}
          >
            <Lightbulb className="mr-2 h-4 w-4 text-yellow-500" />
            Suggest Relations (AI)
          </Button>
           <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1.5 text-sm"
            onClick={handleAsk}
            disabled={isViewOnlyMode}
          >
            <HelpCircle className="mr-2 h-4 w-4 text-green-500" />
            Ask AI Question...
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1.5 text-sm"
            onClick={handleRewrite}
            disabled={isViewOnlyMode}
          >
            <MessageSquareQuote className="mr-2 h-4 w-4 text-indigo-500" />
            Rewrite Content (AI)...
          </Button>
          <Separator />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1.5 text-sm text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isViewOnlyMode}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Node
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

