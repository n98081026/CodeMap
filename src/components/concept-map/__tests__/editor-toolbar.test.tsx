import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EditorToolbar } from './editor-toolbar';

import { useConceptMapStore } from '@/stores/concept-map-store';

// Mock useConceptMapStore
vi.mock('@/stores/concept-map-store');

// Mock child components like modals that are not directly part of the toolbar's disable logic
vi.mock('@/components/concept-map/genai-modals', () => ({
  // Mock specific modals if they are direct children or their trigger is tested
  ExtractConceptsModal: () => (
    <div data-testid='extract-concepts-modal-trigger'></div>
  ),
  // Add other modals if their triggers are directly in EditorToolbar and tested
}));
vi.mock('@/components/concept-map/quick-cluster-modal', () => ({
  QuickClusterModal: () => (
    <div data-testid='quick-cluster-modal-trigger'></div>
  ),
}));
vi.mock('@/components/concept-map/generate-snippet-modal', () => ({
  GenerateSnippetModal: () => (
    <div data-testid='generate-snippet-modal-trigger'></div>
  ),
}));
vi.mock('@/components/concept-map/map-summary-modal', () => ({
  MapSummaryModal: () => <div data-testid='map-summary-modal-trigger'></div>,
}));

describe('EditorToolbar (/components/concept-map/editor-toolbar.tsx)', () => {
  const mockUndo = vi.fn();
  const mockRedo = vi.fn();
  // Add other mock handlers for props if needed for specific tests
  const defaultProps = {
    onNewMap: vi.fn(),
    onSaveMap: vi.fn(),
    onExportMap: vi.fn(),
    onAutoLayout: vi.fn(),
    onAddNode: vi.fn(),
    onUndo: mockUndo,
    onRedo: mockRedo,
    onTogglePropertiesInspector: vi.fn(),
    onToggleAISuggestionPanel: vi.fn(),
    isPropertiesInspectorOpen: false,
    isAISuggestionPanelOpen: false,
    isViewOnlyMode: false, // Default to not view-only
    // AI action handlers (simplified for this test focus)
    onExtractConcepts: vi.fn(),
    onSuggestRelations: vi.fn(),
    onExpandConcept: vi.fn(),
    onQuickCluster: vi.fn(),
    onGenerateSnippet: vi.fn(),
    onSummarizeSelection: vi.fn(),
    onRewriteNodeContent: vi.fn(),
    onAskQuestionAboutMap: vi.fn(),
    onSuggestMapImprovement: vi.fn(),
    onAITidyUpSelection: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default store state
    (useConceptMapStore as vi.Mock).mockReturnValue({
      canUndo: false,
      canRedo: false,
      hasStagedChanges: false,
      isGhostPreviewActive: false,
      mapTitle: 'Test Map',
      selectedNodes: [],
      selectedEdges: [],
    });
  });

  it('should have most action buttons enabled when not in view-only mode', () => {
    render(<EditorToolbar {...defaultProps} isViewOnlyMode={false} />);

    expect(
      screen.getByRole('button', { name: /save map/i })
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /add node/i })
    ).not.toBeDisabled();
    // Check a few AI tool trigger buttons by accessible name (e.g., tooltip)
    // Tooltips are often used for icon buttons, so need to query by tooltip text if possible, or by test-id if added.
    // For simplicity, let's assume they have aria-labels or accessible names.
    // If they are MenuItems, the query will be different.
    // The actual component uses DropdownMenu, so we test the trigger.
    expect(
      screen.getByRole('button', { name: /ai tools/i })
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /layout tools/i })
    ).not.toBeDisabled();
  });

  it('should disable most action buttons when isViewOnlyMode is true (guest viewing example)', () => {
    render(<EditorToolbar {...defaultProps} isViewOnlyMode={true} />);

    expect(screen.getByRole('button', { name: /save map/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /add node/i })).toBeDisabled();

    // DropdownMenu triggers themselves might not be disabled, but their items should be,
    // or the trigger action should be prevented. For simplicity, checking the trigger.
    // A more thorough test would open the menu and check item states.
    // Based on current code, the AI Tools and Layout Tools dropdown triggers are disabled.
    expect(screen.getByRole('button', { name: /ai tools/i })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /layout tools/i })
    ).toBeDisabled();

    // Undo/Redo should also be disabled
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled();

    // Non-mutating actions like "New Map" and "Export Map" might still be enabled.
    expect(screen.getByRole('button', { name: /new map/i })).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /export map/i })
    ).not.toBeDisabled();

    // Toggle buttons for side panels should still be enabled
    expect(
      screen.getByRole('button', { name: /toggle properties inspector/i })
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /toggle ai suggestion panel/i })
    ).not.toBeDisabled();
  });

  it('Undo and Redo buttons should be disabled based on canUndo/canRedo store state when not in view-only mode', () => {
    (useConceptMapStore as vi.Mock).mockReturnValue({
      canUndo: false,
      canRedo: false,
      hasStagedChanges: false,
      isGhostPreviewActive: false,
      mapTitle: 'Test Map',
      selectedNodes: [],
      selectedEdges: [],
    });
    render(<EditorToolbar {...defaultProps} isViewOnlyMode={false} />);
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled();

    // Update store mock and re-render or trigger update
    (useConceptMapStore as vi.Mock).mockReturnValue({
      canUndo: true,
      canRedo: true,
      hasStagedChanges: false,
      isGhostPreviewActive: false,
      mapTitle: 'Test Map',
      selectedNodes: [],
      selectedEdges: [],
    });
    // In a real scenario with context, re-rendering the hook/component would reflect this.
    // For this isolated component test, we'd typically re-render.
    render(<EditorToolbar {...defaultProps} isViewOnlyMode={false} />); // Re-render with new store state
    expect(screen.getByRole('button', { name: /undo/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /redo/i })).not.toBeDisabled();
  });
});
