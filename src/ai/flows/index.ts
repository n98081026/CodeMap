import { expandConceptFlow } from './expand-concept';
import { extractConceptsFlow } from './extract-concepts';
import { suggestRelationsFlow } from './suggest-relations';

export const runFlow = async <T, U>(
  command: string,
  payload: T
): Promise<U | null> => {
  console.log('runFlow', command, payload);

  try {
    switch (command) {
      case 'extractConcepts':
        return (await extractConceptsFlow(payload as any)) as U;
      case 'suggestRelations':
        return (await suggestRelationsFlow(payload as any)) as U;
      case 'expandConcept':
        return (await expandConceptFlow(payload as any)) as U;
      default:
        console.warn(`Unknown AI flow command: ${command}`);
        return null;
    }
  } catch (error) {
    console.error(`Error executing AI flow ${command}:`, error);
    throw error;
  }
};
