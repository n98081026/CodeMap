export const runFlow = async <T, U>(
  command: string,
  payload: T
): Promise<U> => {
  try {
    const response = await fetch('/api/ai/run-flow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command, payload }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AI flow execution failed:', errorData);
      throw new Error(
        `AI flow execution failed: ${errorData.message || response.statusText}`
      );
    }

    return (await response.json()) as U;
  } catch (error) {
    console.error(`Error executing AI flow ${command}:`, error);
    // Re-throw a more generic error to avoid leaking implementation details
    // to the UI, which can then handle it gracefully.
    throw new Error('AI flow execution failed');
  }
};
