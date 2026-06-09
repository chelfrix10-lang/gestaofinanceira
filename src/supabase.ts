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
 * Saves financial data to Supabase in a 'financial_data' table
 */
export async function saveToSupabase(data: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const savePromise = (async () => {
      const { error } = await supabase
        .from('financial_data')
        .upsert({ id: 'user_budget', data }, { onConflict: 'id' });
      
      if (error) {
        console.warn("Supabase upsert warning (check if table is created):", error.message);
        return false;
      }
      return true;
    })();

    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.warn("Supabase saveToSupabase timed out safely after 2.5s.");
        resolve(false);
      }, 2500);
    });

    return await Promise.race([savePromise, timeoutPromise]);
  } catch (error) {
    console.error("Erro ao salvar no Supabase:", error);
    return false;
  }
}

/**
 * Loads financial data from Supabase in a 'financial_data' table
 */
export async function loadFromSupabase(): Promise<any | null> {
  if (!supabase) return null;
  try {
    const fetchPromise = (async () => {
      const { data, error } = await supabase
        .from('financial_data')
        .select('data')
        .eq('id', 'user_budget')
        .maybeSingle();

      if (error) {
        console.warn("Supabase load error (check if table 'financial_data' is created):", error.message);
        return null;
      }
      return data ? data.data : null;
    })();

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn("Supabase loadFromSupabase timed out safely after 2.5s.");
        resolve(null);
      }, 2500);
    });

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.error("Erro ao carregar do Supabase:", error);
  }
  return null;
}
