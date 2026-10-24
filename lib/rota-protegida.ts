/* ============================================================
   Guarda das Route Handlers. SÓ NO SERVIDOR.

   Duas coisas num lugar só, porque as duas têm de valer juntas:

   1. **Está configurado?** Sem `SUPABASE_SERVICE_ROLE_KEY` e sem
      `SESSION_SECRET` a rota não tem como trabalhar. Nesse caso ela
      responde 503 com `fallback: true`, e o cliente segue pelo
      caminho antigo (chave publishable) em vez de o app parar.

      Isso é deliberado e TEMPORÁRIO: existe para o código subir
      antes das variáveis estarem no Vercel. Enquanto este 503 puder
      acontecer, o RLS NÃO pode ser ligado — o caminho antigo
      depende de a chave pública ainda ler a tabela. Ver LGPD.md.

   2. **Quem está chamando?** A sessão vem do cookie assinado, nunca
      do corpo da requisição nem do localStorage. Uma rota que
      aceitasse "sou admin" do cliente seria tão aberta quanto a
      chave publishable.
   ============================================================ */

import { NextResponse } from 'next/server';
import { temServiceRole } from '@/lib/supabase-admin';
import { sessaoDaRequisicao, temSegredoSessao, type Sessao } from '@/lib/sessao-servidor';

export type Guarda =
  | { ok: true; sessao: Sessao }
  | { ok: false; resposta: NextResponse };

/** As duas variáveis estão no ambiente? */
export function servidorPronto() {
  return temServiceRole() && temSegredoSessao();
}

/**
 * 503 com `fallback: true` — o cliente entende como "ainda não
 * configurado, use o caminho antigo". Qualquer outro status significa
 * recusa de verdade e NÃO deve cair no caminho antigo.
 */
export function respostaNaoConfigurado() {
  return NextResponse.json(
    { erro: 'servidor não configurado', fallback: true },
    { status: 503 }
  );
}

/**
 * Exige sessão válida e permissão. `permite` recebe a sessão já
 * verificada e decide.
 *
 *   const g = exigir(req, ehAdmin);
 *   if (!g.ok) return g.resposta;
 *   // a partir daqui g.sessao é confiável
 */
export function exigir(req: Request, permite: (s: Sessao) => boolean): Guarda {
  if (!servidorPronto()) return { ok: false, resposta: respostaNaoConfigurado() };

  const sessao = sessaoDaRequisicao(req);
  if (!sessao) {
    return { ok: false, resposta: NextResponse.json({ erro: 'sem sessão' }, { status: 401 }) };
  }
  if (!permite(sessao)) {
    return { ok: false, resposta: NextResponse.json({ erro: 'sem permissão' }, { status: 403 }) };
  }
  return { ok: true, sessao };
}

/**
 * Lê a tabela inteira com a service_role, em lotes de 1000.
 *
 * Mesmo motivo do `lib/paginado.ts` do cliente: o PostgREST corta em
 * 1000 e não avisa. Aqui é uma cópia separada de propósito — aquele
 * importa o cliente do navegador, que não pode entrar numa rota.
 */
export async function paginarAdmin<T = any>(
  cliente: { from: (t: string) => any },
  tabela: string,
  colunas: string,
  ordem?: string
): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += 1000) {
    const base = cliente.from(tabela).select(colunas);
    const q = ordem ? base.order(ordem, { ascending: true }) : base;
    const { data, error } = await q.range(de, de + 999);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    const lote = (data ?? []) as T[];
    todas.push(...lote);
    if (lote.length < 1000) break;
  }
  return todas;
}
