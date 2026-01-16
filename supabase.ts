
import { createClient } from '@supabase/supabase-js';

// Safely access environment variables with fallbacks to prevent "process is not defined" errors
const getEnv = (key: string): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    // process.env is not accessible
  }
  return undefined;
};

const supabaseUrl = getEnv('SUPABASE_URL') || 'https://qsbiquxhkvoyatlrqjfj.supabase.co';
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
