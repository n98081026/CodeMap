/**
 * @fileOverview A Genkit tool to analyze project structure.
 * This tool can now perform basic real analysis for Node.js, Python, and C# projects
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

const DependencyMapSchema = z.record(z.array(z.string())).describe('Key-value map of dependency types (e.g., npm, pip, maven, nuget) to arrays of dependency names.');

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
    'manifest', // For package.json, requirements.txt, pom.xml, .csproj etc.
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

    // Node.js analysis
    const packageJsonFileObject = filesList.find(f => f.name.toLowerCase() === 'package.json');
    if (packageJsonFileObject) {
        // ... (Node.js analysis logic as before) ...
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

    // Python analysis
    const requirementsTxtFile = filesList.find(f => f.name.toLowerCase() === 'requirements.txt');
    const setupPyFile = filesList.find(f => f.name.toLowerCase() === 'setup.py');
    const pyprojectTomlFile = filesList.find(f => f.name.toLowerCase() === 'pyproject.toml');
    const pyFiles = filesList.filter(f => f.name.endsWith('.py'));
    let isPythonProject = pyFiles.length > 0;

    if (requirementsTxtFile || setupPyFile || pyprojectTomlFile) {
        isPythonProject = true;
    }
    // ... (Python analysis logic as before, including parseRequirementsTxt, metadata from setup.py/pyproject.toml) ...
    if (isPythonProject) {
        const pythonLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Python");
        if (pythonLang) pythonLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Python", confidence: "high" });

        if (requirementsTxtFile) {
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
                        const pipLang = output.inferredLanguagesFrameworks?.find(l => l.name === "pip");
                        if (pipLang) pipLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "pip", confidence: "high" });
                    }
                } catch (e: any) { output.parsingErrors?.push(`Error parsing requirements.txt: ${e.message}`); }
            } else { output.parsingErrors?.push(`${requirementsTxtFile.name} found in listing but could not be downloaded.`);}
        }
        // ... (metadata extraction and component inference for Python as before)
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
            } else { output.parsingErrors?.push(`${pyprojectTomlFile.name} found in listing but could not be downloaded.`);}
        }
        // ... (setup.py and README processing as before) ...
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
            } else { output.parsingErrors?.push(`${setupPyFile.name} found in listing but could not be downloaded.`);}
        }
        if (projectNameFromPyMetadata && (!output.projectName || output.projectName === (input.projectStoragePath.split('/').filter(Boolean).pop()))) {
            output.projectName = projectNameFromPyMetadata;
        }
        if (projectVersionFromPyMetadata) {
            const versionString = ` (Version: ${projectVersionFromPyMetadata})`;
            if (output.projectSummary && !output.projectSummary.includes(versionString)) output.projectSummary += versionString;
            else if (!output.projectSummary) output.projectSummary = `Version: ${projectVersionFromPyMetadata}`;
        }
    }


    // Java analysis
    const pomXmlFile = filesList.find(f => f.name.toLowerCase() === 'pom.xml');
    const buildGradleFile = filesList.find(f => f.name.toLowerCase() === 'build.gradle' || f.name.toLowerCase() === 'build.gradle.kts');
    const javaFiles = filesList.filter(f => f.name.endsWith('.java'));
    let isJavaProject = javaFiles.length > 0;
    if (pomXmlFile || buildGradleFile) isJavaProject = true;
    // ... (Java analysis logic as before, including parsePomXml, parseBuildGradle) ...
    if (isJavaProject) {
        const javaLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Java");
        if (javaLang) javaLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Java", confidence: "high" });

        if (pomXmlFile) {
            // ... (pom.xml processing as before)
            const pomPath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${pomXmlFile.name}` : `${input.projectStoragePath}/${pomXmlFile.name}`;
            const pomContent = await downloadProjectFile(pomPath);
            if (pomContent) {
                if (!output.keyFiles?.find(kf => kf.filePath === pomXmlFile.name)) {
                     output.keyFiles?.push({ filePath: pomXmlFile.name, type: "manifest", briefDescription: "Maven project configuration." });
                }
                try {
                    const pomData = parsePomXml(pomContent);
                    if (pomData.projectName && (!output.projectName || output.projectName === (input.projectStoragePath.split('/').filter(Boolean).pop()))) output.projectName = pomData.projectName;
                    if (pomData.version) { /* ... update summary with version ... */ }
                    if (pomData.dependencies.length > 0) output.dependencies = { ...output.dependencies, maven: pomData.dependencies };
                    const mavenLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Maven");
                    if (mavenLang) mavenLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Maven", confidence: "high" });
                } catch (e: any) { output.parsingErrors?.push(`Error parsing pom.xml: ${e.message}`);}
            } else {output.parsingErrors?.push(`${pomXmlFile.name} found in listing but could not be downloaded.`);}
        } else if (buildGradleFile) {
            // ... (build.gradle processing as before) ...
            const gradlePath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${buildGradleFile.name}` : `${input.projectStoragePath}/${buildGradleFile.name}`;
            const gradleContent = await downloadProjectFile(gradlePath);
            if (gradleContent) {
                if (!output.keyFiles?.find(kf => kf.filePath === buildGradleFile.name)) {
                    output.keyFiles?.push({ filePath: buildGradleFile.name, type: "manifest", briefDescription: "Gradle project configuration." });
                }
                try {
                    const gradleData = parseBuildGradle(gradleContent);
                    if (gradleData.projectName && (!output.projectName || output.projectName === (input.projectStoragePath.split('/').filter(Boolean).pop()))) output.projectName = gradleData.projectName;
                    if (gradleData.version) { /* ... update summary with version ... */ }
                    if (gradleData.dependencies.length > 0) output.dependencies = { ...output.dependencies, gradle: gradleData.dependencies };
                    const gradleLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Gradle");
                    if (gradleLang) gradleLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Gradle", confidence: "high" });
                } catch (e: any) { output.parsingErrors?.push(`Error parsing ${buildGradleFile.name}: ${e.message}`);}
            } else { output.parsingErrors?.push(`${buildGradleFile.name} found in listing but could not be downloaded.`);}
        }
        // ... (Spring Boot and Java entry point detection as before) ...
        const allJavaDeps = [...(output.dependencies?.maven || []), ...(output.dependencies?.gradle || [])];
        if (allJavaDeps.some(dep => dep.toLowerCase().includes('spring-boot-starter'))) {
            if (!output.inferredLanguagesFrameworks?.find(lang => lang.name === "Spring Boot")) {
                output.inferredLanguagesFrameworks?.push({ name: "Spring Boot", confidence: "medium" });
            }
            // ... add Spring Boot component ...
        }
    }

    // C# Analysis
    const csprojFiles = filesList.filter(f => f.name.toLowerCase().endsWith('.csproj'));
    const slnFile = filesList.find(f => f.name.toLowerCase().endsWith('.sln'));
    const csFiles = filesList.filter(f => f.name.toLowerCase().endsWith('.cs'));
    let isCSharpProject = csFiles.length > 0;
    if (csprojFiles.length > 0 || slnFile) isCSharpProject = true;

    if (isCSharpProject) {
        const csharpLang = output.inferredLanguagesFrameworks?.find(l => l.name === "C#");
        if (csharpLang) csharpLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "C#", confidence: "high" });

        const dotNetLang = output.inferredLanguagesFrameworks?.find(l => l.name === ".NET" || l.name.startsWith(".NET Platform"));
        if (dotNetLang) dotNetLang.confidence = "high";
        else if (!output.inferredLanguagesFrameworks?.find(l => l.name.startsWith(".NET Platform"))) {
            output.inferredLanguagesFrameworks?.push({ name: ".NET", confidence: "high" });
        }

        if (csprojFiles.length > 0) {
            let mainCsprojFile = csprojFiles.find(f => !f.name.toLowerCase().includes('test'));
            if (!mainCsprojFile) mainCsprojFile = csprojFiles[0];

            const csprojPath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${mainCsprojFile.name}` : `${input.projectStoragePath}/${mainCsprojFile.name}`;
            const csprojContent = await downloadProjectFile(csprojPath);

            if (csprojContent) {
                if (!output.keyFiles?.find(kf => kf.filePath === mainCsprojFile!.name)) {
                    output.keyFiles?.push({ filePath: mainCsprojFile!.name, type: "manifest", briefDescription: "C# project file." });
                }
                try {
                    const csprojData = parseCsproj(csprojContent, mainCsprojFile.name);
                    if (csprojData.projectName && (!output.projectName || output.projectName === (input.projectStoragePath.split('/').filter(Boolean).pop()))) {
                        output.projectName = csprojData.projectName;
                    }
                    if (csprojData.targetFramework) {
                        const frameworkString = ` (Framework: ${csprojData.targetFramework})`;
                         if (output.projectSummary && !output.projectSummary.includes(frameworkString)) output.projectSummary += frameworkString;
                         else if (!output.projectSummary) output.projectSummary = `Framework: ${csprojData.targetFramework}`;

                        if (csprojData.targetFramework.toLowerCase().startsWith('netcoreapp') || csprojData.targetFramework.toLowerCase().startsWith('net')) {
                             const dotNetVersion = csprojData.targetFramework.toLowerCase().replace('netcoreapp', 'NET Core ').replace('net','NET ');
                             const existingDotNet = output.inferredLanguagesFrameworks?.find(lang => lang.name.startsWith(".NET Platform") || lang.name === ".NET");
                             if (existingDotNet) existingDotNet.name = `.NET Platform (${dotNetVersion.trim()})`;
                             else output.inferredLanguagesFrameworks?.push({ name: `.NET Platform (${dotNetVersion.trim()})`, confidence: "high" });
                        }
                    }
                    if (csprojData.dependencies.length > 0) {
                        output.dependencies = { ...output.dependencies, nuget: csprojData.dependencies };
                    }
                } catch (e: any) {
                    output.parsingErrors?.push(`Error parsing ${mainCsprojFile.name}: ${e.message}`);
                }
            } else {
                output.parsingErrors?.push(`${mainCsprojFile.name} found in listing but could not be downloaded.`);
            }
        }
    }

    // Add other key C# files (Program.cs, Startup.cs, appsettings.json, .sln)
    const programCsFile = filesList.find(f => f.name.toLowerCase() === 'program.cs');
    const startupCsFile = filesList.find(f => f.name.toLowerCase() === 'startup.cs');
    const appsettingsJsonFile = filesList.find(f => f.name.toLowerCase() === 'appsettings.json');

    if (programCsFile && !output.keyFiles?.find(kf => kf.filePath === programCsFile.name)) {
        output.keyFiles?.push({ filePath: programCsFile.name, type: 'entry_point', briefDescription: 'Main C# application entry point.' });
    }
    if (startupCsFile && !output.keyFiles?.find(kf => kf.filePath === startupCsFile.name)) {
        output.keyFiles?.push({ filePath: startupCsFile.name, type: 'configuration', briefDescription: 'ASP.NET Core startup configuration.' });
    }
    if (appsettingsJsonFile && !output.keyFiles?.find(kf => kf.filePath === appsettingsJsonFile.name)) {
        output.keyFiles?.push({ filePath: appsettingsJsonFile.name, type: 'configuration', briefDescription: 'Application settings file.' });
    }
    if (slnFile && !output.keyFiles?.find(kf => kf.filePath === slnFile.name)) { // slnFile was defined in C# identification part
        output.keyFiles?.push({ filePath: slnFile.name, type: 'manifest', briefDescription: 'Visual Studio Solution file.' });
    }

    // Refine for ASP.NET Core if C# project
    if (isCSharpProject) {
        let isAspNetCore = false;
        // Check .csproj content (if available and parsed) for Web SDK
        // This requires csprojContent to be available here or pass relevant info from parseCsproj
        // For simplicity, we'll check dependencies for now. A better check involves SDK attribute.

        const nugetDependencies = output.dependencies?.nuget || [];
        if (nugetDependencies.some(dep => dep.toLowerCase().startsWith('microsoft.aspnetcore'))) {
            isAspNetCore = true;
        }
        // A more direct check if csprojContent was accessible here:
        // if (csprojContent && /Sdk="Microsoft\.NET\.Sdk\.Web"/i.test(csprojContent)) {
        //     isAspNetCore = true;
        // }

        if (isAspNetCore) {
            if (!output.inferredLanguagesFrameworks?.find(lang => lang.name === "ASP.NET Core")) {
                output.inferredLanguagesFrameworks?.push({ name: "ASP.NET Core", confidence: "high" });
            }
            if (!output.potentialArchitecturalComponents?.find(c => c.name.includes("ASP.NET Core"))) {
                const relatedCsFiles = [
                    csprojFiles.length > 0 ? csprojFiles[0].name : undefined, // Add main csproj
                    programCsFile?.name,
                    startupCsFile?.name,
                    appsettingsJsonFile?.name
                ].filter(Boolean) as string[];
                output.potentialArchitecturalComponents?.push({
                    name: "ASP.NET Core Application",
                    type: "service",
                    relatedFiles: relatedCsFiles,
                });
            }
        }
    }

    // README processing (generic, should be towards the end to allow project name/version to be set first)
    const readmeFile = filesList.find(f => f.name.toLowerCase() === 'readme.md' || f.name.toLowerCase() === 'readme.rst');
    if (readmeFile) {
        // ... (README processing logic as before) ...
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
        } else if (readmeFile) {
             output.parsingErrors?.push(`${readmeFile.name} found in listing but could not be downloaded.`);
        }
    }

    // Fallback language detection if nothing specific was found
    if (output.inferredLanguagesFrameworks?.length === 0) {
        const fileExtensions = new Set(filesList.map(f => f.name.substring(f.name.lastIndexOf('.')).toLowerCase()).filter(Boolean));
        if (fileExtensions.has('.js') || fileExtensions.has('.ts')) output.inferredLanguagesFrameworks?.push({ name: "JavaScript/TypeScript", confidence: "low" });
        // Python, Java, C# initial detection based on file extensions or manifests already happened
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
// listProjectFiles, parseRequirementsTxt, parsePomXml, parseBuildGradle, parseCsproj, downloadProjectFile
// ... (These functions remain as previously defined) ...
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
 * Parses basic information from pom.xml content using regex.
 * This is a simplified parser and may not cover all pom.xml variations.
 * @param content The string content of pom.xml
 * @returns An object with projectName, version, and dependencies.
 */
function parsePomXml(content: string): { projectName?: string; version?: string; dependencies: string[] } {
  const result: { projectName?: string; version?: string; dependencies: string[] } = { dependencies: [] };
  let artifactIdMatch = content.match(/<project(?:[^>]*)>[\s\S]*?<artifactId>\s*([^<]+)\s*<\/artifactId>/);
  if (artifactIdMatch && artifactIdMatch[1]) result.projectName = artifactIdMatch[1].trim();
  let versionMatch = content.match(/<project(?:[^>]*)>[\s\S]*?<version>\s*([^<]+)\s*<\/version>/);
  if (versionMatch && versionMatch[1]) result.version = versionMatch[1].trim();
  else {
    const parentVersionMatch = content.match(/<project(?:[^>]*)>[\s\S]*?<parent>\s*<version>\s*([^<]+)\s*<\/version>\s*<\/parent>/);
    if (parentVersionMatch && parentVersionMatch[1]) result.version = parentVersionMatch[1].trim();
  }
  const dependencyRegex = /<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>(?:\s*<version>([^<]+)<\/version>)?[\s\S]*?<\/dependency>/g;
  let depMatch;
  while ((depMatch = dependencyRegex.exec(content)) !== null) {
    result.dependencies.push(`${depMatch[1].trim()}:${depMatch[2].trim()}`);
  }
  return result;
}

/**
 * Parses basic information from build.gradle or build.gradle.kts content using regex.
 * This is highly simplified due to the complexity of Groovy/Kotlin DSLs.
 * @param content The string content of the Gradle build file.
 * @returns An object with projectName, version, and dependencies.
 */
function parseBuildGradle(content: string): { projectName?: string; version?: string; dependencies: string[] } {
  const result: { projectName?: string; version?: string; dependencies: string[] } = { dependencies: [] };
  const nameMatch = content.match(/(?:rootProject\.name|project\.name)\s*=\s*['"]([^'"]+)['"]/);
  if (nameMatch && nameMatch[1]) result.projectName = nameMatch[1].trim();
  const versionMatch = content.match(/^version\s*=\s*['"]([^'"]+)['"]/m);
  if (versionMatch && versionMatch[1]) result.version = versionMatch[1].trim();
  const depRegex = /(?:implementation|compile|api|compileOnly|runtimeOnly|testImplementation)\s*(?:\(([^)]+)\)|['"]([^'"]+)['"])/g;
  let depMatch;
  while ((depMatch = depRegex.exec(content)) !== null) {
    const depString = depMatch[1] || depMatch[2];
    if (depString) {
      const cleanedDepString = depString.replace(/['"]/g, '').trim();
      const parts = cleanedDepString.split(':');
      if (parts.length >= 2) { result.dependencies.push(`${parts[0].trim()}:${parts[1].trim()}`); continue; }
      const groupMatch = cleanedDepString.match(/group:\s*['"]([^'"]+)['"]/);
      const nameArtifactMatch = cleanedDepString.match(/name:\s*['"]([^'"]+)['"]/);
      if (groupMatch && groupMatch[1] && nameArtifactMatch && nameArtifactMatch[1]) { result.dependencies.push(`${groupMatch[1].trim()}:${nameArtifactMatch[1].trim()}`); continue; }
      const kotlinMatch = cleanedDepString.match(/^kotlin\s*\(\s*["']([^"']+)["']\s*\)/);
      if (kotlinMatch && kotlinMatch[1]) { result.dependencies.push(`org.jetbrains.kotlin:kotlin-${kotlinMatch[1].trim()}`); continue; }
    }
  }
  result.dependencies = [...new Set(result.dependencies)];
  return result;
}

/**
 * Parses basic information from .csproj content using regex.
 * This is a simplified parser and may not cover all .csproj variations.
 * @param content The string content of the .csproj file.
 * @param csprojFileName The name of the .csproj file, used as a fallback for project name.
 * @returns An object with projectName, targetFramework, and dependencies.
 */
function parseCsproj(content: string, csprojFileName: string): { projectName?: string; targetFramework?: string; dependencies: string[] } {
  const result: { projectName?: string; targetFramework?: string; dependencies: string[] } = { dependencies: [] };
  let assemblyNameMatch = content.match(/<AssemblyName>(.*?)<\/AssemblyName>/);
  if (assemblyNameMatch && assemblyNameMatch[1]) result.projectName = assemblyNameMatch[1].trim();
  else result.projectName = csprojFileName.replace(/\.csproj$/i, '');
  const targetFrameworkMatch = content.match(/<TargetFramework>(.*?)<\/TargetFramework>/);
  if (targetFrameworkMatch && targetFrameworkMatch[1]) result.targetFramework = targetFrameworkMatch[1].trim();
  else {
    const targetFrameworksMatch = content.match(/<TargetFrameworks>(.*?)<\/TargetFrameworks>/);
    if (targetFrameworksMatch && targetFrameworksMatch[1]) result.targetFramework = targetFrameworksMatch[1].trim().split(';')[0];
  }
  const packageRefRegex = /<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]+)")?\s*\/?>/g;
  let pkgMatch;
  while ((pkgMatch = packageRefRegex.exec(content)) !== null) {
    const packageName = pkgMatch[1].trim();
    const packageVersion = pkgMatch[2] ? pkgMatch[2].trim() : undefined;
    result.dependencies.push(packageVersion ? `${packageName} (${packageVersion})` : packageName);
  }
  result.dependencies = [...new Set(result.dependencies)];
  return result;
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
