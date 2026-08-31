import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultUrl = 'https://megnezvmpyfywmusxqzj.supabase.co';
const defaultAnonKey = 'sb_publishable_KtAZMf1iYQquvUjQ3Tnrfg_Fy2UU7tV';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

export const isSupabaseConfigured: boolean = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export default supabase;
