import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

import { AISuggestionPanel } from '../ai-suggestion-panel';

import type { RelationSuggestion } from '../ai-suggestion-panel'; // Assuming RelationSuggestion is exported or defined locally for tests
import type { ExtractedConceptItem } from '@/ai/flows/extract-concepts';

import useConceptMapStore from '@/stores/concept-map-store';

// Mock Zustand store
vi.mock('@/stores/concept-map-store');

// Mock @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn((options) => {
    // Simple mock: just map over the items directly for rendering in tests
    const virtualItems = Array.from({ length: options.count }, (_, index) => ({
      index,
      start: index * options.estimateSize(),
      size: options.estimateSize(),
      measureRef: vi.fn(), // Corrected: measureRef to measureElement
    }));
    return {
      getVirtualItems: () => virtualItems,
      getTotalSize: () => options.count * options.estimateSize(),
      measureElement: vi.fn(), // Added measureElement to the return
    };
  }),
}));

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    GitFork: () => <svg data-testid='git-fork-icon' />,
    Brain: () => <svg data-testid='brain-icon' />,
    SearchCode: () => <svg data-testid='search-code-icon' />,
    Lightbulb: () => <svg data-testid='lightbulb-icon' />,
    PlusCircle: () => <svg data-testid='plus-circle-icon' />,
    Info: () => <svg data-testid='info-icon' />,
    MessageSquareDashed: () => <svg data-testid='message-square-dashed-icon' />,
    CheckSquare: () => <svg data-testid='check-square-icon' />,
    Edit3: () => <svg data-testid='edit3-icon' />,
    Zap: () => <svg data-testid='zap-icon' />,
    AlertCircle: () => <svg data-testid='alert-circle-icon' />,
    Trash2: () => <svg data-testid='trash2-icon' />,
  };
});

describe('AISuggestionPanel', () => {
  let mockSetDragPreview: vi.Mock;
  let mockClearDragPreview: vi.Mock;
  let mockSetDraggedRelationPreview: vi.Mock;

  const mockExtractedConcepts: ExtractedConceptItem[] = [
    { concept: 'Concept 1', context: 'Context A', source: 'Source X' },
    { concept: 'Concept 2', context: 'Context B' },
    { concept: 'Existing Concept', context: 'Context C' },
  ];

  const mockSuggestedRelations: RelationSuggestion[] = [
    {
      source: 'Node A',
      target: 'Node B',
      relation: 'connects to',
      reason: 'Reason AB',
    },
    { source: 'Node C', target: 'Node D', relation: 'leads to' },
  ];

  const mockCurrentMapNodes = [
    {
      id: 'node1',
      text: 'Existing Concept',
      type: 'concept',
      x: 0,
      y: 0,
      childIds: [],
    },
    { id: 'nodeA', text: 'Node A', type: 'concept', x: 0, y: 0, childIds: [] },
    // Node B is not on map for one test case
  ];

  beforeEach(() => {
    mockSetDragPreview = jest.fn();
    mockClearDragPreview = jest.fn();
    mockSetDraggedRelationPreview = jest.fn();

    (useConceptMapStore as unknown as jest.Mock).mockImplementation(
      (selector: any) => {
        const state = {
          setDragPreview: mockSetDragPreview,
          clearDragPreview: mockClearDragPreview,
          setDraggedRelationPreview: mockSetDraggedRelationPreview,
        };
        if (typeof selector === 'function') {
          return selector(state);
        }
        return state; // Should not happen with useCallback pattern in component
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders empty state when no suggestions are provided', () => {
    render(
      <AISuggestionPanel
        currentMapNodes={[]}
        extractedConcepts={[]}
        suggestedRelations={[]}
        onAddExtractedConcepts={jest.fn()}
        onAddSuggestedRelations={jest.fn()}
      />
    );
    expect(screen.getByText('No New Extracted Concepts')).toBeInTheDocument();
    expect(screen.getByText('No New Suggested Relations')).toBeInTheDocument();
  });

  describe('Extracted Concepts Section', () => {
    let mockOnAddExtractedConcepts: vi.Mock;
    let mockOnClearExtractedConcepts: vi.Mock;

    beforeEach(() => {
      mockOnAddExtractedConcepts = vi.fn();
      mockOnClearExtractedConcepts = vi.fn();
    });

    test('renders extracted concepts and their statuses', () => {
      render(
        <AISuggestionPanel
          currentMapNodes={mockCurrentMapNodes}
          extractedConcepts={mockExtractedConcepts}
          onAddExtractedConcepts={mockOnAddExtractedConcepts}
          onClearExtractedConcepts={mockOnClearExtractedConcepts}
        />
      );
      expect(screen.getByText('Concept 1')).toBeInTheDocument();
      expect(screen.getByText('Concept 2')).toBeInTheDocument();
      expect(screen.getByText('Existing Concept')).toBeInTheDocument();

      // Check status icons (simplified check by title)
      const concept1Item = screen
        .getByText('Concept 1')
        .closest('div[data-index]');
      expect(
        within(concept1Item!).getByTitle('New concept')
      ).toBeInTheDocument();

      const existingConceptItem = screen
        .getByText('Existing Concept')
        .closest('div[data-index]');
      expect(
        within(existingConceptItem!).getByTitle('Exact match on map')
      ).toBeInTheDocument();
    });

    test('allows selecting and adding new/similar concepts', () => {
      render(
        <AISuggestionPanel
          currentMapNodes={mockCurrentMapNodes}
          extractedConcepts={mockExtractedConcepts}
          onAddExtractedConcepts={mockOnAddExtractedConcepts}
        />
      );
      // Concept 1 is new
      const checkbox1 = screen
        .getByLabelText('Concept 1')
        .closest('.flex')
        ?.querySelector('input[type="checkbox"]');
      expect(checkbox1).not.toBeNull();
      fireEvent.click(checkbox1!);

      // Existing Concept should be disabled or not selectable for "Add" if it's an exact match
      const checkboxExisting = screen
        .getByText('Existing Concept')
        .closest('.flex')
        ?.querySelector('input[type="checkbox"]');
      expect(checkboxExisting).toBeDisabled();

      const addButton = screen.getByRole('button', { name: /Add Selected/i });
      fireEvent.click(addButton);

      expect(mockOnAddExtractedConcepts).toHaveBeenCalledWith([
        mockExtractedConcepts[0], // Only Concept 1
      ]);
    });

    test('"Select New/Similar" checkbox works for concepts', () => {
      render(
        <AISuggestionPanel
          currentMapNodes={mockCurrentMapNodes}
          extractedConcepts={mockExtractedConcepts} // Concept 1, Concept 2 are new/similar, Existing Concept is exact match
          onAddExtractedConcepts={mockOnAddExtractedConcepts}
        />
      );
      const selectAllNewCheckbox = screen.getByLabelText('Select New/Similar');
      fireEvent.click(selectAllNewCheckbox); // Check it

      const addButton = screen.getByRole('button', { name: /Add Selected/i });
      fireEvent.click(addButton);

      // Expect only non-exact matches to be passed
      expect(mockOnAddExtractedConcepts).toHaveBeenCalledWith([
        mockExtractedConcepts[0], // Concept 1
        mockExtractedConcepts[1], // Concept 2
      ]);
    });

    test('clear button calls onClearExtractedConcepts', () => {
      render(
        <AISuggestionPanel
          currentMapNodes={mockCurrentMapNodes}
          extractedConcepts={mockExtractedConcepts}
          onAddExtractedConcepts={mockOnAddExtractedConcepts}
          onClearExtractedConcepts={mockOnClearExtractedConcepts}
        />
      );
      const clearButton = screen.getByTitle(
        'Clear all Extracted Concepts suggestions'
      );
      fireEvent.click(clearButton);
      expect(mockOnClearExtractedConcepts).toHaveBeenCalled();
    });
  });

  describe('Suggested Relations Section', () => {
    let mockOnAddSuggestedRelations: vi.Mock;
    let mockOnClearSuggestedRelations: vi.Mock;

    beforeEach(() => {
      mockOnAddSuggestedRelations = vi.fn();
      mockOnClearSuggestedRelations = vi.fn();
    });

    test('renders suggested relations', () => {
      render(
        <AISuggestionPanel
          currentMapNodes={mockCurrentMapNodes}
          suggestedRelations={mockSuggestedRelations}
          onAddSuggestedRelations={mockOnAddSuggestedRelations}
        />
      );
      expect(screen.getByText('Node A')).toBeInTheDocument();
      expect(screen.getByText('Node B')).toBeInTheDocument();
      expect(screen.getByText('connects to')).toBeInTheDocument();
      expect(screen.getByText('Node C')).toBeInTheDocument();
      expect(screen.getByText('Node D')).toBeInTheDocument();
      expect(screen.getByText('leads to')).toBeInTheDocument();

      // Check node existence indicators
      const relation1Source = screen.getByText('Node A');
      expect(
        within(relation1Source).getByTitle('This node exists on the map')
      ).toBeInTheDocument();
      const relation2Target = screen.getByText('Node D'); // Node D does not exist in mockCurrentMapNodes
      expect(
        within(relation2Target).getByTitle(
          'This node does not exist or differs from map'
        )
      ).toBeInTheDocument();
    });

    test('allows selecting and adding relations', () => {
      render(
        <AISuggestionPanel
          currentMapNodes={mockCurrentMapNodes}
          suggestedRelations={mockSuggestedRelations}
          onAddSuggestedRelations={mockOnAddSuggestedRelations}
        />
      );
      // Select the first relation
      const checkbox1 = screen
        .getByText('Node A')
        .closest('.flex.items-center.text-sm.group')
        ?.querySelector('input[type="checkbox"]');
      expect(checkbox1).not.toBeNull();
      fireEvent.click(checkbox1!);

      const addButton = screen.getAllByRole('button', {
        name: /Add Selected/i,
      })[1]; // Second add button for relations
      fireEvent.click(addButton);

      expect(mockOnAddSuggestedRelations).toHaveBeenCalledWith([
        mockSuggestedRelations[0],
      ]);
    });
  });

  // TODO: Add tests for editing, drag & drop, view-only mode interactions in more detail
});
