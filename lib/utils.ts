import { createClient } from '@supabase/supabase-js';

// Chaves fixas direto no código conforme você pediu
const supabaseUrl = 'https://jefmyjeuxkajycjexgly.supabase.co';
const supabaseAnonKey = 'sb_publishable_2yVknLEKpom35ZgE6BYY1A_liY-cr5b';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
