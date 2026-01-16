
import { createClient } from '@supabase/supabase-js';

// Derived from project ref: qsbiquxhkvoyatlrqjfj
const supabaseUrl = process.env.SUPABASE_URL || 'https://qsbiquxhkvoyatlrqjfj.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
