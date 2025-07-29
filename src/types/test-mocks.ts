// Type definitions for test mocks

export interface MockSupabaseClient {
  from: (table: string) => MockSupabaseQueryBuilder;
  storage: {
    from: (bucket: string) => MockSupabaseStorage;
  };
}

export interface MockSupabaseQueryBuilder {
  insert: (data: any) => MockSupabaseQueryBuilder;
  select: (columns?: string) => MockSupabaseQueryBuilder;
  eq: (column: string, value: any) => MockSupabaseQueryBuilder;
  single: () => Promise<{ data: any; error: any }>;
  mockReturnValue: (value: any) => void;
}

export interface MockSupabaseStorage {
  upload: (path: string, file: File) => Promise<{ data: any; error: any }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
}

export interface MockProjectSubmission {
  id: string;
  submissionTimestamp: string;
  userId: string;
  projectArchiveUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}