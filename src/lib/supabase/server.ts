import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase con service role key para uso en Server Actions y Route Handlers.
 * NUNCA exponer en el cliente.
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey);
}
