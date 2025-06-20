/**
 * @fileOverview A Genkit tool to analyze project structure.
 * It now fetches a file from Supabase Storage using supabaseFileFetcherTool
 * and provides a mock analysis based on the file's properties.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod'; // Use Zod from Genkit/top-level for consistency if possible, else 'zod'
import { supabaseFileFetcherTool, SupabaseFileFetcherOutputSchema } from './supabase-file-fetcher-tool'; // Updated import

export const ProjectAnalysisInputSchema = z.object({
  projectStoragePath: z.string().describe('File path in Supabase Storage for the project archive/file.'),
  userHint: z.string().optional().describe("User-provided hint about the project's nature or focus area."),
});
export type ProjectAnalysisInput = z.infer<typeof ProjectAnalysisInputSchema>;

// New Output Schema
export const ProjectAnalysisOutputSchema = z.object({
  analyzedFileName: z.string(),
  contentType: z.string().optional(),
  fileSize: z.number().optional(),
  isBinary: z.boolean(),
  analysisSummary: z.string(),
  // Keep detailedNodes structure for compatibility with generateMapFromProject flow,
  // but its content will be very simple/mock.
  detailedNodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.string(), // e.g., 'file-summary', 'content-line', 'error-info'
      details: z.string().optional(),
    })
  ).optional(),
  error: z.string().optional(), // For errors from this tool itself, distinct from fetcher error
});
export type ProjectAnalysisOutput = z.infer<typeof ProjectAnalysisOutputSchema>;

async function analyzeProjectStructure(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  console.log(`projectStructureAnalyzerTool called with path: ${input.projectStoragePath}, hint: ${input.userHint}`);

  const BUCKET_NAME = "project_archives"; // Hardcoded as per subtask instruction

  const fileDetails = await supabaseFileFetcherTool.run({
    bucketName: BUCKET_NAME,
    filePath: input.projectStoragePath,
  });

  if (fileDetails.error || !fileDetails.fileName) {
    return {
      analyzedFileName: input.projectStoragePath.split('/').pop() || 'unknown_file',
      isBinary: false,
      analysisSummary: `Error fetching file: ${fileDetails.error || 'Unknown error from file fetcher.'}`,
      detailedNodes: [{
        id: 'error-node',
        label: 'File Fetch Error',
        type: 'error-info',
        details: fileDetails.error || 'Unknown error from file fetcher.',
      }],
      error: `File fetch failed: ${fileDetails.error}`,
    };
  }

  const { fileName, fileContent, fileBuffer, contentType, isBinary } = fileDetails;
  const fileSize = fileBuffer?.length; // Get size from buffer if available

  let analysisSummary = "";
  const detailedNodes: ProjectAnalysisOutput['detailedNodes'] = [];

  detailedNodes.push({
    id: 'file-info',
    label: fileName,
    type: 'file-summary',
    details: `Type: ${contentType || 'unknown'}, Size: ${fileSize !== undefined ? `${fileSize} bytes` : 'unknown'}, Binary: ${isBinary}`
  });

  if (isBinary) {
    analysisSummary = `File '${fileName}' (${contentType || 'unknown type'}) is binary. Size: ${fileSize !== undefined ? `${fileSize} bytes` : 'unknown size'}. User hint: '${input.userHint || 'N/A'}'.`;
    detailedNodes.push({
      id: 'binary-content',
      label: 'Binary Content',
      type: 'binary-file-info',
      details: `The tool detected this as a binary file, so no line-by-line content analysis will be performed. Its size is ${fileSize !== undefined ? `${fileSize} bytes` : 'unknown'}.`
    });
  } else if (fileContent) {
    const lines = fileContent.split('\n');
    const firstLine = lines[0]?.substring(0, 100) || ''; // Get first 100 chars of first line
    analysisSummary = `File '${fileName}' (${contentType || 'unknown type'}) has ${lines.length} lines. First line (preview): '${firstLine}...'. User hint: '${input.userHint || 'N/A'}'.`;
    detailedNodes.push({
      id: 'text-summary',
      label: 'Text File Summary',
      type: 'text-file-info',
      details: `Line count: ${lines.length}. Hint: ${input.userHint || 'N/A'}`
    });
    detailedNodes.push({
      id: 'line-1',
      label: 'First line preview',
      type: 'content-line',
      details: firstLine
    });
    if (lines.length > 1) {
      detailedNodes.push({
        id: 'line-count-node',
        label: 'Content Structure',
        type: 'content-structure',
        details: `The file contains ${lines.length} lines of text.`
      });
    }
  } else {
    // Text file indicated by content type, but content is empty or decoding failed
    analysisSummary = `File '${fileName}' (${contentType || 'unknown type'}) is text-based but content is empty or could not be decoded. Size: ${fileSize !== undefined ? `${fileSize} bytes` : 'unknown size'}. User hint: '${input.userHint || 'N/A'}'.`;
    detailedNodes.push({
      id: 'empty-text-content',
      label: 'Empty/Undecodable Text Content',
      type: 'text-file-warning',
      details: `The file was identified as text (type: ${contentType}), but its content is missing or could not be read as UTF-8 text. Its size is ${fileSize !== undefined ? `${fileSize} bytes` : 'unknown'}.`
    });
  }

  // This tool now returns a simpler structure based on the fetched file properties.
  // The goal is to provide basic info for the generateMapFromProject flow.
  // The complex mock structures (dependencies, directory summaries etc.) are removed.
  return {
    analyzedFileName: fileName,
    contentType,
    fileSize,
    isBinary,
    analysisSummary,
    detailedNodes, // This simplified structure should be acceptable by the consuming flow
  };
}

export const projectStructureAnalyzerTool = ai.defineTool(
  {
    name: 'projectStructureAnalyzerTool',
    description: 'Fetches a project file from Supabase Storage and provides a basic analysis of its properties (name, type, size, simple content summary). This tool no longer performs deep project structure analysis (like inferring languages or dependencies).',
    inputSchema: ProjectAnalysisInputSchema,
    outputSchema: ProjectAnalysisOutputSchema,
  },
  analyzeProjectStructure
);
