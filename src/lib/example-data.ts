// src/lib/example-data.ts

export interface ExampleProject {
  key: string;
  name: string;
  description: string;
  // zipPath: string; // Path to the ZIP in /public/examples/ - Actual ZIP download/analysis is out of scope for now
  mapJsonPath: string; // Path to the pre-generated map JSON in /public/example-maps/
  imageUrl?: string; // Optional preview image path in /public/images/examples/
  tags?: string[]; // e.g., ["Python", "Beginner", "Game"]
}

export const exampleProjects: ExampleProject[] = [
  {
    key: 'python_game',
    name: 'Python Text Adventure',
    description: 'Explore the code structure of a simple Python-based text adventure game. Good for beginners learning functions and basic classes.',
    mapJsonPath: '/example-maps/python_simple_game.json',
    imageUrl: '/images/examples/python_game_preview.png',
    tags: ["Python", "Beginner", "Game", "CLI"],
  },
  {
    key: 'basic_website',
    name: 'Simple Static Website',
    description: 'See how HTML, CSS, and a little JavaScript work together in a basic website. Useful for understanding frontend file relationships.',
    mapJsonPath: '/example-maps/basic_website.json',
    imageUrl: '/images/examples/basic_website_preview.png',
    tags: ["HTML", "CSS", "JavaScript", "Frontend", "Beginner"],
  },
  {
    key: 'markdown_docs',
    name: 'Markdown Documentation Set',
    description: 'A small collection of Markdown files representing a simple documentation structure. Illustrates how CodeMap can visualize non-code projects.',
    mapJsonPath: '/example-maps/markdown_docs.json',
    imageUrl: '/images/examples/markdown_docs_preview.png',
    tags: ["Markdown", "Documentation", "Organization"],
  },
];

// Note: The actual ZIP files and JSON map data files are not created by the agent.
// These paths are placeholders that would need to be populated manually in a real scenario.
// For the purpose of this implementation, we will focus on using the pre-generated mapJsonPath
// to load map data directly.
// The imageUrls are also placeholders.
// The zipPath is commented out as direct ZIP analysis from this section is out of scope.
// We are focusing on loading PRE-ANALYZED maps.
