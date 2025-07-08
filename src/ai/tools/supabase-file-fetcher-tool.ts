// src/ai/tools/supabase-file-fetcher-tool.ts
import path from 'path'; // For extracting filename

import { defineTool } from 'genkit/core'; // Changed from genkit to genkit/core
import { z } from 'zod';

import { supabase } from '../../lib/supabaseClient'; // Adjust path if needed

export const SupabaseFileFetcherInputSchema = z.object({
  bucketName: z.string().min(1, 'Bucket name cannot be empty.'),
  filePath: z.string().min(1, 'File path cannot be empty.'),
});

export const SupabaseFileFetcherOutputSchema = z.object({
  fileName: z.string(),
  fileContent: z.string().optional(),
  fileBuffer: z
    .custom<Buffer>((val): val is Buffer => val instanceof Buffer)
    .optional(), // For Zod to recognize Buffer
  contentType: z.string().optional(),
  error: z.string().optional(),
  isBinary: z.boolean(),
});

export const supabaseFileFetcherTool = defineTool(
  {
    name: 'supabaseFileFetcher',
    description:
      'Downloads a file from Supabase Storage and returns its content as a string if text-based, or a buffer.',
    inputSchema: SupabaseFileFetcherInputSchema,
    outputSchema: SupabaseFileFetcherOutputSchema,
  },
  async ({ bucketName, filePath }) => {
    const extractedFileName = path.basename(filePath) || 'unknown_file';
    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (downloadError) {
        console.error(
          `Supabase download error for ${bucketName}/${filePath}:`,
          downloadError
        );
        return {
          fileName: extractedFileName,
          isBinary: false, // Unknown, default to false
          error: `Failed to download file: ${downloadError.message}`,
        };
      }

      if (!blob) {
        return {
          fileName: extractedFileName,
          isBinary: false, // Unknown
          error: 'Downloaded file data (blob) is null.',
        };
      }

      const fileBuffer = Buffer.from(await blob.arrayBuffer());
      const contentType = blob.type || 'application/octet-stream'; // Default content type if not provided

      let isBinary = true;
      let fileContent: string | undefined = undefined;

      // Common text-based MIME types
      const textMimeTypes = [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'application/javascript',
        'application/json',
        'application/xml',
        'application/xhtml+xml',
        'image/svg+xml', // SVG can be considered text
      ];

      // Check if content type suggests it's text based
      // Also check for types that commonly contain UTF-8 text like Dockerfile, .md, .py, .java etc.
      // This heuristic can be expanded.
      if (
        textMimeTypes.some((type) => contentType.startsWith(type)) ||
        filePath.endsWith('.md') ||
        filePath.endsWith('.txt') ||
        filePath.endsWith('.py') ||
        filePath.endsWith('.js') ||
        filePath.endsWith('.ts') ||
        filePath.endsWith('.java') ||
        filePath.endsWith('.c') ||
        filePath.endsWith('.cpp') ||
        filePath.endsWith('.h') ||
        filePath.endsWith('.cs') ||
        filePath.endsWith('.go') ||
        filePath.endsWith('.rb') ||
        filePath.endsWith('.php') ||
        filePath.endsWith('.sh') ||
        filePath.endsWith('.yaml') ||
        filePath.endsWith('.yml') ||
        filePath.endsWith('.toml') ||
        filePath.endsWith('.ini') ||
        filePath.endsWith('.env') ||
        filePath.includes('Dockerfile') ||
        filePath.endsWith('.json') ||
        filePath.endsWith('.xml') ||
        filePath.endsWith('.html') ||
        filePath.endsWith('.css')
      ) {
        try {
          fileContent = fileBuffer.toString('utf-8');
          // Double check if decoding resulted in replacement characters, which might indicate it's not valid UTF-8
          if (fileContent.includes('\uFFFD')) {
            console.warn(
              `File ${filePath} (type: ${contentType}) was decoded as UTF-8 but contains replacement characters. Might be non-UTF-8 text or binary.`
            );
            // Depending on strictness, you might set isBinary = true here
            // For now, if content-type suggested text, we assume it was intended as text.
            isBinary = false; // Assume text despite potential encoding issues for now
          } else {
            isBinary = false; // Successfully decoded as UTF-8 text
          }
        } catch (e: any) {
          console.warn(
            `Failed to decode content as UTF-8 for ${filePath} (type: ${contentType}): ${e.message}`
          );
          // If decoding fails, treat as binary or keep as text with undefined content
          isBinary = true; // Force binary if decoding fails catastrophically
          fileContent = undefined;
        }
      } else {
        // If content type doesn't suggest text, assume binary
        isBinary = true;
      }

      return {
        fileName: extractedFileName,
        fileContent: fileContent, // Will be undefined if binary or decoding failed
        fileBuffer: isBinary ? fileBuffer : undefined, // Only return buffer if deemed binary or text decoding failed
        contentType,
        isBinary,
      };
    } catch (e: any) {
      console.error(
        `Unexpected error in supabaseFileFetcherTool for ${bucketName}/${filePath}:`,
        e
      );
      return {
        fileName: extractedFileName,
        isBinary: false, // Default to false on unexpected error
        error: `Unexpected error: ${e.message}`,
      };
    }
  }
);
