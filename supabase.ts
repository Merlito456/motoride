
import { createClient } from '@supabase/supabase-js';

/**
 * ⚠️ IMPORTANT FOR CLOUDFLARE PAGES:
 * The "Anon Public Key" is found in Supabase > Settings > API.
 * Hardcoding the publishable key is safe for frontend applications.
 */

const SUPABASE_URL = 'https://qsbiquxhkvoyatlrqjfj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IQvPHklDRCSOfBd_w4FPjQ_gqWdC8gs';

// Helper to check for Cloudflare/Vite environment variables
const getEnv = (key: string): string | undefined => {
  try {
    // Check Cloudflare/Node style
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    // Check Vite style
    if (typeof (import.meta as any).env !== 'undefined' && (import.meta as any).env[`VITE_${key}`]) {
      return (import.meta as any).env[`VITE_${key}`];
    }
  } catch (e) {}
  return undefined;
};

const finalUrl = getEnv('SUPABASE_URL') || SUPABASE_URL;
const finalKey = getEnv('SUPABASE_ANON_KEY') || SUPABASE_ANON_KEY;

export const supabase = createClient(finalUrl, finalKey);
