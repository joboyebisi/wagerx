import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build, return a mock client to avoid errors
    if (typeof window === 'undefined') {
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
    throw new Error('Missing Supabase environment variables');
  }

  // Validate URL format
  try {
    const url = new URL(supabaseUrl);
    if (!url.protocol.startsWith('http')) {
      throw new Error('Invalid Supabase URL protocol');
    }
  } catch (error) {
    // During build/SSR, return a mock client instead of throwing
    if (typeof window === 'undefined') {
      // Only warn if it's actually a placeholder, not a real URL that failed parsing
      if (supabaseUrl && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('your_')) {
        // Real URL that failed parsing - this is unexpected
        console.error(`Failed to parse supabaseUrl: ${supabaseUrl}`, error);
      } else {
        console.warn(`Invalid supabaseUrl during build: ${supabaseUrl}. Using placeholder.`);
      }
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
    throw new Error(`Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL. Got: ${supabaseUrl}`);
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  },
});

// Server-side client with service role key for admin operations
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables (URL or SERVICE_ROLE_KEY)');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

