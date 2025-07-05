import { describe, it, expect, vi, beforeEach } from 'vitest'; // Added beforeEach
import { render, screen, fireEvent } from '@testing-library/react';
import AIStagingToolbar, { AIStagingToolbarProps } from './ai-staging-toolbar';

describe('AIStagingToolbar', () => {
  const mockOnCommit = vi.fn();
  const mockOnClear = vi.fn();

  const defaultProps: AIStagingToolbarProps = {
    isVisible: true,
    onCommit: mockOnCommit,
    onClear: mockOnClear,
    stagedItemCount: { nodes: 0, edges: 0 },
  };

  beforeEach(() => { // Added to ensure mocks are cleared
    vi.clearAllMocks();
  });

  it('should not render if isVisible is false', () => {
    render(<AIStagingToolbar {...defaultProps} isVisible={false} />);
    expect(screen.queryByText(/AI Staging Area/i)).toBeNull();
  });

  it('should render correctly when isVisible is true', () => {
    render(<AIStagingToolbar {...defaultProps} stagedItemCount={{ nodes: 1, edges: 2 }} />);

    const textElement = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'p' && content.startsWith('AI Staging Area: Reviewing');
    });
    expect(textElement).toBeInTheDocument();
    expect(textElement.textContent).toContain('1 nodes');
    expect(textElement.textContent).toContain('2 edges');

    // Updated queries to use the aria-label
    expect(screen.getByRole('button', { name: /Commit staged AI suggestions to the map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Discard all staged AI suggestions/i })).toBeInTheDocument();
  });

  it('should display correct node and edge counts', () => {
    render(<AIStagingToolbar {...defaultProps} stagedItemCount={{ nodes: 3, edges: 5 }} />);
    const textElement = screen.getByText((content, element) => element?.tagName.toLowerCase() === 'p' && content.includes('AI Staging Area'));
    expect(textElement.textContent).toMatch(/3.*nodes/);
    expect(textElement.textContent).toMatch(/5.*edges/);
  });

  it('should call onCommit when "Commit to Map" button is clicked', () => {
    render(<AIStagingToolbar {...defaultProps} />);
    // Updated query
    fireEvent.click(screen.getByRole('button', { name: /Commit staged AI suggestions to the map/i }));
    expect(mockOnCommit).toHaveBeenCalledTimes(1);
  });

  it('should call onClear when "Discard All" button is clicked', () => {
    render(<AIStagingToolbar {...defaultProps} />);
    // Updated query
    fireEvent.click(screen.getByRole('button', { name: /Discard all staged AI suggestions/i }));
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });
});
