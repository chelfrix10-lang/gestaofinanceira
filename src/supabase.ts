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

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey
};

// Diagnostics to help the user configure Supabase on Netlify or client-side
export const supabaseDiagnostics = {
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  rawDetails: {
    url: supabaseUrl || 'não definida',
    anonKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0
  }
};

const isValidConfig = !!(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey &&
  supabaseAnonKey.length > 20
);

let clientInstance: any = null;

if (isValidConfig) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  } catch (error) {
    console.error("Erro na inicialização do Supabase client:", error);
    clientInstance = null;
  }
}

export const supabase = clientInstance;
export const isSupabaseConfigured = !!supabase;

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
