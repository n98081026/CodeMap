export const runFlow = async <T, U>(
  command: string,
  payload: T
): Promise<U | null> => {
  console.log('runFlow', command, payload);
  return null;
};
