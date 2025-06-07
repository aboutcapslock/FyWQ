// supabaseClient.js
// Este arquivo é responsável por inicializar o cliente Supabase.
// Ele assume que o SDK do Supabase está sendo carregado via CDN em seus arquivos HTML.

// **ATENÇÃO: SUBSTITUA OS VALORES ABAIXO PELAS SUAS CHAVES REAIS DO SUPABASE!**
// Você pode encontrá-las no painel do Supabase, em Project Settings -> API.

const SUPABASE_URL = 'https://wbgdwvltegqpfxombfsd.supabase.co'; 
// Use a sua SUPABASE_URL, que geralmente é Project URL.

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiZ2R3dmx0ZWdxcGZ4b21iZnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQ1NTcsImV4cCI6MjA2NDkwMDU1N30.yOxKOLqZzpsudxi0eM_J6rhY9Gh52Bw6VWvE0TxCIwY';
// Use a sua NEXT_PUBLIC_SUPABASE_ANON_KEY (também conhecida como 'anon public' ou 'chave anon pública').

// O SDK do Supabase carregado via CDN adiciona um objeto 'supabase' ou 'supabase_js' ao escopo global do navegador.
// Vamos usar 'supabase_js' que é o nome comum para a versão 2 do SDK via CDN.
// https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2

// Crie uma única instância do cliente Supabase para ser usada em todo o aplicativo.
// Esta instância será exportada para que outros arquivos JavaScript (como script.js) possam importá-la.
export const supabase = supabase_js.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);