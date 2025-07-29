/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { AuthProvider } from '@/contexts/auth-context';
import { EditorToolbar, EditorToolbarProps } from '../editor-toolbar';

// Mock child components
vi.mock('@/components/concept-map/genai-modals', () => ({
  // Mock specific modals if they are direct children or their trigger is tested
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    FilePlus: () => <div data-testid='file-plus-icon' />,
    Save: () => <div data-testid='save-icon' />,
    Share2: () => <div data-testid='share-icon' />,
    FileDown: () => <div data-testid='file-down-icon' />,
    FileUp: () => <div data-testid='file-up-icon' />,
    Undo2: () => <div data-testid='undo-icon' />,
    Redo2: () => <div data-testid='redo-icon' />,
    Plus: () => <div data-testid='plus-icon' />,
    Minus: () => <div data-testid='minus-icon' />,
    Layout: () => <div data-testid='layout-icon' />,
    BrainCircuit: () => <div data-testid='brain-circuit-icon' />,
    Sparkles: () => <div data-testid='sparkles-icon' />,
    PanelRightOpen: () => <div data-testid='panel-right-open-icon' />,
    Bot: () => <div data-testid='bot-icon' />,
    NotebookText: () => <div data-testid='notebook-text-icon' />,
  };
});

const renderWithAuthProvider = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

const defaultProps: EditorToolbarProps = {
  onNewMap: vi.fn(),
  onSaveMap: vi.fn(),
  isSaving: false,
  onExportMap: vi.fn(),
  onTriggerImport: vi.fn(),
  onExtractConcepts: vi.fn(),
  onSuggestRelations: vi.fn(),
  onExpandConcept: vi.fn(),
  onQuickCluster: vi.fn(),
  onGenerateSnippetFromText: vi.fn(),
  onSummarizeSelectedNodes: vi.fn(),
  isViewOnlyMode: false,
  onAddNodeToData: vi.fn(),
  onAddEdgeToData: vi.fn(),
  canAddEdge: true,
  onToggleProperties: vi.fn(),
  onToggleAiPanel: vi.fn(),
  onToggleDebugLogViewer: vi.fn(),
  isPropertiesPanelOpen: false,
  isAiPanelOpen: false,
  isDebugLogViewerOpen: false,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  canUndo: false,
  canRedo: false,
  selectedNodeId: null,
  numMultiSelectedNodes: 0,
};

describe('EditorToolbar (/components/concept-map/editor-toolbar.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have most action buttons enabled when not in view-only mode', async () => {
    renderWithAuthProvider(
      <EditorToolbar {...defaultProps} isViewOnlyMode={false} />
    );

    expect(screen.getByTitle('Save Map')).not.toBeDisabled();
    expect(screen.getByTitle('Add Node')).not.toBeDisabled();
  });

  it('should disable most action buttons when isViewOnlyMode is true', async () => {
    renderWithAuthProvider(
      <EditorToolbar {...defaultProps} isViewOnlyMode={true} />
    );

    expect(screen.getByTitle(/Save Map/i)).toBeDisabled();
    expect(screen.getByTitle(/Add Node/i)).toBeDisabled();

    // Undo/Redo should also be disabled
    expect(screen.getByTitle(/Undo/i)).toBeDisabled();
    expect(screen.getByTitle(/Redo/i)).toBeDisabled();

    // Non-mutating actions like "New Map" and "Export Map" might still be enabled.
    expect(screen.getByTitle('New map')).not.toBeDisabled();
    expect(screen.getByTitle('Export Map (JSON)')).not.toBeDisabled();

    // Toggle buttons for side panels should still be enabled
    expect(screen.getByTitle(/Show Properties/i)).not.toBeDisabled();
    expect(screen.getByTitle(/Show AI Suggestions/i)).not.toBeDisabled();
  });

  it('Undo and Redo buttons should be disabled based on canUndo/canRedo props', async () => {
    const { rerender } = renderWithAuthProvider(
      <EditorToolbar {...defaultProps} canUndo={false} canRedo={false} />
    );
    expect(screen.getByTitle(/Undo/i)).toBeDisabled();
    expect(screen.getByTitle(/Redo/i)).toBeDisabled();

    rerender(
      <AuthProvider>
        <EditorToolbar {...defaultProps} canUndo={true} canRedo={true} />
      </AuthProvider>
    );
    expect(screen.getByTitle(/Undo/i)).not.toBeDisabled();
    expect(screen.getByTitle(/Redo/i)).not.toBeDisabled();
  });
});
