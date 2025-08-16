import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { runFlow } from '../index';

// Mocking fetch
global.fetch = vi.fn();

function createFetchResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

describe('runFlow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call fetch with the correct command and payload', async () => {
    const command = 'extractConcepts';
    const payload = { textToExtract: 'This is a test.' };
    const mockResponseData = { concepts: [{ text: 'test', reason: 'testing' }] };

    vi.mocked(fetch).mockResolvedValue(
      createFetchResponse(mockResponseData)
    );

    await runFlow(command, payload);

    expect(fetch).toHaveBeenCalledWith('/api/ai/run-flow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command, payload }),
    });
  });

  it('should return the JSON data from the fetch response on success', async () => {
    const command = 'extractConcepts';
    const payload = { textToExtract: 'This is a test.' };
    const mockResponseData = { concepts: [{ text: 'test', reason: 'testing' }] };

    vi.mocked(fetch).mockResolvedValue(
      createFetchResponse(mockResponseData)
    );

    const result = await runFlow(command, payload);

    expect(result).toEqual(mockResponseData);
  });

  it('should throw an error if the fetch response is not ok', async () => {
    const command = 'extractConcepts';
    const payload = { textToExtract: 'This is a test.' };

    vi.mocked(fetch).mockResolvedValue(
      createFetchResponse({ message: 'Server error' }, 500)
    );

    await expect(runFlow(command, payload)).rejects.toThrow(
      'AI flow execution failed'
    );
  });
});
