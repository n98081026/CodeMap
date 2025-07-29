import { vi } from 'vitest';

// Mock the supabase client to ensure a single instance is used across all tests.
vi.mock('@/lib/supabaseClient', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return { supabase };
});
