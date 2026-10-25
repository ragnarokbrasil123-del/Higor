/* ============================================================
   Lançar e apagar avaliação, pelo lado do cliente.

   Mesmo desenho de `lib/alunos.ts`: tenta a rota de servidor e cai
   no caminho antigo só enquanto as variáveis de ambiente não
   estiverem configuradas.

   A DIFERENÇA QUE IMPORTA AQUI é a autoria:

   - pela rota, o nome sai da sessão assinada e grava
     `avaliador_verificado = true`. É autoria de verdade: o
     navegador não conseguiria mentir;
   - pelo caminho antigo, o nome sai do `olimpo_session` do próprio
     aparelho, e grava `avaliador_verificado = false`. Serve para
     organizar o dia a dia ("quem lançou essa?"), mas é
     AUTODECLARADO: quem mexesse no localStorage assinaria com outro
     nome.

   As duas gravam. A coluna `avaliador_verificado` é o que permite
   saber depois em qual dos dois regimes cada linha nasceu — sem
   ela, a autoria fraca ficaria indistinguível da forte.
   ============================================================ */

import { supabase } from '@/lib/supabase';
import { invalidar } from '@/lib/cache';

export interface NovaAvaliacao {
  student_id: string;
  date: string;
  level: string;
  scores: Record<string, string>;
  notes?: string;
  approved: boolean;
}

/** Quem está logado, segundo o aparelho. Só para o caminho de reserva. */
function autorLocal() {
  try {
    const sess = JSON.parse(localStorage.getItem('olimpo_session') || 'null');
    if (!sess || sess.role === 'client') return null;
    return {
      avaliador_id: sess.data?.id ?? null,
      avaliador_nome: sess.data?.name || sess.data?.username || null,
      avaliador_papel: sess.role ?? null,
      // autodeclarado: a coluna registra isso para não se confundir
      // com a autoria que vem do servidor
      avaliador_verificado: false,
    };
  } catch {
    return null;
  }
}

async function usarFallback(resp: Response | null) {
  if (!resp || resp.status !== 503) return false;
  const corpo = await resp.json().catch(() => null);
  return corpo?.fallback === true;
}

async function erroDaResposta(resp: Response, padrao: string) {
  if (resp.status === 401) return new Error('Sua sessão expirou. Entre de novo.');
  if (resp.status === 403) return new Error('Você não tem permissão para isso.');
  const corpo = await resp.json().catch(() => null);
  return new Error(corpo?.erro || padrao);
}

export async function lancarAvaliacao(av: NovaAvaliacao) {
  // `students` entra junto: aprovar em todos os critérios promove a
  // touca do aluno, então a lista de alunos também muda
  invalidar('evaluations', 'students');

  const resp = await fetch('/api/avaliacoes', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(av),
  }).catch(() => null);

  if (resp?.ok) return;
  if (resp && !(await usarFallback(resp))) throw await erroDaResposta(resp, 'Não consegui salvar a avaliação.');

  console.warn(
    '[avaliacoes] autoria AUTODECLARADA: o servidor não está configurado ' +
    '(SUPABASE_SERVICE_ROLE_KEY / SESSION_SECRET). Ver LGPD.md.'
  );

  const { error } = await supabase.from('evaluations').insert([{ ...av, ...autorLocal() }]);
  if (error) throw new Error(error.message);
}

export async function apagarAvaliacao(id: string) {
  invalidar('evaluations');
  const resp = await fetch(`/api/avaliacoes?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  }).catch(() => null);

  if (resp?.ok) return;
  if (resp && !(await usarFallback(resp))) throw await erroDaResposta(resp, 'Não consegui apagar.');

  const { error } = await supabase.from('evaluations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
