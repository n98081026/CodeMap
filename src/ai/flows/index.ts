import { expandConceptFlow } from './expand-concept';
import { extractConceptsFlow } from './extract-concepts';
import { suggestRelationsFlow } from './suggest-relations';
import type {
  ExtractConceptsOutput,
  SuggestRelationsOutput,
  ExpandConceptOutput,
  ExtractConceptsInput,
  SuggestRelationsInput,
  ExpandConceptInput,
} from './types';

export const runFlow = async (
  command: string,
  payload:
    | ExtractConceptsInput
    | SuggestRelationsInput
    | ExpandConceptInput
    | any
): Promise<
  ExtractConceptsOutput | SuggestRelationsOutput | ExpandConceptOutput | null
> => {
  console.log('runFlow', command, payload);

  try {
    switch (command) {
      case 'extractConcepts':
        return (await extractConceptsFlow(
          payload as ExtractConceptsInput
        )) as ExtractConceptsOutput;
      case 'suggestRelations':
        return (await suggestRelationsFlow(
          payload as SuggestRelationsInput
        )) as SuggestRelationsOutput;
      case 'expandConcept':
        return (await expandConceptFlow(
          payload as ExpandConceptInput
        )) as ExpandConceptOutput;
      default:
        console.warn(`Unknown AI flow command: ${command}`);
        return null;
    }
  } catch (error) {
    console.error(`Error executing AI flow ${command}:`, error);
    throw error;
  }
};
