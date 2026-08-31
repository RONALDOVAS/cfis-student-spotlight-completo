import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://megnezvmpyfywmusxqzj.supabase.co';
// Cole a chave INTEIRA que você copiou do botão (ela é longa):
const SUPABASE_ANON_KEY = 'sb_publishable_KtAZMf1iYQquvUjQ3Tnrfg_Fy2UU7tV';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);