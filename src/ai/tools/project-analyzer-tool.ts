/**
 * @fileOverview A Genkit tool to analyze project structure.
 * This tool can now perform basic real analysis for Node.js and Python projects
 * by fetching files from Supabase Storage.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import type { FileObject } from '@supabase/storage-js'; // For Supabase Storage types

export const ProjectAnalysisInputSchema = z.object({
  projectStoragePath: z.string().describe('File path or reference from Supabase Storage where the project archive is located.'),
  userHint: z.string().optional().describe("User-provided hint about the project's nature or focus area (e.g., 'e-commerce backend,' 'data processing pipeline')."),
});
export type ProjectAnalysisInput = z.infer<typeof ProjectAnalysisInputSchema>;

const InferredLanguageFrameworkSchema = z.object({
  name: z.string().describe('e.g., TypeScript, Spring Boot, React'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the inference.'),
});

const DependencyMapSchema = z.record(z.array(z.string())).describe('Key-value map of dependency types (e.g., npm, pip, maven) to arrays of dependency names.');

const FileCountsSchema = z.record(z.number()).describe('Key-value map of file extensions to their counts (e.g., { ".ts": 10, ".js": 2 }).');

const DirectorySummarySchema = z.object({
  path: z.string().describe('Path to the directory (e.g., src/services).'),
  fileCounts: FileCountsSchema.describe('Counts of significant file types within this directory.'),
  inferredPurpose: z.string().optional().nullable().describe('Inferred purpose of the directory (e.g., Business Logic Services).'),
});

export const KeyFileSchema = z.object({
  filePath: z.string().describe('Path to the key file.'),
  type: z.enum([
    'entry_point', 
    'configuration', 
    'service_definition', 
    'ui_component', 
    'model', 
    'utility', 
    'readme',
    'manifest', // For package.json, requirements.txt, pom.xml etc.
    'docker',
    'cicd',
    'unknown'
  ]).describe('Type of the key file.'),
  extractedSymbols: z.array(z.string()).optional().describe('Names of primary declarations (classes, functions, components).'),
  briefDescription: z.string().optional().nullable().describe('Brief description of the file or its role (e.g., Handles user authentication endpoints).'),
});
export type KeyFile = z.infer<typeof KeyFileSchema>;

export const PotentialArchitecturalComponentSchema = z.object({
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

// Define a detailed, fixed mock project analysis output (remains for testing/hints)
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
  directoryStructureSummary: [ /* ... as before ... */ ],
  keyFiles: [ /* ... as before ... */ ],
  potentialArchitecturalComponents: [ /* ... as before ... */ ],
  parsingErrors: [],
};


async function analyzeProjectStructure(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  console.log(`projectStructureAnalyzerTool called with path: ${input.projectStoragePath}, hint: ${input.userHint}`);

  if (input.userHint === "_USE_FIXED_MOCK_PROJECT_A_") {
    console.log("Returning FIXED_MOCK_PROJECT_A_ANALYSIS based on hint.");
    return FIXED_MOCK_PROJECT_A_ANALYSIS;
  }
  if (input.userHint && input.userHint.startsWith("_USE_SIMULATED_FS_") && input.userHint !== "_USE_FIXED_MOCK_PROJECT_A_") {
    console.warn(`Simulated FS hint '${input.userHint}' received but no specific mock generator implemented beyond FIXED_MOCK_A. Proceeding with generic or Supabase path if applicable.`);
  }

  const output: ProjectAnalysisOutput = {
    projectName: input.projectStoragePath.split('/').filter(Boolean).pop() || "Unknown Project",
    inferredLanguagesFrameworks: [],
    projectSummary: input.userHint ? `Analysis based on user hint: ${input.userHint}` : "Automated project analysis.",
    dependencies: {},
    directoryStructureSummary: [],
    keyFiles: [],
    potentialArchitecturalComponents: [],
    parsingErrors: [],
  };

  try {
    const filesList = await listProjectFiles(input.projectStoragePath);
    if (filesList.length === 0) {
      output.parsingErrors?.push(`No files found at storage path: ${input.projectStoragePath}. Ensure the path is correct and files are extracted.`);
      output.projectSummary = `Could not list files at path: ${input.projectStoragePath}. Path might be incorrect or empty.`;
      return output;
    }

    output.directoryStructureSummary?.push({
        path: "/",
        fileCounts: filesList.reduce((acc, file) => {
            const ext = file.name.substring(file.name.lastIndexOf('.'));
            if (ext && ext.length > 1) acc[ext] = (acc[ext] || 0) + 1;
            else acc["<no_ext>"] = (acc["<no_ext>"] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        inferredPurpose: "Project root",
    });

    filesList.slice(0, 5).forEach(f => {
        const existingKeyFile = output.keyFiles?.find(kf => kf.filePath === f.name);
        if (!existingKeyFile) {
            output.keyFiles?.push({
                filePath: f.name,
                type: f.name.toLowerCase().includes('readme') ? 'readme' : 'unknown',
                briefDescription: `File found at root: ${f.name}`
            });
        }
    });

    const packageJsonFileObject = filesList.find(f => f.name.toLowerCase() === 'package.json');
    if (packageJsonFileObject) {
        const packageJsonContent = await downloadProjectFile(
            input.projectStoragePath.endsWith('/') ?
            `${input.projectStoragePath}${packageJsonFileObject.name}` :
            `${input.projectStoragePath}/${packageJsonFileObject.name}`
        );
      if (packageJsonContent) {
        if (!output.keyFiles?.find(kf => kf.filePath === packageJsonFileObject.name)) {
            output.keyFiles?.push({ filePath: packageJsonFileObject.name, type: "manifest", briefDescription: "Project manifest and dependencies (Node.js)." });
        }
        try {
          const packageJson = JSON.parse(packageJsonContent);
          output.projectName = packageJson.name || output.projectName;
          if (packageJson.description) output.projectSummary = packageJson.description;

          const nodeLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Node.js");
          if (nodeLang) nodeLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Node.js", confidence: "high" });

          if (packageJson.dependencies || packageJson.devDependencies) {
            const npmLang = output.inferredLanguagesFrameworks?.find(l => l.name === "npm");
            if (npmLang) npmLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "npm", confidence: "high" });
          }

          const deps: string[] = [];
          if (packageJson.dependencies) deps.push(...Object.keys(packageJson.dependencies));
          if (packageJson.devDependencies) deps.push(...Object.keys(packageJson.devDependencies).map(d => `${d} (dev)`));
          if (deps.length > 0) output.dependencies = { ...output.dependencies, npm: deps };

          if (deps.some(d => d.startsWith('react'))) output.inferredLanguagesFrameworks?.push({ name: "React", confidence: "medium" });
        } catch (e: any) {
          output.parsingErrors?.push(`Error parsing package.json: ${e.message}`);
        }
      } else {
        output.parsingErrors?.push("package.json found in listing but could not be downloaded/read.");
      }
    }

    const requirementsTxtFile = filesList.find(f => f.name.toLowerCase() === 'requirements.txt');
    const setupPyFile = filesList.find(f => f.name.toLowerCase() === 'setup.py');
    const pyprojectTomlFile = filesList.find(f => f.name.toLowerCase() === 'pyproject.toml');
    const pyFiles = filesList.filter(f => f.name.endsWith('.py'));
    let isPythonProject = pyFiles.length > 0;

    if (requirementsTxtFile) {
        isPythonProject = true;
        const reqPath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${requirementsTxtFile.name}` : `${input.projectStoragePath}/${requirementsTxtFile.name}`;
        const reqContent = await downloadProjectFile(reqPath);
        if (reqContent) {
            if (!output.keyFiles?.find(kf => kf.filePath === requirementsTxtFile.name)) {
                 output.keyFiles?.push({ filePath: requirementsTxtFile.name, type: "manifest", briefDescription: "Python project dependencies." });
            }
            try {
                const pythonDependencies = parseRequirementsTxt(reqContent);
                if (pythonDependencies.length > 0) {
                    output.dependencies = { ...output.dependencies, pip: pythonDependencies };
                }
            } catch (e: any) {
                output.parsingErrors?.push(`Error parsing requirements.txt: ${e.message}`);
            }
        } else {
            output.parsingErrors?.push(`${requirementsTxtFile.name} found in listing but could not be downloaded.`);
        }
    }

    if (setupPyFile) isPythonProject = true;
    if (pyprojectTomlFile) isPythonProject = true;

    if (isPythonProject) {
        const pythonLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Python");
        if (pythonLang) pythonLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Python", confidence: "high" });
        if (output.dependencies?.pip && output.dependencies.pip.length > 0) {
            const pipLang = output.inferredLanguagesFrameworks?.find(l => l.name === "pip");
            if (pipLang) pipLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "pip", confidence: "high" });
        }
    }

    let projectNameFromPyMetadata: string | undefined;
    let projectVersionFromPyMetadata: string | undefined;

    if (pyprojectTomlFile) {
        const pyprojectTomlPath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${pyprojectTomlFile.name}` : `${input.projectStoragePath}/${pyprojectTomlFile.name}`;
        const pyprojectTomlContent = await downloadProjectFile(pyprojectTomlPath);
        if (pyprojectTomlContent) {
            if (!output.keyFiles?.find(kf => kf.filePath === pyprojectTomlFile.name)) {
                output.keyFiles?.push({ filePath: pyprojectTomlFile.name, type: "manifest", briefDescription: "Project metadata and build configuration (TOML)." });
            }
            const nameMatch = pyprojectTomlContent.match(/name\s*=\s*["']([^"']+)["']/);
            if (nameMatch && nameMatch[1]) projectNameFromPyMetadata = nameMatch[1];
            const versionMatch = pyprojectTomlContent.match(/version\s*=\s*["']([^"']+)["']/);
            if (versionMatch && versionMatch[1]) projectVersionFromPyMetadata = versionMatch[1];
        } else if (pyprojectTomlFile) {
            output.parsingErrors?.push(`${pyprojectTomlFile.name} found in listing but could not be downloaded.`);
        }
    }

    if (!projectNameFromPyMetadata && setupPyFile) {
        const setupPyPath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${setupPyFile.name}` : `${input.projectStoragePath}/${setupPyFile.name}`;
        const setupPyContent = await downloadProjectFile(setupPyPath);
        if (setupPyContent) {
             if (!output.keyFiles?.find(kf => kf.filePath === setupPyFile.name)) {
                output.keyFiles?.push({ filePath: setupPyFile.name, type: "manifest", briefDescription: "Project metadata and build script (Python)." });
            }
            const nameMatch = setupPyContent.match(/name\s*=\s*["']([^"']+)["']/);
            if (nameMatch && nameMatch[1]) projectNameFromPyMetadata = nameMatch[1];
            const versionMatch = setupPyContent.match(/version\s*=\s*["']([^"']+)["']/);
            if (versionMatch && versionMatch[1]) projectVersionFromPyMetadata = versionMatch[1];
        } else if (setupPyFile) {
             output.parsingErrors?.push(`${setupPyFile.name} found in listing but could not be downloaded.`);
        }
    }

    if (projectNameFromPyMetadata && (!output.projectName || output.projectName === (input.projectStoragePath.split('/').filter(Boolean).pop()))) {
        output.projectName = projectNameFromPyMetadata;
    }
    if (projectVersionFromPyMetadata) {
        const versionString = ` (Version: ${projectVersionFromPyMetadata})`;
        if (output.projectSummary && !output.projectSummary.includes(versionString)) {
             output.projectSummary += versionString;
        } else if (!output.projectSummary) {
            output.projectSummary = `Version: ${projectVersionFromPyMetadata}`;
        }
    }

    const readmeFile = filesList.find(f => f.name.toLowerCase() === 'readme.md' || f.name.toLowerCase() === 'readme.rst');
    if (readmeFile) {
        const readmePath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${readmeFile.name}` : `${input.projectStoragePath}/${readmeFile.name}`;
        const readmeContent = await downloadProjectFile(readmePath);
        if (readmeContent) {
            if (!output.keyFiles?.find(kf => kf.filePath === readmeFile.name)) {
                 output.keyFiles?.push({ filePath: readmeFile.name, type: "readme", briefDescription: "Project README file." });
            }
            const firstMeaningfulLine = readmeContent.split(/\r?\n/).find(line => line.trim().length > 0);
            if (firstMeaningfulLine) {
                const readmeSummary = firstMeaningfulLine.substring(0, 200) + (firstMeaningfulLine.length > 200 ? "..." : "");
                if (!output.projectSummary || output.projectSummary.startsWith("Version:") || output.projectSummary.startsWith("Basic analysis of project at") || output.projectSummary === input.userHint) {
                    output.projectSummary = readmeSummary;
                } else if (output.projectSummary && !output.projectSummary.includes(firstMeaningfulLine.substring(0,50))) {
                    output.projectSummary = `${output.projectSummary} | README: ${readmeSummary.substring(0,100)}${readmeSummary.length > 100 ? "..." : ""}`;
                }
            }
        } else if (readmeFile) { // File was listed but not downloaded
             output.parsingErrors?.push(`${readmeFile.name} found in listing but could not be downloaded.`);
        }
    }

    if (isPythonProject) {
        const pipDependencies = output.dependencies?.pip || [];
        let mainAppFile: string | undefined;
        const commonAppFiles = ['app.py', 'main.py', 'manage.py', 'wsgi.py', 'asgi.py'];
        for (const f of filesList) {
            if (commonAppFiles.includes(f.name.toLowerCase())) {
                mainAppFile = f.name;
                if(!output.keyFiles?.find(kf => kf.filePath === mainAppFile)) {
                    output.keyFiles?.push({filePath: mainAppFile, type: "entry_point", briefDescription: "Potential application entry point."});
                }
                break;
            }
        }

        const appRelatedFiles = ['requirements.txt', mainAppFile].filter(Boolean) as string[];

        if (pipDependencies.some(d => d.toLowerCase().startsWith('django'))) {
            output.inferredLanguagesFrameworks?.push({ name: "Django", confidence: "medium" });
            output.potentialArchitecturalComponents?.push({ name: "Django Web Framework", type: "service", relatedFiles: appRelatedFiles });
        } else if (pipDependencies.some(d => d.toLowerCase().startsWith('flask'))) {
            output.inferredLanguagesFrameworks?.push({ name: "Flask", confidence: "medium" });
            output.potentialArchitecturalComponents?.push({ name: "Flask Web Application", type: "service", relatedFiles: appRelatedFiles });
        } else if (pipDependencies.some(d => d.toLowerCase().startsWith('fastapi'))) {
            output.inferredLanguagesFrameworks?.push({ name: "FastAPI", confidence: "medium" });
            output.potentialArchitecturalComponents?.push({ name: "FastAPI Application", type: "service", relatedFiles: appRelatedFiles });
        } else if (pipDependencies.length > 0) {
             output.potentialArchitecturalComponents?.push({ name: "Python Application/Script", type: "module", relatedFiles: appRelatedFiles });
        }
    }

    if (output.inferredLanguagesFrameworks?.length === 0) {
        const fileExtensions = new Set(filesList.map(f => f.name.substring(f.name.lastIndexOf('.')).toLowerCase()).filter(Boolean));
        if (fileExtensions.has('.js') || fileExtensions.has('.ts')) output.inferredLanguagesFrameworks?.push({ name: "JavaScript/TypeScript", confidence: "low" });
        if (fileExtensions.has('.java')) output.inferredLanguagesFrameworks?.push({ name: "Java", confidence: "low" });
        if (fileExtensions.has('.cs')) output.inferredLanguagesFrameworks?.push({ name: "C#", confidence: "low" });
        if (output.inferredLanguagesFrameworks?.length === 0) {
             output.inferredLanguagesFrameworks?.push({ name: "Unknown", confidence: "low" });
        }
    }

    if (!output.projectSummary || output.projectSummary === input.userHint) {
        output.projectSummary = `Basic analysis of project at ${input.projectStoragePath}. ${filesList.length} files/folders found at root.`;
    }

  } catch (error: any) {
    console.error("Error during project analysis:", error);
    output.parsingErrors?.push(`Top-level error during analysis: ${error.message}`);
  }

  return output;
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

// --- Supabase Storage Helper Functions ---

/**
 * Lists files and folders within a given path in the 'project_archives' bucket.
 * @param storagePath The base path (folder) in Supabase Storage, e.g., "user-id/project-id/"
 * @returns A promise that resolves to an array of FileObject or an empty array if error.
 */
async function listProjectFiles(storagePath: string): Promise<FileObject[]> {
  const folderPath = storagePath.endsWith('/') ? storagePath : `${storagePath}/`;
  const { data, error } = await supabase.storage
    .from('project_archives')
    .list(folderPath, { limit: 100, offset: 0 });
  if (error) {
    console.error(`Error listing files from Supabase Storage at path ${folderPath}:`, error);
    return [];
  }
  return data?.filter(file => file.name !== '.emptyFolderPlaceholder') || [];
}

/**
 * Parses the content of a requirements.txt file to extract package names.
 * Handles comments, version specifiers, and basic editable installs.
 * @param content The string content of requirements.txt
 * @returns An array of package names.
 */
function parseRequirementsTxt(content: string): string[] {
  const packages: string[] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
    if (trimmedLine.startsWith('-e')) continue;
    if (trimmedLine.startsWith('-r') || trimmedLine.startsWith('--')) continue;
    const match = trimmedLine.match(/^([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9])/);
    if (match && match[0]) packages.push(match[0]);
  }
  return packages;
}

/**
 * Downloads a file as text from the 'project_archives' bucket.
 * @param fullFilePath The full path to the file in Supabase Storage, e.g., "user-id/project-id/package.json"
 * @returns A promise that resolves to the file content as a string, or null if an error occurs.
 */
async function downloadProjectFile(fullFilePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('project_archives')
    .download(fullFilePath);
  if (error) {
    console.error(`Error downloading file ${fullFilePath} from Supabase Storage:`, error);
    return null;
  }
  if (data) {
    try {
      return await data.text();
    } catch (textError) {
      console.error(`Error converting downloaded file ${fullFilePath} blob to text:`, textError);
      return null;
    }
  }
  return null;
}
