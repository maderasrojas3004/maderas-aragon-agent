import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export const supabase = typeof window !== 'undefined'
  ? getSupabaseClient()
  : (null as unknown as ReturnType<typeof createClient>);
