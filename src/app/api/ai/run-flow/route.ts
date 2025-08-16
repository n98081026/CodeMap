import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { expandConceptFlow } from '@/ai/flows/expand-concept';
import { extractConceptsFlow } from '@/ai/flows/extract-concepts';
import { generateProjectOverview } from '@/ai/flows/generate-project-overview';
import { suggestRelationsFlow } from '@/ai/flows/suggest-relations';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { command, payload } = await request.json();

  if (!command) {
    return NextResponse.json({ message: 'Command is required' }, { status: 400 });
  }

  try {
    switch (command) {
      case 'extractConcepts': {
        const result = await extractConceptsFlow(payload);
        return NextResponse.json(result);
      }
      case 'suggestRelations': {
        const result = await suggestRelationsFlow(payload);
        return NextResponse.json(result);
      }
      case 'expandConcept': {
        const result = await expandConceptFlow(payload);
        return NextResponse.json(result);
      }
      case 'generateProjectOverview': {
        const result = await generateProjectOverview(payload);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json(
          { message: `Unknown command: ${command}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error(`AI flow error for command ${command}:`, errorMessage);
    return NextResponse.json(
      { message: 'Error executing AI flow' },
      { status: 500 }
    );
  }
}
