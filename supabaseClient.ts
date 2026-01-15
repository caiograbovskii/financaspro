import { createClient } from '@supabase/supabase-js';

// Função auxiliar para recuperar variáveis de ambiente de forma segura
const getEnv = (key: string) => {
  // 1. Tenta recuperar do process.env (injetado pelo vite.config.ts)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // 2. Tenta recuperar do import.meta.env (Padrão Vite) com try/catch para evitar erros de referência
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
       // @ts-ignore
       return import.meta.env[key];
    }
  } catch (e) {
    // Ignora erros se import.meta não existir
  }
  
  return '';
};

// Usa as variáveis de ambiente OU as chaves fornecidas diretamente como fallback para garantir a conexão
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://njfrtjwrohtbxaqrctsj.supabase.co';
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZnJ0andyb2h0YnhhcXJjdHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTkxMTcsImV4cCI6MjA4MzQ5NTExN30.ciKRJpBcUeR4a_O5udt6Ql8pX2QabIxVn-get1Oz_60';

// Flag para verificar se a configuração existe
export const isConfigured = !!(supabaseUrl && supabaseKey);

if (!isConfigured) {
    console.error("⛔ ERRO CRÍTICO: Chaves do Supabase não encontradas.");
}

// Inicializa o cliente
export const supabase = createClient(
  supabaseUrl, 
  supabaseKey
);