// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// **ATENÇÃO: SUBSTITUA ESTES VALORES PELAS SUAS CHAVES REAIS DO SUPABASE!**
const SUPABASE_URL = 'https://wbgdwvltegqpfxombfsd.supabase.co'; // Use a SUPABASE_URL que você tem
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiZ2R3dmx0ZWdxcGZ4b21iZnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQ1NTcsImV4cCI6MjA2NDkwMDU1N30.yOxKOLqZzpsudxi0eM_J6rhY9Gh52Bw6VWvE0TxCIwY'; // Use a NEXT_PUBLIC_SUPABASE_ANON_KEY que você tem

// Crie uma única instância do cliente Supabase para ser usada em todo o aplicativo
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);