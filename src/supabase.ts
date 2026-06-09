/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

// Helper to clean environment variables (removing wrapping quotes or accidental spaces)
const cleanEnvVar = (val: any): string => {
  if (!val || typeof val !== 'string') return '';
  let cleaned = val.trim();
  // Remove wrapping double quotes if present
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  // Remove wrapping single quotes if present
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
};

const supabaseUrl = cleanEnvVar(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = cleanEnvVar(import.meta.env.VITE_SUPABASE_ANON_KEY);

export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const localUrl = localStorage.getItem('fp_custom_supabase_url');
  const localKey = localStorage.getItem('fp_custom_supabase_key');
  
  const url = cleanEnvVar(envUrl || localUrl || '');
  const key = cleanEnvVar(envKey || localKey || '');
  
  return { 
    url, 
    key, 
    isCustom: !envUrl && !!localUrl 
  };
}

export const supabaseConfig = {
  get url() {
    return getSupabaseCredentials().url;
  },
  get anonKey() {
    return getSupabaseCredentials().key;
  }
};

// Diagnostics to help the user configure Supabase on Netlify or client-side
export const supabaseDiagnostics = {
  get hasUrl() {
    return !!getSupabaseCredentials().url;
  },
  get hasAnonKey() {
    return !!getSupabaseCredentials().key;
  },
  get rawDetails() {
    const { url, key } = getSupabaseCredentials();
    return {
      url: url || 'não definida',
      anonKeyLength: key ? key.length : 0
    };
  }
};

export let supabase: any = null;
export let isSupabaseConfigured = false;

export function initSupabaseClient() {
  const { url, key } = getSupabaseCredentials();
  
  const isValidConfig = !!(
    url &&
    url.startsWith('https://') &&
    key &&
    key.length > 20
  );

  if (isValidConfig) {
    try {
      supabase = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      isSupabaseConfigured = true;
      console.log("Supabase client initialized successfully with:", url);
    } catch (error) {
      console.error("Erro na inicialização do Supabase client:", error);
      supabase = null;
      isSupabaseConfigured = false;
    }
  } else {
    supabase = null;
    isSupabaseConfigured = false;
  }
}

// Execute initial load
initSupabaseClient();

/**
 * Get the currently logged-in user details if available
 */
export async function getCurrentUser(): Promise<any> {
  if (!supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.warn("Failed to retrieve Supabase user session:", err);
    return null;
  }
}

/**
 * Signup via Supabase Auth
 */
export async function supabaseSignUp(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  if (!supabase) return { success: false, error: 'Cliente Supabase não inicializado.' };
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Signin via Supabase Auth
 */
export async function supabaseSignIn(email: string, password: string): Promise<{ success: boolean; user?: any; session?: any; error?: string }> {
  if (!supabase) return { success: false, error: 'Cliente Supabase não inicializado.' };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user, session: data.session };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Signout from Supabase Auth
 */
export async function supabaseSignOut(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Cliente Supabase não inicializado.' };
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Saves financial data to Supabase in a 'financial_data' table
 */
export async function saveToSupabase(data: any): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!supabase) return { success: false, error: 'Cliente Supabase não inicializado.' };
  try {
    // Get current user to scope data ID
    const user = await getCurrentUser();
    const documentId = user ? `user_budget_${user.id}` : 'user_budget';

    const savePromise = (async () => {
      const { error } = await supabase
        .from('financial_data')
        .upsert({ id: documentId, data }, { onConflict: 'id' });
      
      if (error) {
        console.warn("Supabase upsert warning (check if table is created):", error.message);
        return { success: false, error: error.message, code: error.code };
      }
      return { success: true };
    })();

    const timeoutPromise = new Promise<{ success: boolean; error?: string; code?: string }>((resolve) => {
      setTimeout(() => {
        console.warn("Supabase saveToSupabase timed out safely after 3.5s.");
        resolve({ success: false, error: 'Timeout ao salvar os dados no Supabase.', code: 'TIMEOUT' });
      }, 3500);
    });

    return await Promise.race([savePromise, timeoutPromise]);
  } catch (error: any) {
    console.error("Erro ao salvar no Supabase:", error);
    return { success: false, error: error?.message || String(error), code: error?.code };
  }
}

/**
 * Loads financial data from Supabase in a 'financial_data' table
 */
export async function loadFromSupabase(): Promise<any | null> {
  if (!supabase) return null;
  try {
    // Get current user to scope data ID
    const user = await getCurrentUser();
    const documentId = user ? `user_budget_${user.id}` : 'user_budget';

    const fetchPromise = (async () => {
      const { data, error } = await supabase
        .from('financial_data')
        .select('data')
        .eq('id', documentId)
        .maybeSingle();

      if (error) {
        console.warn("Supabase load error (check if table 'financial_data' is created):", error.message);
        const err = new Error(error.message);
        (err as any).code = error.code;
        throw err;
      }
      return data ? data.data : null;
    })();

    const timeoutPromise = new Promise<null>((resolve, reject) => {
      setTimeout(() => {
        console.warn("Supabase loadFromSupabase timed out safely after 3.5s.");
        reject(new Error('Timeout ao conectar ao banco Supabase.'));
      }, 3500);
    });

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    console.error("Erro ao carregar do Supabase:", error);
    throw error;
  }
}
