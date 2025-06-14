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

export const KeyFileSchema = z.object({ // Export if needed by other modules, or keep local
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
export type KeyFile = z.infer<typeof KeyFileSchema>;


export const PotentialArchitecturalComponentSchema = z.object({ // Export if needed, or keep local
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
export type PotentialArchitecturalComponent = z.infer<typeof PotentialArchitecturalComponentSchema>;


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

// Simulated File Contents for _USE_SIMULATED_FS_NODE_PROJECT_
const SIMULATED_PACKAGE_JSON_CONTENT = `{
  "name": "my-simulated-node-app",
  "version": "1.0.0",
  "description": "A sample Node.js application with Express and a few utilities, demonstrating simulated file system analysis.",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.17.1",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "jest": "^27.0.0",
    "nodemon": "^2.0.15"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/example/my-simulated-node-app.git"
  },
  "keywords": ["node", "express", "simulation"],
  "author": "AI Developer",
  "license": "MIT"
}`;

const SIMULATED_README_CONTENT = `# My Simulated Node App

This is a sample application to demonstrate how project analysis might work on a simple Node.js/Express setup.
It features a main entry point, some utility functions, and basic tests.

## Features
- Express server setup
- Utility module
- Basic testing structure

## Setup
\`\`\`bash
npm install
npm start
\`\`\`
`;

const SIMULATED_INDEX_JS_CONTENT = `
const express = require('express');
const _ = require('lodash');
const { helperFunction } = require('./utils');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World! ' + helperFunction());
});

function startServer() {
  app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
`;

const SIMULATED_UTILS_JS_CONTENT = `
function helperFunction() {
  return "Data from helper!";
}

function anotherUtility(a, b) {
  return a + b;
}

// Example of a different export style
const yetAnotherUtil = () => "Yet another util";

module.exports = {
  helperFunction,
  anotherUtility,
  yetAnotherUtil
};
`;

const SIMULATED_TEST_JS_CONTENT = `
const { helperFunction, anotherUtility } = require('../src/utils');

describe('Utility Functions', () => {
  test('helperFunction should return correct string', () => {
    expect(helperFunction()).toBe('Data from helper!');
  });

  test('anotherUtility should add numbers', () => {
    expect(anotherUtility(2, 3)).toBe(5);
  });
});
`;


// Helper function to extract H1 from Markdown (simplified)
const getReadmeSummary = (readmeContent: string): string | undefined => {
  const h1Match = readmeContent.match(/^#\s*(.*)/m);
  return h1Match ? h1Match[1] : undefined;
};

// Helper function to "extract" function names from JS (simplified regex)
const extractJsFunctions = (jsContent: string): string[] => {
  const functionRegex = /function\s+([A-Za-z0-9_]+)\s*\(|const\s+([A-Za-z0-9_]+)\s*=\s*\(.*\)\s*=>|const\s+([A-Za-z0-9_]+)\s*=\s*function|module\.exports\s*\.\s*([A-Za-z0-9_]+)\s*=\s*function|module\.exports\s*=\s*{\s*([A-Za-z0-9_,\s]+)\s*}/g;
  const symbols: string[] = [];
  let match;
  while ((match = functionRegex.exec(jsContent)) !== null) {
    if (match[1]) symbols.push(match[1]); // function foo()
    if (match[2]) symbols.push(match[2]); // const foo = () =>
    if (match[3]) symbols.push(match[3]); // const foo = function
    if (match[4]) symbols.push(match[4]); // module.exports.foo = function
    if (match[5]) { // module.exports = { foo, bar }
        match[5].split(',').forEach(s => symbols.push(s.trim()));
    }
  }
  // Filter out potential empty strings if regex matches weirdly
  return symbols.filter(Boolean).filter((s, index, self) => self.indexOf(s) === index); // Unique symbols
};


async function analyzeProjectStructure(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  console.log(`projectStructureAnalyzerTool called with path: ${input.projectStoragePath}, hint: ${input.userHint}`);

  // TODO: Implement actual file fetching from projectStoragePath (e.g., Supabase Storage)
  // const projectArchive = await downloadFile(input.projectStoragePath);
  // TODO: Implement archive unpacking (e.g., for .zip, .tar.gz)
  // const fileSystem = await unpackArchive(projectArchive);
  // For now, we'll simulate finding specific files based on hints.

  if (input.userHint === "_USE_FIXED_MOCK_PROJECT_A_") {
    console.log("Returning FIXED_MOCK_PROJECT_A_ANALYSIS");
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate short delay
    return FIXED_MOCK_PROJECT_A_ANALYSIS;
  }

  if (input.userHint === "_USE_SIMULATED_FS_NODE_PROJECT_") {
    console.log("Returning detailed simulated Node.js project analysis based on _USE_SIMULATED_FS_NODE_PROJECT_ hint.");
    try {
      const packageJsonData = JSON.parse(SIMULATED_PACKAGE_JSON_CONTENT);

      const projectName = packageJsonData.name || "Simulated Project";
      const projectSummary = getReadmeSummary(SIMULATED_README_CONTENT) || packageJsonData.description;
      const dependencies = {
        npm: [
          ...(packageJsonData.dependencies ? Object.keys(packageJsonData.dependencies) : []),
          ...(packageJsonData.devDependencies ? Object.keys(packageJsonData.devDependencies) : [])
        ]
      };

      const keyFilesData: KeyFile[] = [
        { filePath: "package.json", type: "manifest", briefDescription: packageJsonData.description || "Project manifest.", extractedSymbols: ["name", "version", "dependencies"] },
        { filePath: "README.md", type: "readme", briefDescription: "Project README file.", extractedSymbols: projectSummary ? [projectSummary.substring(0,30)+"..." ] : ["README"] },
        { filePath: "src/index.js", type: "entry_point", briefDescription: "Main application entry point.", extractedSymbols: extractJsFunctions(SIMULATED_INDEX_JS_CONTENT) },
        { filePath: "src/utils.js", type: "utility", briefDescription: "Utility functions module.", extractedSymbols: extractJsFunctions(SIMULATED_UTILS_JS_CONTENT) },
        { filePath: "tests/utils.test.js", type: "unknown", briefDescription: "Test file for utils.", extractedSymbols: extractJsFunctions(SIMULATED_TEST_JS_CONTENT) },
      ];

      const output: ProjectAnalysisOutput = {
        projectName: projectName,
        projectSummary: projectSummary,
        inferredLanguagesFrameworks: [
          { name: "JavaScript", confidence: "high" as const },
          { name: "Node.js", confidence: "high" as const },
          ...(dependencies.npm.includes("express") ? [{ name: "Express.js", confidence: "medium" as const }] : [])
        ],
        dependencies: dependencies,
        directoryStructureSummary: [
          { path: "src", fileCounts: { ".js": 2 }, inferredPurpose: "Source code" },
          { path: "tests", fileCounts: { ".js": 1 }, inferredPurpose: "Test files" }
        ],
        keyFiles: keyFilesData,
        potentialArchitecturalComponents: [
          { name: "Application Entry Point", type: "service", relatedFiles: ["src/index.js"] },
          { name: "Utility Module", type: "module", relatedFiles: ["src/utils.js"] },
          ...(dependencies.npm.includes("express") ? [{ name: "Express Web Server", type: "service" as const, relatedFiles: ["src/index.js"] }] : [])
        ],
        parsingErrors: []
      };
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      return output;
    } catch (e) {
      console.error("Error in _USE_SIMULATED_FS_NODE_PROJECT_ block:", e);
      return {
          projectName: "Simulated FS Error",
          projectSummary: "Error during simulated FS processing.",
          inferredLanguagesFrameworks:[],
          parsingErrors: [(e as Error).message]
      };
    }
  }

  let foundPackageJsonDataForSimpleNodeHint: any = null;
  if (input.userHint?.toLowerCase().includes("node") || input.userHint?.toLowerCase().includes("npm")) {
    // This is the simpler package.json parsing, only if the more specific hints above didn't match
    try {
      // Using a slightly different package.json for this simpler case to differentiate
      const simplePackageJsonContent = `{
        "name": "basic-node-app-from-hint",
        "version": "0.1.0",
        "description": "A very basic Node.js app, identified by generic 'node' hint.",
        "main": "app.js",
        "dependencies": { "moment": "^2.29.1" }
      }`;
      foundPackageJsonDataForSimpleNodeHint = JSON.parse(simplePackageJsonContent);
      console.log("Simulated (simple) package.json parsing successful due to 'node' or 'npm' hint.");
    } catch (error) {
      console.error("Simulated error parsing (simple) package.json:", error);
      // Return minimal error, or could enhance
      return { projectName: "Simple Parse Error", parsingErrors: ["Failed to parse simple package.json from hint."], inferredLanguagesFrameworks:[] };
    }
  }

  if (foundPackageJsonDataForSimpleNodeHint) {
    const packageData = foundPackageJsonDataForSimpleNodeHint;
    const npmDependencies = Object.keys(packageData.dependencies || {});
    const keyFilesArr: KeyFile[] = [{
        filePath: "package.json", type: "manifest",
        briefDescription: packageData.description || "Project manifest.",
        extractedSymbols: ["name", "version"]
    }];
    return {
      projectName: packageData.name || "Basic Node App",
      projectSummary: `${packageData.description || 'Basic analysis from package.json.'} User hint: ${input.userHint || 'N/A'}`,
      inferredLanguagesFrameworks: [ { name: "Node.js", confidence: "medium" as const }, { name: "JavaScript", confidence: "low" as const } ],
      dependencies: { npm: npmDependencies },
      keyFiles: keyFilesArr,
      potentialArchitecturalComponents: [{ name: "Main Logic", type: "module", relatedFiles: [packageData.main || "app.js"] }],
      directoryStructureSummary: [], parsingErrors: [],
    };
  }

  // Fallback to a more generic mock if no specific hint matched
  await new Promise(resolve => setTimeout(resolve, 1000));
  const projectNameFromPath = input.projectStoragePath.split('/').pop()?.split('.')[0] || "MockProjectFromPath";
  return {
    projectName: `Generic Mock for ${projectNameFromPath}`,
    projectSummary: `This is a generic mock response. No specific file parsing was triggered by hints. Full project analysis capabilities are not yet implemented. User hint: ${input.userHint || 'N/A'}`,
    inferredLanguagesFrameworks: [{ name: "Unknown", confidence: "low" as const }],
    dependencies: {}, directoryStructureSummary: [], keyFiles: [], potentialArchitecturalComponents: [],
    parsingErrors: ["Full project analysis not implemented; returned generic mock based on hint or lack thereof."],
  };
}

export const projectStructureAnalyzerTool = ai.defineTool(
  {
    name: 'projectStructureAnalyzerTool',
    description: 'Analyzes a software project\'s structure from a provided storage path (e.g., a ZIP archive in cloud storage) and returns a structured JSON summary. This tool unpacks archives, identifies key files, infers languages/frameworks, lists dependencies, and summarizes directory structures and potential architectural components. It also attempts to parse READMEs for project summaries.',
    inputSchema: ProjectAnalysisInputSchema,
    outputSchema: ProjectAnalysisOutputSchema,
  },
  analyzeProjectStructure
);
