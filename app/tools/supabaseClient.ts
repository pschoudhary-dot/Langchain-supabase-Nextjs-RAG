import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project's URL and API key from the Supabase dashboard
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and API key are not set');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
