/* ============================================================
   Cliente Supabase com a service_role. SÓ NO SERVIDOR.

   ⚠️ Esta chave ignora RLS e lê a base inteira. Se ela chegar ao
   navegador, o RLS que estamos ligando não vale nada — ela é o
   próprio contorno. Daí as três travas abaixo:

     1. o arquivo não tem 'use client' e nunca é importado por um
        componente de tela;
     2. o nome da variável NÃO começa com NEXT_PUBLIC_, então o
        Next não a embute no bundle;
     3. `supabaseAdmin()` estoura se for chamada num ambiente de
        navegador.

   Nunca importe este arquivo de um componente. Ele existe para as
   Route Handlers em app/api/.
   ============================================================ */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase';

/** A key está configurada? Serve para decidir rota nova x caminho antigo. */
export function temServiceRole() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cliente: SupabaseClient | null = null;

/**
 * Devolve o cliente privilegiado. Chame só dentro de Route Handler.
 *
 * `persistSession: false` porque não há usuário: é uma chamada de
 * servidor, e guardar sessão aqui só criaria estado compartilhado
 * entre requisições de famílias diferentes.
 */
export function supabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin() foi chamada no navegador. Isto nunca pode acontecer.');
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');

  if (!cliente) {
    cliente = createClient(SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}
