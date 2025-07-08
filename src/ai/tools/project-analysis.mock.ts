import { ProjectAnalysisOutput } from './project-analyzer-tool';

export const FIXED_MOCK_PROJECT_A_ANALYSIS: ProjectAnalysisOutput = {
  projectName: 'Mock E-Commerce API',
  inferredLanguagesFrameworks: [
    { name: 'Node.js', confidence: 'high' },
    { name: 'JavaScript', confidence: 'high' },
  ],
  projectSummary:
    'This is a fixed mock analysis for a standard E-Commerce API project. It includes typical components like User Service, Product Service, Order Service, and a Payment Gateway integration.',
  dependencies: { npm: ['express', 'lodash', 'jsonwebtoken'] },
  directoryStructureSummary: [
    { path: 'src', fileCounts: { '.js': 20 }, inferredPurpose: 'Source Code' },
    {
      path: 'src/services',
      fileCounts: { '.js': 4 },
      inferredPurpose: 'Service Layer',
    },
    { path: 'tests', fileCounts: { '.js': 10 }, inferredPurpose: 'Tests' },
  ],
  keyFiles: [
    {
      filePath: 'src/services/UserService.js',
      type: 'service_definition',
      briefDescription: 'Handles user authentication and profile management.',
      extractedSymbols: ['UserService', 'login', 'register'],
    },
    {
      filePath: 'src/services/ProductService.js',
      type: 'service_definition',
      briefDescription: 'Manages product catalog and inventory.',
      extractedSymbols: ['ProductService', 'listProducts'],
    },
    {
      filePath: 'package.json',
      type: 'manifest',
      briefDescription: 'Node.js project manifest.',
    },
  ],
  potentialArchitecturalComponents: [
    {
      name: 'User Service Component',
      type: 'service',
      relatedFiles: ['src/services/UserService.js'],
    },
    {
      name: 'Product Service Component',
      type: 'service',
      relatedFiles: ['src/services/ProductService.js'],
    },
  ],
  analyzedFileName: 'mock-ecommerce-api.zip',
  effectiveFileType: 'zip',
  contentType: 'application/zip',
  fileSize: 123456,
  isBinary: true, // ZIP is binary
  analysisSummary: 'Mock analysis completed for mock-ecommerce-api.zip.', // More generic summary here
  detailedNodes: [
    {
      id: 'mock_service_user_class',
      label: 'UserService (class from UserService.js)',
      type: 'js_class',
      details:
        'Handles user authentication and profile management. (Mock Detail)',
      lineNumbers: '20-80',
      structuredInfo: {
        name: 'UserService',
        kind: 'class',
        methods: ['login', 'register', 'getProfile'],
      },
    },
    {
      id: 'mock_service_product_class',
      label: 'ProductService (class from ProductService.js)',
      type: 'js_class',
      details: 'Manages product catalog and inventory. (Mock Detail)',
      lineNumbers: '81-150',
      structuredInfo: {
        name: 'ProductService',
        kind: 'class',
        methods: ['listProducts', 'addProduct', 'removeProduct'],
      },
    },
  ],
  parsingErrors: [],
};
