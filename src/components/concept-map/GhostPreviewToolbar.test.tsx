import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GhostPreviewToolbar from './GhostPreviewToolbar';
import useConceptMapStore from '@/stores/concept-map-store';

// Mock the Zustand store
vi.mock('@/stores/concept-map-store');

describe('GhostPreviewToolbar', () => {
  const mockAcceptGhostPreview = vi.fn();
  const mockCancelGhostPreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock state
    (useConceptMapStore as unknown as vi.Mock).mockReturnValue({
      ghostPreviewData: null,
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
  });

  it('should not render if ghostPreviewData is null', () => {
    render(<GhostPreviewToolbar />);
    expect(screen.queryByText(/Previewing layout for/i)).toBeNull();
  });

  it('should not render if ghostPreviewData.nodes is empty', () => {
    (useConceptMapStore as unknown as vi.Mock).mockReturnValue({
      ghostPreviewData: { nodes: [] },
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
    render(<GhostPreviewToolbar />);
    expect(screen.queryByText(/Previewing layout for/i)).toBeNull();
  });

  it('should render correctly when ghostPreviewData is present with nodes', () => {
    (useConceptMapStore as unknown as vi.Mock).mockReturnValue({
      ghostPreviewData: { nodes: [{ id: 'n1', x: 0, y: 0 }] },
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
    render(<GhostPreviewToolbar />);
    // Adjusted query to be more resilient to nested spans
    const textElement = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'p' && content.startsWith('Previewing layout for') && content.endsWith('node(s).');
    });
    expect(textElement).toBeInTheDocument();
    expect(textElement.textContent).toMatch(/Previewing layout for 1 node\(s\)/i);
    expect(screen.getByRole('button', { name: /Accept Layout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('should display the correct node count', () => {
    (useConceptMapStore as unknown as vi.Mock).mockReturnValue({
      ghostPreviewData: { nodes: [{ id: 'n1', x: 0, y: 0 }, { id: 'n2', x: 1, y: 1 }] },
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
    render(<GhostPreviewToolbar />);
    const textElement = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'p' && content.startsWith('Previewing layout for') && content.endsWith('node(s).');
    });
    expect(textElement).toBeInTheDocument();
    expect(textElement.textContent).toMatch(/Previewing layout for 2 node\(s\)/i);
  });

  it('should call acceptGhostPreview when "Accept Layout" button is clicked', () => {
    (useConceptMapStore as unknown as vi.Mock).mockReturnValue({
      ghostPreviewData: { nodes: [{ id: 'n1', x: 0, y: 0 }] },
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
    render(<GhostPreviewToolbar />);
    fireEvent.click(screen.getByRole('button', { name: /Accept Layout/i }));
    expect(mockAcceptGhostPreview).toHaveBeenCalledTimes(1);
  });

  it('should call cancelGhostPreview when "Cancel" button is clicked', () => {
    (useConceptMapStore as unknown as vi.Mock).mockReturnValue({
      ghostPreviewData: { nodes: [{ id: 'n1', x: 0, y: 0 }] },
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
    render(<GhostPreviewToolbar />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockCancelGhostPreview).toHaveBeenCalledTimes(1);
  });
});
