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
    'manifest',
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

// Simulated Python File Contents
const SIMULATED_PY_REQUIREMENTS_TXT = `fastapi==0.100.0\nuvicorn==0.23.2\npydantic==2.0.3`;
const SIMULATED_PY_README_MD = `# My Simulated Python API\n\nA sample FastAPI application.`;
const SIMULATED_PY_MAIN_PY = `from fastapi import FastAPI\nfrom .core import services\nfrom .utils.helpers import format_response\n\napp = FastAPI()\n\n@app.get("/")\nasync def root():\n    message = services.get_main_message()\n    return format_response({"message": message})\n\nclass AdminUser:\n    def __init__(self, username):\n        self.username = username\n\ndef run_server():\n    print("Server would run here")\n\nif __name__ == "__main__":\n    run_server()`;
const SIMULATED_PY_MODELS_PY = `from pydantic import BaseModel\n\nclass Item(BaseModel):\n    name: str\n    price: float\n\nclass User(BaseModel):\n    username: str\n    email: str`;
const SIMULATED_PY_SERVICES_PY = `from .models import Item\n\ndef get_main_message():\n    return "Data from core service"\n\nclass ItemService:\n    def get_item(self, item_id: int) -> Item | None:\n        if item_id == 1:\n            return Item(name="Sample Item", price=10.0)\n        return None`;
const SIMULATED_PY_HELPERS_PY = `import os\n\ndef format_response(data: dict):\n    return { "status": "success", "data": data }\n\ndef _internal_helper():\n    pass`;

// Simulated Java File Contents
const SIMULATED_POM_XML = `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>myservice</artifactId>
    <version>1.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.5</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>

    <properties>
        <java.version>11</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`;

const SIMULATED_JAVA_README_MD = `
# MyService Java Application

This is a sample Spring Boot application demonstrating a simple item service.
It uses Spring Web, Spring Data JPA, and H2 database.

Key features:
- REST API for items
- Basic CRUD operations
`;

const SIMULATED_JAVA_MAIN_APP = `
package com.example.myservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MyServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(MyServiceApplication.class, args);
    }

    public String getGreeting() {
        return "Hello from MyServiceApplication!";
    }
}
`;

// Simulated C# File Contents
const SIMULATED_CSPROJ_CONTENT = `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.0" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.4.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="8.0.0" />
  </ItemGroup>
</Project>
`;

const SIMULATED_CSHARP_README_MD = `
# MyWebApp C# ASP.NET Core

A sample ASP.NET Core web API for managing products.
Uses in-memory database for simplicity.

Features:
- Product CRUD operations
- Swagger/OpenAPI documentation
`;

const SIMULATED_CSHARP_PROGRAM_CS = `
using Microsoft.EntityFrameworkCore;
using MyWebApp.Models;
using MyWebApp.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddDbContext<ProductDbContext>(opt =>
    opt.UseInMemoryDatabase("ProductList"));
builder.Services.AddScoped<IProductService, ProductService>();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

public partial class Program { } // For testing

app.Run();
`;

const SIMULATED_CSHARP_APPSETTINGS_JSON = `
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\\\mssqllocaldb;Database=aspnet-MyWebApp-guid;Trusted_Connection=True;MultipleActiveResultSets=true"
  }
}
`;

const SIMULATED_CSHARP_CONTROLLER = `
using Microsoft.AspNetCore.Mvc;
using MyWebApp.Models;
using MyWebApp.Services;
using System.Collections.Generic; // For IEnumerable
using System.Threading.Tasks; // For Task

namespace MyWebApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetProducts()
    {
        return Ok(await _productService.GetAllProductsAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetProduct(long id)
    {
        var product = await _productService.GetProductByIdAsync(id);
        if (product == null)
        {
            return NotFound();
        }
        return Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<Product>> PostProduct(Product product)
    {
        var createdProduct = await _productService.CreateProductAsync(product);
        return CreatedAtAction(nameof(GetProduct), new { id = createdProduct.Id }, createdProduct);
    }
}
`;

const SIMULATED_CSHARP_MODEL = `
namespace MyWebApp.Models;

public class Product
{
    public long Id { get; set; }
    public string? Name { get; set; }
    public decimal Price { get; set; }
    public string? Description { get; set; }
}

public class ProductDbContext : Microsoft.EntityFrameworkCore.DbContext
{
    public ProductDbContext(Microsoft.EntityFrameworkCore.DbContextOptions<ProductDbContext> options)
        : base(options) { }

    public Microsoft.EntityFrameworkCore.DbSet<Product> Products { get; set; } = null!;
}
`;

const SIMULATED_CSHARP_ISERVICE = `
using MyWebApp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MyWebApp.Services;

public interface IProductService
{
    Task<IEnumerable<Product>> GetAllProductsAsync();
    Task<Product?> GetProductByIdAsync(long id);
    Task<Product> CreateProductAsync(Product product);
}
`;

const SIMULATED_CSHARP_SERVICE = `
using Microsoft.EntityFrameworkCore;
using MyWebApp.Models;
using System.Collections.Generic; // Required for List, IEnumerable
using System.Linq; // Required for ToListAsync, if used directly (though EF Core provides it on DbSet)
using System.Threading.Tasks; // Required for Task

namespace MyWebApp.Services;

public class ProductService : IProductService
{
    private readonly ProductDbContext _context;

    public ProductService(ProductDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Product>> GetAllProductsAsync()
    {
        return await _context.Products.ToListAsync();
    }

    public async Task<Product?> GetProductByIdAsync(long id)
    {
        return await _context.Products.FindAsync(id);
    }

    public async Task<Product> CreateProductAsync(Product product)
    {
        _context.Products.Add(product);
        await _context.SaveChangesAsync();
        return product;
    }
}
`;

const SIMULATED_JAVA_CONTROLLER = `
package com.example.myservice.controller;

import com.example.myservice.model.Item;
import com.example.myservice.service.ItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    @Autowired
    private ItemService itemService;

    @GetMapping("/{id}")
    public ResponseEntity<Item> getItemById(@PathVariable Long id) {
        return itemService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Item createItem(@RequestBody Item item) {
        return itemService.save(item);
    }

    public List<Item> getAllItems() {
        return itemService.findAll();
    }
}
`;

const SIMULATED_JAVA_SERVICE = `
package com.example.myservice.service;

import com.example.myservice.model.Item;
import com.example.myservice.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ItemService {

    @Autowired
    private ItemRepository itemRepository;

    public Optional<Item> findById(Long id) {
        return itemRepository.findById(id);
    }

    public Item save(Item item) {
        return itemRepository.save(item);
    }

    public List<Item> findAll() {
        return itemRepository.findAll();
    }

    private void internalLogicHelper() {
        // some internal logic
    }
}
`;

const SIMULATED_JAVA_MODEL = `
package com.example.myservice.model;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;

@Entity
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String description;

    // Constructors, getters, setters (omitted for brevity but implied by @Entity)
    public Item() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
`;

const SIMULATED_JAVA_REPO = `
package com.example.myservice.repository;

import com.example.myservice.model.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {
    // Custom query methods can be defined here
}
`;

// C# specific helper functions
const parseCsprojDependencies = (csprojContent: string): string[] => {
  const depRegex = /<PackageReference Include="(.*?)" Version="(.*?)" \/>/gm;
  const dependencies: string[] = [];
  let match;
  while ((match = depRegex.exec(csprojContent)) !== null) {
    dependencies.push(`${match[1]} (${match[2]})`); // Format: PackageName (Version)
  }
  return dependencies;
};
const extractCSharpNamespace = (csContent: string): string | null => {
  const match = csContent.match(/^namespace\s+([\w.]+)(?:\s*{)?/m);
  return match ? match[1] : null;
};
const extractCSharpUsings = (csContent: string): string[] => {
  const usingRegex = /^using\s+([\w.]+);/gm;
  const usings = new Set<string>();
  let match;
  while ((match = usingRegex.exec(csContent)) !== null) {
    usings.add(match[1]);
  }
  return Array.from(usings);
};
const extractCSharpPublicTypes = (csContent: string): string[] => { // Classes, Interfaces, Enums
  const typeRegex = /^public\s+(?:partial\s+)?(?:abstract\s+|sealed\s+)?(?:class|interface|enum|record)\s+(\w+)/gm;
  const types: string[] = [];
  let match;
  while ((match = typeRegex.exec(csContent)) !== null) {
    types.push(match[1]);
  }
  return types;
};
const extractCSharpPublicMethods = (csContent: string): string[] => {
  const methodRegex = /^\s*public\s+(?:static\s+|virtual\s+|override\s+|async\s+)?(?:[\w<>\s\[\].,?]+)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w.,\s]+)?\s*[{]/gm;
  const methods: string[] = [];
  let match;
  while ((match = methodRegex.exec(csContent)) !== null) {
    methods.push(match[1]);
  }
  return methods;
};
const extractCSharpPublicProperties = (csContent: string): string[] => {
  const propRegex = /^\s*public\s+[\w<>\s\[\].,?]+\s+(\w+)\s*\{\s*get;\s*(?:init;|set;)?\s*\}/gm;
  const props: string[] = [];
  let match;
  while ((match = propRegex.exec(csContent)) !== null) {
    props.push(match[1]);
  }
  return props;
};
const parseAppSettingsJsonKeys = (jsonContent: string): string[] => {
    try {
        const parsed = JSON.parse(jsonContent);
        // Get top-level keys and nested keys like "Logging:LogLevel:Default"
        const keys: string[] = [];
        const recurseKeys = (obj: any, prefix = "") => {
            Object.keys(obj).forEach(key => {
                keys.push(prefix + key);
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    recurseKeys(obj[key], prefix + key + ":");
                }
            });
        };
        recurseKeys(parsed);
        return keys;
    } catch (e) {
        console.error("Error parsing appsettings.json content:", e);
        return [];
    }
};

// Helper function to extract H1 from Markdown (simplified)
const getReadmeSummary = (readmeContent: string): string | undefined => {
  const h1Match = readmeContent.match(/^#\s*(.*)/m);
  return h1Match ? h1Match[1] : undefined;
};

// Java specific helper functions
const parsePomXmlDependencies = (xmlContent: string): string[] => {
  const depRegex = /<dependency>\s*<groupId>(.*?)<\/groupId>\s*<artifactId>(.*?)<\/artifactId>[\s\S]*?<\/dependency>/gm;
  const dependencies: string[] = [];
  let match;
  while ((match = depRegex.exec(xmlContent)) !== null) {
    dependencies.push(`${match[1]}:${match[2]}`);
  }
  return dependencies;
};
const extractJavaPackage = (javaContent: string): string | null => {
  const match = javaContent.match(/^package\s+([\w.]+);/m);
  return match ? match[1] : null;
};
const extractJavaImports = (javaContent: string): string[] => {
  const importRegex = /^import\s+([\w.*]+);/gm;
  const imports = new Set<string>();
  let match;
  while ((match = importRegex.exec(javaContent)) !== null) {
    imports.add(match[1]);
  }
  return Array.from(imports);
};
const extractJavaPublicClassesInterfaces = (javaContent: string): string[] => {
  const classRegex = /^public\s+(?:class|interface)\s+(\w+)/gm;
  const classes: string[] = [];
  let match;
  while ((match = classRegex.exec(javaContent)) !== null) {
    classes.push(match[1]);
  }
  return classes;
};
const extractJavaPublicMethods = (javaContent: string): string[] => {
  const methodRegex = /^\s*public\s+(?:static\s+|final\s+)?(?:[\w<>\s\[\].,?]+)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w.,\s]+)?\s*[{;]/gm;
  const methods: string[] = [];
  let match;
  while ((match = methodRegex.exec(javaContent)) !== null) {
    methods.push(match[1]);
  }
  return methods;
};

// Helper function to "extract" function names from JS (simplified regex)
const extractJsFunctions = (jsContent: string): string[] => {
  const functionRegex = /function\s+([A-Za-z0-9_]+)\s*\(|const\s+([A-Za-z0-9_]+)\s*=\s*\(.*\)\s*=>|const\s+([A-Za-z0-9_]+)\s*=\s*function|module\.exports\s*\.\s*([A-Za-z0-9_]+)\s*=\s*function|module\.exports\s*=\s*{\s*([A-Za-z0-9_,\s]+)\s*}/g;
  const symbols: string[] = [];
  let match;
  while ((match = functionRegex.exec(jsContent)) !== null) {
    if (match[1]) symbols.push(match[1]);
    if (match[2]) symbols.push(match[2]);
    if (match[3]) symbols.push(match[3]);
    if (match[4]) symbols.push(match[4]);
    if (match[5]) {
        match[5].split(',').forEach(s => symbols.push(s.trim()));
    }
  }
  return symbols.filter(Boolean).filter((s, index, self) => self.indexOf(s) === index);
};

// Python specific helper functions
const extractPyImports = (pyContent: string): string[] => {
  const importRegex = /^import\s+([\w.]+)|^from\s+([\w.]+)\s+import/gm;
  const imports = new Set<string>();
  let match;
  while ((match = importRegex.exec(pyContent)) !== null) {
    imports.add(match[1] || match[2]);
  }
  return Array.from(imports);
};
const extractPyClasses = (pyContent: string): string[] => {
  const classRegex = /^class\s+([A-Za-z_][A-Za-z0-9_]*)\(?[^)]*\)?:/gm;
  const classes: string[] = [];
  let match;
  while ((match = classRegex.exec(pyContent)) !== null) {
    classes.push(match[1]);
  }
  return classes;
};
const extractPyFunctions = (pyContent: string): string[] => {
  const funcRegex = /^def\s+([A-Za-z_][A-Za-z0-9_]*)\(.*\):/gm;
  const functions: string[] = [];
  let match;
  while ((match = funcRegex.exec(pyContent)) !== null) {
    if (!match[1].startsWith('_')) {
        functions.push(match[1]);
    }
  }
  return functions;
};
const parseRequirementsTxt = (txtContent: string): string[] => {
  return txtContent.split('\n')
    .map(line => line.split('==')[0].trim())
    .filter(pkg => pkg.length > 0);
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
    await new Promise(resolve => setTimeout(resolve, 500));
    return FIXED_MOCK_PROJECT_A_ANALYSIS;
  } else {
    // Fallback to a more generic mock if no package.json hint and not fixed mock
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate some delay
    const projectNameFromPath = input.projectStoragePath.split('/').pop()?.split('.')[0] || "MockProjectFromPath";
    return {
      projectName: `Generic Mock for ${projectNameFromPath}`,
      projectSummary: `This is a generic mock response. No package.json was found or processed based on the hint. Full project analysis capabilities are not yet implemented. User hint: ${input.userHint || 'N/A'}`,
      inferredLanguagesFrameworks: [{ name: "Unknown", confidence: "low" }],
      dependencies: {},
      directoryStructureSummary: [],
      keyFiles: [],
      potentialArchitecturalComponents: [],
      parsingErrors: ["Full project analysis not implemented; returned generic mock based on hint or lack thereof."],
    };
  }
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
