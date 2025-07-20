import { ProjectAnalysisOutput } from './project-analyzer-tool';

export const MOCK_PROJECT_ANALYSIS_OUTPUT: ProjectAnalysisOutput = {
  overallSummary:
    'This project is a simple web server that provides a REST API for managing a list of users.',
  nodes: [
    {
      id: 'src/index.ts-function-startServer',
      label: 'startServer (function)',
      type: 'ts_function',
      details:
        'This function starts the Express server on a specified port. It also applies middleware for JSON parsing and CORS.',
      code: 'function startServer() { ... }',
      summary: 'Starts the Express server.',
      filePath: 'src/index.ts',
      startLine: 10,
      endLine: 25,
    },
    {
      id: 'src/routes/users.ts-function-getUsers',
      label: 'getUsers (function)',
      type: 'ts_function',
      details:
        'This function handles GET requests to /api/users, returning a list of all users.',
      code: 'function getUsers(req, res) { ... }',
      summary: 'Returns all users.',
      filePath: 'src/routes/users.ts',
      startLine: 5,
      endLine: 12,
    },
    {
      id: 'src/routes/users.ts-function-addUser',
      label: 'addUser (function)',
      type: 'ts_function',
      details:
        'This function handles POST requests to /api/users, adding a new user to the list.',
      code: 'function addUser(req, res) { ... }',
      summary: 'Adds a new user.',
      filePath: 'src/routes/users.ts',
      startLine: 15,
      endLine: 22,
    },
  ],
  edges: [
    {
      source: 'src/index.ts-function-startServer',
      target: 'src/routes/users.ts-function-getUsers',
      label: 'registers route',
    },
    {
      source: 'src/index.ts-function-startServer',
      target: 'src/routes/users.ts-function-addUser',
      label: 'registers route',
    },
  ],
};
