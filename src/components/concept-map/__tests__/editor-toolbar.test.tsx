/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { EditorToolbar, EditorToolbarProps } from '../editor-toolbar';

// Mock child components
vi.mock('@/components/concept-map/genai-modals', () => ({
  // Mock specific modals if they are direct children or their trigger is tested
}));


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

describe.skip('EditorToolbar (/components/concept-map/editor-toolbar.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have most action buttons enabled when not in view-only mode', () => {
    render(<EditorToolbar {...defaultProps} isViewOnlyMode={false} />);

    expect(
      screen.getByRole('button', { name: /Save/i })
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Add Node/i })
    ).not.toBeDisabled();
  });

  it('should disable most action buttons when isViewOnlyMode is true', () => {
    render(<EditorToolbar {...defaultProps} isViewOnlyMode={true} />);

    expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Add Node/i })).toBeDisabled();

    // Undo/Redo should also be disabled
    expect(screen.getByRole('button', { name: /Undo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Redo/i })).toBeDisabled();

    // Non-mutating actions like "New Map" and "Export Map" might still be enabled.
    expect(screen.getByRole('button', { name: /New/i })).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Export/i })
    ).not.toBeDisabled();

    // Toggle buttons for side panels should still be enabled
    expect(
      screen.getByRole('button', { name: /Properties/i })
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /AI Panel/i })
    ).not.toBeDisabled();
  });

  it('Undo and Redo buttons should be disabled based on canUndo/canRedo props', () => {
    const { rerender } = render(<EditorToolbar {...defaultProps} canUndo={false} canRedo={false} />);
    expect(screen.getByRole('button', { name: /Undo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Redo/i })).toBeDisabled();

    rerender(<EditorToolbar {...defaultProps} canUndo={true} canRedo={true} />);
    expect(screen.getByRole('button', { name: /Undo/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Redo/i })).not.toBeDisabled();
  });
});
