// Type definitions for test mocks

export interface MockSupabaseClient {
  from: (table: string) => MockSupabaseQueryBuilder;
  storage: {
    from: (bucket: string) => MockSupabaseStorage;
  };
}

export interface MockSupabaseQueryBuilder {
  insert: (data: unknown) => MockSupabaseQueryBuilder;
  select: (columns?: string) => MockSupabaseQueryBuilder;
  eq: (column: string, value: unknown) => MockSupabaseQueryBuilder;
  single: () => Promise<{ data: unknown; error: unknown }>;
  mockReturnValue: (value: unknown) => void;
}

export interface MockSupabaseStorage {
  upload: (
    path: string,
    file: File
  ) => Promise<{ data: unknown; error: unknown }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
}

export interface MockProjectSubmission {
  id: string;
  submissionTimestamp: string;
  userId: string;
  projectArchiveUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
