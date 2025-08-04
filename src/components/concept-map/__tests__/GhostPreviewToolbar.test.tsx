/// <reference types="vitest/globals" />
import {
  render,
  screen,
  fireEvent,
  within,
  cleanup,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

import GhostPreviewToolbar from '../GhostPreviewToolbar';

import { useConceptMapStore } from '@/stores/concept-map-store';

// Mock the Zustand store
vi.mock('@/stores/concept-map-store');

describe('GhostPreviewToolbar', () => {
  const mockAcceptGhostPreview = vi.fn();
  const mockCancelGhostPreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock state
    (useConceptMapStore as any).mockReturnValue({
      ghostPreviewData: null,
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should not render if ghostPreviewData is null', () => {
    render(<GhostPreviewToolbar />);
    expect(screen.queryByTestId('ghost-preview-toolbar')).toBeNull();
  });

  it('should not render if ghostPreviewData.nodes is empty', () => {
    (useConceptMapStore as any).mockReturnValue({
      ghostPreviewData: { nodes: [] },
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
    render(<GhostPreviewToolbar />);
    expect(screen.queryByTestId('ghost-preview-toolbar')).toBeNull();
  });

  it('should render correctly when ghostPreviewData is present with nodes', () => {
    (useConceptMapStore as any).mockReturnValue({
      ghostPreviewData: { nodes: [{ id: 'n1', x: 0, y: 0 }] },
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
    render(<GhostPreviewToolbar />);
    const toolbar = screen.getByTestId('ghost-preview-toolbar');
    expect(toolbar).toBeInTheDocument();

    // Adjusted query to be more resilient to nested spans
    const textElement = within(toolbar).getByText((content, element) => {
      return (
        element?.tagName.toLowerCase() === 'p' &&
        content.startsWith('Previewing layout for') &&
        content.endsWith('node(s).')
      );
    });
    expect(textElement).toBeInTheDocument();
    expect(textElement.textContent).toMatch(
      /Previewing layout for 1 node\(s\)/i
    );
    expect(
      within(toolbar).getByRole('button', { name: /Accept Layout/i })
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: /Cancel/i })
    ).toBeInTheDocument();
  });

  it('should display the correct node count', () => {
    (useConceptMapStore as any).mockReturnValue({
      ghostPreviewData: {
        nodes: [
          { id: 'n1', x: 0, y: 0 },
          { id: 'n2', x: 1, y: 1 },
        ],
      },
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
    render(<GhostPreviewToolbar />);
    const toolbar = screen.getByTestId('ghost-preview-toolbar');
    const textElement = within(toolbar).getByText((content, element) => {
      return (
        element?.tagName.toLowerCase() === 'p' &&
        content.startsWith('Previewing layout for') &&
        content.endsWith('node(s).')
      );
    });
    expect(textElement).toBeInTheDocument();
    expect(textElement.textContent).toMatch(
      /Previewing layout for 2 node\(s\)/i
    );
  });

  it('should call acceptGhostPreview when "Accept Layout" button is clicked', () => {
    (useConceptMapStore as any).mockReturnValue({
      ghostPreviewData: { nodes: [{ id: 'n1', x: 0, y: 0 }] },
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
    render(<GhostPreviewToolbar />);
    const toolbar = screen.getByTestId('ghost-preview-toolbar');
    fireEvent.click(
      within(toolbar).getByRole('button', { name: /Accept Layout/i })
    );
    expect(mockAcceptGhostPreview).toHaveBeenCalledTimes(1);
  });

  it('should call cancelGhostPreview when "Cancel" button is clicked', () => {
    (useConceptMapStore as any).mockReturnValue({
      ghostPreviewData: { nodes: [{ id: 'n1', x: 0, y: 0 }] },
      acceptGhostPreview: mockAcceptGhostPreview,
      cancelGhostPreview: mockCancelGhostPreview,
    });
    render(<GhostPreviewToolbar />);
    const toolbar = screen.getByTestId('ghost-preview-toolbar');
    fireEvent.click(within(toolbar).getByRole('button', { name: /Cancel/i }));
    expect(mockCancelGhostPreview).toHaveBeenCalledTimes(1);
  });
});
