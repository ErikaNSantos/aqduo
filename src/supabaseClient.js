import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sem as variáveis (ex.: build do Pages antes de configurar o Supabase), a página
// inicial ainda abre; só o login e os dados ficam indisponíveis.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(
  supabaseUrl || 'https://sem-supabase.invalid',
  supabaseAnonKey || 'sem-chave',
)
