
'use server';
/**
 * @fileOverview A Genkit tool to analyze project structure.
 * This is the initial setup with MOCK data. Actual analysis logic is pending.
 *
 * - projectStructureAnalyzerTool - The tool definition.
 * - ProjectAnalysisInputSchema - Zod schema for the tool's input.
 * - ProjectAnalysisOutputSchema - Zod schema for the tool's output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const ProjectAnalysisInputSchema = z.object({
  projectStoragePath: z.string().describe('File path or reference from Supabase Storage where the project archive is located.'),
  userHint: z.string().optional().describe("User-provided hint about the project's nature or focus area (e.g., 'e-commerce backend,' 'data processing pipeline')."),
});
export type ProjectAnalysisInput = z.infer<typeof ProjectAnalysisInputSchema>;

const InferredLanguageFrameworkSchema = z.object({
  name: z.string().describe('e.g., TypeScript, Spring Boot, React'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the inference.'),
});

const DependencyMapSchema = z.record(z.array(z.string())).describe('Key-value map of dependency types (e.g., npm, maven) to arrays of dependency names.');

const FileCountsSchema = z.record(z.number()).describe('Key-value map of file extensions to their counts (e.g., { ".ts": 10, ".js": 2 }).');

const DirectorySummarySchema = z.object({
  path: z.string().describe('Path to the directory (e.g., src/services).'),
  fileCounts: FileCountsSchema.describe('Counts of significant file types within this directory.'),
  inferredPurpose: z.string().optional().nullable().describe('Inferred purpose of the directory (e.g., Business Logic Services).'),
});

const KeyFileSchema = z.object({
  filePath: z.string().describe('Path to the key file.'),
  type: z.enum([
    'entry_point', 
    'configuration', 
    'service_definition', 
    'ui_component', 
    'model', 
    'utility', 
    'readme',
    'manifest',
    'docker',
    'cicd',
    'unknown'
  ]).describe('Type of the key file.'),
  extractedSymbols: z.array(z.string()).optional().describe('Names of primary declarations (classes, functions, components).'),
  briefDescription: z.string().optional().nullable().describe('Brief description of the file or its role (e.g., Handles user authentication endpoints).'),
});

const PotentialArchitecturalComponentSchema = z.object({
  name: z.string().describe('Name of the inferred architectural component (e.g., User Service, Payment Gateway).'),
  type: z.enum([
    'service', 
    'module', 
    'ui_area', 
    'data_store_interface', 
    'external_api',
    'library',
    'unknown_component'
  ]).describe('Type of the architectural component.'),
  relatedFiles: z.array(z.string()).optional().describe('Paths to files related to this component.'),
});

export const ProjectAnalysisOutputSchema = z.object({
  projectName: z.string().optional().nullable().describe('Name of the project, possibly inferred from manifest or directory structure.'),
  inferredLanguagesFrameworks: z.array(InferredLanguageFrameworkSchema).describe('List of detected languages/frameworks and confidence levels.'),
  projectSummary: z.string().optional().nullable().describe('Overall project summary, potentially from README or user hint.'),
  dependencies: DependencyMapSchema.optional().describe('Map of dependency types to lists of dependencies.'),
  directoryStructureSummary: z.array(DirectorySummarySchema).optional().describe('Summary of major directories, their contents, and inferred purposes.'),
  keyFiles: z.array(KeyFileSchema).optional().describe('List of identified key files with their types and extracted symbols.'),
  potentialArchitecturalComponents: z.array(PotentialArchitecturalComponentSchema).optional().describe('List of inferred high-level architectural components.'),
  parsingErrors: z.array(z.string()).optional().describe('List of errors encountered during parsing (e.g., "Could not parse requirements.txt").'),
});
export type ProjectAnalysisOutput = z.infer<typeof ProjectAnalysisOutputSchema>;

// Define a detailed, fixed mock project analysis output
const FIXED_MOCK_PROJECT_A_ANALYSIS: ProjectAnalysisOutput = {
  projectName: "Fixed Mock E-Commerce API",
  inferredLanguagesFrameworks: [
    { name: "TypeScript", confidence: "high" },
    { name: "Node.js", confidence: "high" },
    { name: "Express.js", confidence: "medium" },
  ],
  projectSummary: "This is a fixed mock analysis for a standard E-Commerce API project. It includes typical components like User Service, Product Service, Order Service, and a Payment Gateway integration.",
  dependencies: {
    npm: ["express", "typescript", "pg", "jsonwebtoken", "bcryptjs", "stripe"],
  },
  directoryStructureSummary: [
    { path: "src/controllers", fileCounts: { ".ts": 5 }, inferredPurpose: "API route handlers" },
    { path: "src/services", fileCounts: { ".ts": 4 }, inferredPurpose: "Business logic services" },
    { path: "src/models", fileCounts: { ".ts": 3 }, inferredPurpose: "Database models/entities" },
    { path: "src/middleware", fileCounts: { ".ts": 2 }, inferredPurpose: "Request middleware" },
    { path: "src/config", fileCounts: { ".ts": 1 }, inferredPurpose: "Application configuration" },
  ],
  keyFiles: [
    { filePath: "src/server.ts", type: "entry_point", extractedSymbols: ["app", "startServer"], briefDescription: "Main application entry point and server setup." },
    { filePath: "src/config/database.ts", type: "configuration", extractedSymbols: ["dbConfig"], briefDescription: "Database connection configuration." },
    { filePath: "src/services/UserService.ts", type: "service_definition", extractedSymbols: ["UserService", "createUser", "getUser"], briefDescription: "Handles user creation, authentication, and profile management." },
    { filePath: "src/services/ProductService.ts", type: "service_definition", extractedSymbols: ["ProductService", "getProduct", "listProducts"], briefDescription: "Manages product catalog." },
    { filePath: "src/controllers/OrderController.ts", type: "service_definition", extractedSymbols: ["OrderController", "createOrder", "getOrderStatus"], briefDescription: "Handles order creation and status updates." },
    { filePath: "src/models/UserModel.ts", type: "model", extractedSymbols: ["UserSchema"], briefDescription: "Defines the User data model." },
    { filePath: "package.json", type: "manifest", briefDescription: "Project dependencies and scripts." },
  ],
  potentialArchitecturalComponents: [
    { name: "User Authentication Service", type: "service", relatedFiles: ["src/services/UserService.ts", "src/middleware/auth.ts", "src/controllers/AuthController.ts"] },
    { name: "Product Catalog Service", type: "service", relatedFiles: ["src/services/ProductService.ts", "src/models/ProductModel.ts"] },
    { name: "Order Management Service", type: "service", relatedFiles: ["src/services/OrderService.ts", "src/controllers/OrderController.ts"] },
    { name: "Payment Gateway Integration", type: "external_api", relatedFiles: ["src/services/PaymentService.ts"] },
    { name: "API Router", type: "module", relatedFiles: ["src/routes/index.ts", "src/controllers"] },
    { name: "PostgreSQL Database Interface", type: "data_store_interface", relatedFiles: ["src/config/database.ts", "src/models"] },
  ],
  parsingErrors: [],
};


// MOCK IMPLEMENTATION
async function analyzeProjectStructure(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  console.log(`Mock projectStructureAnalyzerTool called with path: ${input.projectStoragePath}, hint: ${input.userHint}`);
  
  if (input.userHint === "_USE_FIXED_MOCK_PROJECT_A_") {
    console.log("Returning FIXED_MOCK_PROJECT_A_ANALYSIS");
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate short delay
    return FIXED_MOCK_PROJECT_A_ANALYSIS;
  }

  await new Promise(resolve => setTimeout(resolve, 1500));

  const projectNameFromPath = input.projectStoragePath.split('/').pop()?.split('.')[0] || "MockProjectFromPath";
  const userHintIncorporated = input.userHint ? ` (User Hint: ${input.userHint})` : "";

  let mainComponentType: "E-commerce Backend" | "Data Processing Pipeline" | "Frontend UI Library" | "Generic NextJS App" = "Generic NextJS App";
  if (input.userHint?.toLowerCase().includes("e-commerce") || input.userHint?.toLowerCase().includes("shop")) {
    mainComponentType = "E-commerce Backend";
  } else if (input.userHint?.toLowerCase().includes("data") || input.userHint?.toLowerCase().includes("pipeline")) {
    mainComponentType = "Data Processing Pipeline";
  } else if (input.userHint?.toLowerCase().includes("ui") || input.userHint?.toLowerCase().includes("frontend") || input.userHint?.toLowerCase().includes("library")) {
    mainComponentType = "Frontend UI Library";
  }


  const baseArchitecturalComponents = [
      { name: `Core ${mainComponentType} Module`, type: "service" as const, relatedFiles: ["src/services/core.ts", "src/views/main.tsx"] },
      { name: "Primary Data Store Interface", type: "data_store_interface" as const, relatedFiles: ["src/db/schema.ts", "src/services/data-access.ts"] },
  ];

  if (mainComponentType === "E-commerce Backend") {
    baseArchitecturalComponents.push({ name: "Order Processing Service", type: "service" as const, relatedFiles: ["src/services/orderProcessor.ts", "src/api/orders.ts"] });
    baseArchitecturalComponents.push({ name: "Product Catalog API", type: "external_api" as const, relatedFiles: ["src/clients/productApi.ts"] });
  } else if (mainComponentType === "Data Processing Pipeline") {
     baseArchitecturalComponents.push({ name: "Data Ingestion Unit", type: "module" as const, relatedFiles: ["src/ingestion/kafkaConsumer.ts"] });
     baseArchitecturalComponents.push({ name: "Transformation Engine", type: "service" as const, relatedFiles: ["src/transform/sparkJobs.scala"] });
  } else if (mainComponentType === "Frontend UI Library") {
     baseArchitecturalComponents.push({ name: "Reusable Button Component", type: "ui_area" as const, relatedFiles: ["src/components/Button.tsx"] });
     baseArchitecturalComponents.push({ name: "Theme Provider", type: "module" as const, relatedFiles: ["src/contexts/ThemeContext.tsx"] });
  } else { // Generic NextJS App
    baseArchitecturalComponents.push({ name: "NextJS Routing Module", type: "module" as const, relatedFiles: ["src/app/layout.tsx", "src/app/page.tsx"]});
    baseArchitecturalComponents.push({ name: "ShadCN UI Components", type: "library" as const, relatedFiles: ["src/components/ui/button.tsx"]});
  }


  return {
    projectName: `${projectNameFromPath.replace(/[-_]/g, ' ')}${userHintIncorporated}`,
    inferredLanguagesFrameworks: [
      { name: "TypeScript", confidence: "high" },
      { name: "React", confidence: "high" },
      { name: "Next.js", confidence: mainComponentType === "Generic NextJS App" ? "high" : "medium" },
    ],
    projectSummary: `This is a mock AI-generated analysis for the project from '${input.projectStoragePath}'. ${userHintIncorporated}. The project appears to be a ${mainComponentType.toLowerCase()} application. The analysis highlights key architectural components and their interactions.`,
    dependencies: {
      npm: ["react", "next", "zod", "lucide-react", mainComponentType === "E-commerce Backend" ? "stripe" : (mainComponentType === "Data Processing Pipeline" ? "apache-beam" : "clsx")],
      maven: [],
      pip: mainComponentType === "Data Processing Pipeline" ? ["pandas", "numpy"] : [],
    },
    directoryStructureSummary: [
      { path: "src/components", fileCounts: { ".tsx": mainComponentType === "Frontend UI Library" ? 25 : 10, ".css": 5 }, inferredPurpose: "UI components" },
      { path: "src/services", fileCounts: { ".ts": mainComponentType === "Generic NextJS App" ? 2 : 8 }, inferredPurpose: "Business logic and API services" },
      { path: "src/app", fileCounts: { ".tsx": 12, "route.ts": 5 }, inferredPurpose: "Application pages and API routes (App Router)" },
    ],
    keyFiles: [
      { filePath: "src/app/page.tsx", type: "entry_point", extractedSymbols: ["HomePage"], briefDescription: "Main application entry point or landing page." },
      { filePath: "package.json", type: "manifest", extractedSymbols: [], briefDescription: "Project dependencies and scripts." },
      { filePath: "src/lib/utils.ts", type: "utility", extractedSymbols: ["cn", "formatDate"], briefDescription: "Utility functions."}
    ],
    potentialArchitecturalComponents: baseArchitecturalComponents,
    parsingErrors: input.projectStoragePath.includes("error_trigger_file.zip") ? ["Mock Error: Hypothetical 'project.lock' file parsing failed due to unsupported version."] : [],
  };
}

export const projectStructureAnalyzerTool = ai.defineTool(
  {
    name: 'projectStructureAnalyzerTool',
    description: 'Analyzes a software project\'s structure from a provided storage path (e.g., a ZIP archive in cloud storage) and returns a structured JSON summary. This tool unpacks archives, identifies key files, infers languages/frameworks, lists dependencies, and summarizes directory structures and potential architectural components. It also attempts to parse READMEs for project summaries.',
    inputSchema: ProjectAnalysisInputSchema,
    outputSchema: ProjectAnalysisOutputSchema,
  },
  analyzeProjectStructure // Using the async function directly
);

