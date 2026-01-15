
import { createClient } from '@supabase/supabase-js';

// These should be set in your environment. For the prototype, we use the ones provided or placeholders.
const supabaseUrl = process.env.SUPABASE_URL || 'https://qsbiquxhkvoyatlrqjfj.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
