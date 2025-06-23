
"use client";

import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, HelpCircle } from "lucide-react"; 

import { extractConcepts as aiExtractConcepts } from "@/ai/flows/extract-concepts";
import { suggestRelations as aiSuggestRelations } from "@/ai/flows/suggest-relations";
import { expandConcept as aiExpandConcept, type ExpandConceptInput, type ExpandConceptOutput } from "@/ai/flows/expand-concept"; 
import { askQuestionAboutNode as aiAskQuestionAboutNode, type AskQuestionAboutNodeOutput, type AskQuestionAboutNodeInput } from "@/ai/flows/ask-question-about-node";

interface ModalProps {
  onOpenChange: (isOpen: boolean) => void; 
}

interface ExtractConceptsModalProps extends ModalProps {
  onConceptsExtracted?: (concepts: string[]) => void;
  initialText?: string; 
}

export function ExtractConceptsModal({ onConceptsExtracted, initialText = "", onOpenChange }: ExtractConceptsModalProps) {
  const [text, setText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleExtract = async () => {
    if (!text.trim()) {
      toast({ title: "Input Required", description: "Please enter some text to extract concepts.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await aiExtractConcepts({ text });
      toast({ title: "AI: Concepts Ready", description: `${result.concepts.length} concepts found. View them in the AI Suggestions panel.` });
      onConceptsExtracted?.(result.concepts);
      onOpenChange(false); 
    } catch (error) {
      toast({ title: "Error Extracting Concepts", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => {
      if (!isOpen) setText(""); 
      onOpenChange(isOpen);
    }}> 
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI 幫你抓重點 (Extract Concepts)</DialogTitle>
          <DialogDescription>
            把一段文字貼進來，或者直接使用選中節點的內容。AI 會自動幫你找出裡面最重要的詞彙或短語，並顯示在「AI 建議」面板中，方便你加到概念圖裡。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="在這裡貼上你想分析的文字，比如一段專案介紹、功能需求，或者任何文章段落..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="resize-none"
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExtract} disabled={isLoading || !text.trim()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCode className="mr-2 h-4 w-4" />} {/* Added icon */}
            開始提取重點
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SuggestRelationsModalProps extends ModalProps {
  onRelationsSuggested?: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  initialConcepts?: string[];
}

export function SuggestRelationsModal({ onRelationsSuggested, initialConcepts = [], onOpenChange }: SuggestRelationsModalProps) {
  const [conceptsInput, setConceptsInput] = useState(initialConcepts.join(", "));
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setConceptsInput(initialConcepts.join(", "));
  }, [initialConcepts]);

  const handleSuggest = async () => {
    const concepts = conceptsInput.split(",").map(c => c.trim()).filter(Boolean);
    if (concepts.length === 0) {
      toast({ title: "Input Required", description: "Please provide at least one concept.", variant: "destructive" });
      return;
    }
    if (concepts.length < 2 && concepts.length > 0) { 
      toast({ title: "More Concepts Recommended", description: "For best results with relation suggestions, provide at least two concepts. The AI will try its best with the current input.", variant: "default" });
    }
    setIsLoading(true);
    try {
      const result = await aiSuggestRelations({ concepts });
      toast({ title: "AI: Relations Ready", description: `${result.length} relations suggested. View them in the AI Suggestions panel.` });
      onRelationsSuggested?.(result);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error Suggesting Relations", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={(isOpen) => {
      if (!isOpen) setConceptsInput(""); 
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI 幫你連連看 (Suggest Relations)</DialogTitle>
          <DialogDescription>
            輸入一些相關的詞彙或想法（例如從選中的節點來的），AI 會試著找出它們之間可能存在的關聯，並在「AI 建議」面板中給你建議。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="concepts-sr">你的詞彙或想法 (用逗號分隔)</Label>
          <Textarea 
            id="concepts-sr" 
            value={conceptsInput} 
            onChange={(e) => setConceptsInput(e.target.value)}
            placeholder="例如：學習 Python, 寫小遊戲, 資料分析"
            rows={3}
            className="resize-none"
            disabled={isLoading}
          />
           <p className="text-xs text-muted-foreground">請用逗號隔開每個詞彙。建議至少輸入兩個，AI 才能更好地幫你找出關聯哦！</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSuggest} disabled={isLoading || conceptsInput.trim().length === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />} {/* Added icon */}
            開始建議關聯
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ExpandConceptModalProps extends ModalProps {
  onConceptExpanded?: (output: ExpandConceptOutput) => Promise<void>; 
  initialConceptText?: string; 
  existingMapContext?: string[];
}

export function ExpandConceptModal({ onConceptExpanded, initialConceptText = "", existingMapContext = [], onOpenChange }: ExpandConceptModalProps) {
  const [concept, setConcept] = useState(initialConceptText);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setConcept(initialConceptText);
    setRefinementPrompt(""); 
  }, [initialConceptText]);

  const handleExpand = async () => {
    if (!concept.trim()) {
      toast({ title: "Input Required", description: "Please enter a concept to expand.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const input: ExpandConceptInput = { concept, existingMapContext };
      if (refinementPrompt.trim()) {
        input.userRefinementPrompt = refinementPrompt.trim();
      }
      const result = await aiExpandConcept(input);
      if (onConceptExpanded) {
        await onConceptExpanded(result); 
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error Expanding Concept", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setConcept(""); 
        setRefinementPrompt("");
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI 幫你想更多 (Expand Concept)</DialogTitle>
          <DialogDescription>
            輸入一個詞彙或想法，AI 會幫你聯想更多相關的點子，並自動加到概念圖上，成為目前所選節點的子節點。如果不滿意，你隨時可以「復原」(Undo) 操作。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="concept-ec">要深入思考的詞彙/想法</Label>
            <Input 
              id="concept-ec" 
              value={concept} 
              onChange={(e) => setConcept(e.target.value)} 
              placeholder="例如：人工智慧、專案管理、學習新技能"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="refinement-prompt-ec">引導 AI 的方向 (選填)</Label>
            <Textarea
              id="refinement-prompt-ec"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="例如：多想一些優點、有哪些應用場景、跟『學習效率』有什麼關係？"
              rows={3}
              className="resize-none"
              disabled={isLoading}
            />
          </div>
          {existingMapContext.length > 0 && (
            <div className="text-xs text-muted-foreground p-2 border rounded-md bg-muted/50">
              <strong>Context from map:</strong> {existingMapContext.length} node(s) like "{existingMapContext[0]}"{existingMapContext.length > 1 ? ` and ${existingMapContext.length-1} other(s)` : ''}.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExpand} disabled={isLoading || !concept.trim()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />} {/* Added icon */}
            開始擴展想法
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AskQuestionModalProps extends ModalProps {
  nodeContext: { text: string; details?: string; id: string; } | null;
  onQuestionAnswered: (question: string, nodeContext: { text: string; details?: string; id: string; }) => Promise<void>;
}

export function AskQuestionModal({ nodeContext, onQuestionAnswered, onOpenChange }: AskQuestionModalProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAskQuestion = useCallback(async () => {
    if (!question.trim() || !nodeContext) {
      toast({ title: "Input Required", description: "Please enter your question and ensure a node context is available.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await onQuestionAnswered(question, nodeContext); 
      onOpenChange(false); 
    } catch (error) {
      // Error toast is handled in onQuestionAnswered (via useConceptMapAITools)
    } finally {
      setIsLoading(false);
    }
  }, [question, nodeContext, onQuestionAnswered, onOpenChange, toast]);

  return (
    <Dialog open={true} onOpenChange={(isOpen) => {
      if (!isOpen) setQuestion(""); 
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HelpCircle className="mr-2 h-5 w-5 text-primary" /> 對 AI 提問關於這個節點
          </DialogTitle>
          {nodeContext && (
            <DialogDescription>
              你正在問關於節點： <strong className="text-foreground">{nodeContext.text}</strong>
              {nodeContext.details && <span className="block text-xs text-muted-foreground mt-1">Details: {nodeContext.details}</span>}
              <br />The AI's answer will be shown in a toast notification. The node itself will not be modified by this action.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="ai-question">Your Question:</Label>
          <Textarea
            id="ai-question"
            placeholder="例如：這個概念主要用途是什麼？能不能用更簡單的方式解釋一下？"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={isLoading || !nodeContext}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleAskQuestion} disabled={isLoading || !question.trim() || !nodeContext}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} {/* Added icon */}
            傳送問題
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

