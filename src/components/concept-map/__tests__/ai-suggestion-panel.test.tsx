import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { AISuggestionPanel } from '../ai-suggestion-panel'; // Named export
import type { ExtractedConcept } from '@/ai/flows/extract-concepts';
import type { RelationSuggestion } from '@/types/ai-types';

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
  Badge: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
}));

// Sample data for testing
const mockConcepts: ExtractedConcept[] = [
  { id: 'c1', text: 'React Hooks', reason: 'Core concept of React' },
  { id: 'c2', text: 'State Management', reason: 'Key for dynamic UIs' },
];

const mockRelations: RelationSuggestion[] = [
  {
    id: 'r1',
    sourceNodeId: 'n1',
    targetNodeId: 'n2',
    label: 'uses',
    reason: 'Components use hooks for state.',
  },
  {
    id: 'r2',
    sourceNodeId: 'n2',
    targetNodeId: 'n3',
    label: 'manages',
    reason: 'Hooks manage component state.',
  },
];

describe.skip('AISuggestionPanel', () => {
  const onAddExtractedConcepts = vi.fn();
  const onAddSuggestedRelations = vi.fn();
  const onClearExtractedConcepts = vi.fn();
  const onClearSuggestedRelations = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    currentMapNodes: [
      { id: 'n1', text: 'Component' },
      { id: 'n2', text: 'Hook' },
      { id: 'n3', text: 'State' },
    ],
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
      screen.getByText('No new concepts suggested at the moment.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('No new relations suggested at the moment.')
    ).toBeInTheDocument();
  });

  it('renders extracted concepts when provided', () => {
    render(
      <AISuggestionPanel {...defaultProps} extractedConcepts={mockConcepts} />
    );
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('State Management')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add 2 Concepts/i })
    ).toBeInTheDocument();
  });

  it('renders suggested relations when provided', () => {
    render(
      <AISuggestionPanel {...defaultProps} suggestedRelations={mockRelations} />
    );
    expect(screen.getByText(/Component → Hook/)).toBeInTheDocument();
    expect(screen.getByText(/Hook → State/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add 2 Relations/i })
    ).toBeInTheDocument();
  });

  it('calls onAddExtractedConcepts when "Add Concepts" button is clicked', () => {
    render(
      <AISuggestionPanel {...defaultProps} extractedConcepts={mockConcepts} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add 2 Concepts/i }));
    expect(onAddExtractedConcepts).toHaveBeenCalledWith(mockConcepts);
  });

  it('calls onAddSuggestedRelations when "Add Relations" button is clicked', () => {
    render(
      <AISuggestionPanel {...defaultProps} suggestedRelations={mockRelations} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add 2 Relations/i }));
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
    const addConceptsButton = screen.getByRole('button', {
      name: /Add 2 Concepts/i,
    });
    const addRelationsButton = screen.getByRole('button', {
      name: /Add 2 Relations/i,
    });
    expect(addConceptsButton).toBeDisabled();
    expect(addRelationsButton).toBeDisabled();

    // Check individual add buttons
    const firstConceptAddButton =
      screen.getByText('React Hooks').parentElement?.querySelector('button');
    expect(firstConceptAddButton).toBeDisabled();
  });

  it('calls onClearExtractedConcepts when "Clear" is clicked for concepts', () => {
    render(
      <AISuggestionPanel {...defaultProps} extractedConcepts={mockConcepts} />
    );
    const clearButton = screen.getAllByRole('button', { name: /Clear/i })[0];
    fireEvent.click(clearButton);
    expect(onClearExtractedConcepts).toHaveBeenCalledTimes(1);
  });

  it('calls onClearSuggestedRelations when "Clear" is clicked for relations', () => {
    render(
      <AISuggestionPanel {...defaultProps} suggestedRelations={mockRelations} />
    );
    const clearButton = screen.getAllByRole('button', { name: /Clear/i })[1];
    fireEvent.click(clearButton);
    expect(onClearSuggestedRelations).toHaveBeenCalledTimes(1);
  });

  it('adds a single concept when its add button is clicked', () => {
    render(
      <AISuggestionPanel {...defaultProps} extractedConcepts={mockConcepts} />
    );
    const firstConceptAddButton = screen
      .getByText('React Hooks')
      .parentElement?.querySelector('button[title="Add this concept"]');
    fireEvent.click(firstConceptAddButton!);
    expect(onAddExtractedConcepts).toHaveBeenCalledWith([mockConcepts[0]]);
  });

  it('adds a single relation when its add button is clicked', () => {
    render(
      <AISuggestionPanel {...defaultProps} suggestedRelations={mockRelations} />
    );
    const firstRelationAddButton = screen
      .getByText(/Component → Hook/)
      .closest('div.flex.items-center.justify-between')
      ?.querySelector('button[title="Add this relation"]');
    fireEvent.click(firstRelationAddButton!);
    expect(onAddSuggestedRelations).toHaveBeenCalledWith([mockRelations[0]]);
  });
});
