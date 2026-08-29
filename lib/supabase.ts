import { createClient } from '@supabase/supabase-js';

// Chaves fixas direto no código conforme você pediu.
// (A chave publishable/anon é pública por design; a segurança real viria de RLS no Supabase.)
export const SUPABASE_URL = 'https://jefmyjeuxkajycjexgly.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_2yVknLEKpom35ZgE6BYY1A_liY-cr5b';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
