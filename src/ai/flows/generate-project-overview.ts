// This is a mock file to resolve the import error in tests.
// The actual implementation is missing.

export const generateProjectOverview = vi.fn().mockResolvedValue({
  overview: 'Mocked project overview',
  keyConcepts: ['Mocked Concept 1', 'Mocked Concept 2'],
});
