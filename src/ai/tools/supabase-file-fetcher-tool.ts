// src/ai/tools/supabase-file-fetcher-tool.ts
import { genkit as ai } from 'genkit';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';

export const FileFetcherInputSchema = z.object({
  bucketName: z.string(),
  filePath: z.string(),
});

export const FileFetcherOutputSchema = z.object({
  fileName: z.string(),
  fileContent: z.string().nullable(),
  fileBuffer: z.any().nullable(),
  contentType: z.string().nullable(),
  isBinary: z.boolean(),
  error: z.string().nullable(),
});

export const supabaseFileFetcherTool = ai.tool(
  {
    name: 'supabaseFileFetcher',
    description: 'Fetches a file from a Supabase storage bucket.',
    inputSchema: FileFetcherInputSchema,
    outputSchema: FileFetcherOutputSchema,
  },
  async ({ bucketName, filePath }: z.infer<typeof FileFetcherInputSchema>) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (error) {
      return {
        fileName: filePath,
        fileContent: null,
        fileBuffer: null,
        contentType: null,
        isBinary: false,
        error: error.message,
      };
    }

    const contentType = data.type;
    const isBinary = !contentType.startsWith('text/');
    let fileContent: string | null = null;
    let fileBuffer: Buffer | null = null;

    if (isBinary) {
      fileBuffer = Buffer.from(await data.arrayBuffer());
    } else {
      fileContent = await data.text();
    }

    return {
      fileName: filePath,
      fileContent,
      fileBuffer,
      contentType,
      isBinary,
      error: null,
    };
  }
);
