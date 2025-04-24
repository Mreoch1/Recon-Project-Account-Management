import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const signUp = async (email: string, password: string, metadata = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });

    if (error) throw error;
    if (!data.user) throw new Error('Failed to create account');

    return { data, error: null };
  } catch (error: any) {
    return { 
      data: null, 
      error: error.message || 'Failed to create account'
    };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (!data.user) throw new Error('Failed to sign in');

    return { data, error: null };
  } catch (error: any) {
    return { 
      data: null, 
      error: error.message || 'Failed to sign in'
    };
  }
};

// Helper to check if session is valid
export const checkSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    await supabase.auth.signOut();
    return false;
  }
  return true;
};