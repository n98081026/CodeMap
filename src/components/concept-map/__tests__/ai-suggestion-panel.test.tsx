import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

import {
  AISuggestionPanel,
  AISuggestionPanelProps,
} from '../ai-suggestion-panel';
import type {
  ExtractedConceptItem,
  RelationSuggestion,
} from '../ai-suggestion-panel';
import { ConceptMapNode } from '@/types';

// Mock child components for isolation
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

// Mock for lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Check: () => <div data-testid='check-icon' />,
    PlusCircle: () => <div data-testid='plus-circle-icon' />,
    GitFork: () => <div data-testid='git-fork-icon' />,
    Search: () => <div data-testid='search-icon' />,
    Lightbulb: () => <div data-testid='lightbulb-icon' />,
    Trash2: () => <div data-testid='trash-icon' />,
    CheckSquare: () => <div data-testid='check-square-icon' />,
    AlertCircle: () => <div data-testid='alert-circle-icon' />,
  };
});

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn((opts) => {
    const virtualItems = Array.from({ length: opts.count }).map((_, index) => ({
      index,
      start: index * opts.estimateSize(),
      size: opts.estimateSize(),
      measureElement: vi.fn(),
    }));

    return {
      getVirtualItems: () => virtualItems,
      getTotalSize: () => opts.count * opts.estimateSize(),
      measureElement: vi.fn(),
    };
  }),
}));

// Sample data for testing
const mockConcepts: ExtractedConceptItem[] = [
  { concept: 'React Hooks', context: 'Core concept of React' },
  { concept: 'State Management', context: 'Key for dynamic UIs' },
];

const mockRelations: RelationSuggestion[] = [
  {
    source: 'Component',
    target: 'Hook',
    relation: 'uses',
    reason: 'Components use hooks for state.',
  },
  {
    source: 'Hook',
    target: 'State',
    relation: 'manages',
    reason: 'Hooks manage component state.',
  },
];

describe('AISuggestionPanel', () => {
  const onAddExtractedConcepts = vi.fn();
  const onAddSuggestedRelations = vi.fn();
  const onClearExtractedConcepts = vi.fn();
  const onClearSuggestedRelations = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps: AISuggestionPanelProps = {
    currentMapNodes: [
      {
        id: 'n1',
        text: 'Component',
        type: 'default',
        x: 0,
        y: 0,
        childIds: [],
      },
      { id: 'n2', text: 'Hook', type: 'default', x: 0, y: 0, childIds: [] },
      { id: 'n3', text: 'State', type: 'default', x: 0, y: 0, childIds: [] },
    ] as ConceptMapNode[],
    extractedConcepts: [],
    suggestedRelations: [],
    onAddExtractedConcepts,
    onAddSuggestedRelations,
    onClearExtractedConcepts,
    onClearSuggestedRelations,
    isViewOnlyMode: false,
  };

  it('renders correctly with no suggestions', () => {
    render(<AISuggestionPanel {...defaultProps} />);
    expect(
      screen.getByText('No suggestions available for the current map.')
    ).toBeInTheDocument();
  });

  it('renders extracted concepts when provided', () => {
    render(
      <AISuggestionPanel {...defaultProps} extractedConcepts={mockConcepts} />
    );
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('State Management')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add All New\/Similar \(2\)/i })
    ).toBeInTheDocument();
  });

  it('renders suggested relations when provided', () => {
    render(
      <AISuggestionPanel {...defaultProps} suggestedRelations={mockRelations} />
    );
    expect(screen.getByText('Component')).toBeInTheDocument();
    expect(screen.getAllByText('Hook')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: /Add All New\/Similar \(2\)/i })
    ).toBeInTheDocument();
  });

  it('calls onAddExtractedConcepts when "Add Concepts" button is clicked', () => {
    render(
      <AISuggestionPanel {...defaultProps} extractedConcepts={mockConcepts} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Add All New\/Similar \(2\)/i })
    );
    expect(onAddExtractedConcepts).toHaveBeenCalledWith(mockConcepts);
  });

  it('calls onAddSuggestedRelations when "Add Relations" button is clicked', () => {
    render(
      <AISuggestionPanel {...defaultProps} suggestedRelations={mockRelations} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Add All New\/Similar \(2\)/i })
    );
    expect(onAddSuggestedRelations).toHaveBeenCalledWith(mockRelations);
  });

  it('disables buttons in view-only mode', () => {
    render(
      <AISuggestionPanel
        {...defaultProps}
        extractedConcepts={mockConcepts}
        suggestedRelations={mockRelations}
        isViewOnlyMode={true}
      />
    );
    const addButtons = screen.queryAllByRole('button', {
      name: /Add All New\/Similar/i,
    });
    expect(addButtons).toHaveLength(0);

    // Check individual add buttons are not present
    const firstConceptAddButton = screen
      .getByText('React Hooks')
      .parentElement?.querySelector('button[title="Add this concept"]');
    expect(firstConceptAddButton).toBeNull();
  });

  it('calls onClearExtractedConcepts when "Clear" is clicked for concepts', () => {
    render(
      <AISuggestionPanel {...defaultProps} extractedConcepts={mockConcepts} />
    );
    const clearButton = screen.getByTitle(
      'Clear all Extracted Concepts suggestions'
    );
    fireEvent.click(clearButton);
    expect(onClearExtractedConcepts).toHaveBeenCalledTimes(1);
  });

  it('calls onClearSuggestedRelations when "Clear" is clicked for relations', () => {
    render(
      <AISuggestionPanel {...defaultProps} suggestedRelations={mockRelations} />
    );
    const clearButton = screen.getByTitle(
      'Clear all Suggested Relations suggestions'
    );
    fireEvent.click(clearButton);
    expect(onClearSuggestedRelations).toHaveBeenCalledTimes(1);
  });

  it('adds a single concept when its add button is clicked', () => {
    render(
      <AISuggestionPanel {...defaultProps} extractedConcepts={mockConcepts} />
    );
    const checkbox = screen.getByRole('checkbox', { name: 'React Hooks' });
    fireEvent.click(checkbox);
    fireEvent.click(
      screen.getByRole('button', { name: /Add Selected \(1\)/i })
    );
    expect(onAddExtractedConcepts).toHaveBeenCalledWith([mockConcepts[0]]);
  });

  it('adds a single relation when its add button is clicked', () => {
    render(
      <AISuggestionPanel {...defaultProps} suggestedRelations={mockRelations} />
    );
    const relationCheckboxes = screen.getAllByRole('checkbox');
    // The first checkbox is for "Select All", so we start at index 1 for the actual items.
    // The first relation is at index 1 of the checkboxes list.
    fireEvent.click(relationCheckboxes[1]);
    fireEvent.click(
      screen.getByRole('button', { name: /Add Selected \(1\)/i })
    );
    expect(onAddSuggestedRelations).toHaveBeenCalledWith([mockRelations[0]]);
  });
});
