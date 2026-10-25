/* ============================================================
   Acesso a `students` pelo lado do cliente.

   Toda tela passa por aqui. Cada função tenta primeiro
   `/api/alunos` (servidor, com a service_role e sessão assinada) e,
   só se a rota responder 503 com `fallback: true`, cai no caminho
   antigo pela chave publishable.

   Por que o fallback existe: o Vercel reconstrói a cada push, e as
   variáveis de ambiente podem ainda não estar lá. Sem ele, o deploy
   derrubaria o app inteiro até alguém configurar o painel.

   ⚠️ O fallback é a ÚLTIMA coisa a sair. Enquanto ele puder rodar, o
   RLS não pode ser ligado — ele depende de a chave pública ainda ler
   `students`. Depois de ligar o RLS este caminho passa a falhar, o
   que é o comportamento certo: não há mais porta dos fundos.
   Ver LGPD.md, item 3.1.
   ============================================================ */

import { supabase } from '@/lib/supabase';
import { paginado } from '@/lib/paginado';
import { comCache, invalidar } from '@/lib/cache';
import { COLUNAS_POR_ESCOPO, type EscopoAluno } from '@/lib/alunos-colunas';

/** A rota disse "ainda não configurado"? */
async function usarFallback(resp: Response) {
  if (resp.status !== 503) return false;
  const corpo = await resp.json().catch(() => null);
  return corpo?.fallback === true;
}

function avisarFallback(onde: string) {
  console.warn(
    `[alunos] ${onde}: lendo pela chave publishable porque o servidor não está ` +
    'configurado (SUPABASE_SERVICE_ROLE_KEY / SESSION_SECRET). Ver LGPD.md.'
  );
}

/** Erro já pronto para mostrar, com a mensagem da rota quando houver. */
async function erroDaResposta(resp: Response, padrao: string) {
  const corpo = await resp.json().catch(() => null);
  if (resp.status === 401) return new Error('Sua sessão expirou. Entre de novo.');
  if (resp.status === 403) return new Error('Você não tem permissão para isso.');
  return new Error(corpo?.erro || padrao);
}

/* ---------------- leitura ---------------- */

/**
 * Lê os alunos de um escopo. Guarda em cache por escopo, para a
 * troca de aba não refazer a consulta — `forcar` pula o cache.
 *
 * A cópia (`[...]`) existe porque alguns módulos fazem `.sort()` no
 * array recebido, e isso reordenaria o que está guardado.
 */
export async function lerAlunos(escopo: EscopoAluno, forcar = false): Promise<any[]> {
  const dados = await comCache<any[]>(`students:${escopo}`, () => buscarAlunos(escopo), forcar);
  return [...dados];
}

async function buscarAlunos(escopo: EscopoAluno): Promise<any[]> {
  try {
    const resp = await fetch(`/api/alunos?escopo=${escopo}`, { credentials: 'same-origin' });
    if (resp.ok) {
      const { alunos } = await resp.json();
      return alunos;
    }
    if (!(await usarFallback(resp))) throw await erroDaResposta(resp, 'Não consegui carregar os alunos.');
    avisarFallback(`lerAlunos(${escopo})`);
  } catch (e: any) {
    // erro de permissão/sessão sobe; só falha de rede cai no fallback
    if (e instanceof Error && e.message && !/fetch|network|Failed/i.test(e.message)) throw e;
  }
  return paginado<any>('students', COLUNAS_POR_ESCOPO[escopo], 'name');
}

/* ---------------- escrita ----------------

   Toda escrita descarta o cache de aluno. Sem isso, quem salva uma
   ficha e troca de aba continua vendo a versão antiga — o cache é o
   mesmo para todas as telas. `class_slots` entra junto nos casos em
   que a vaga muda (cancelar matrícula libera a vaga).                */

/** Cria um aluno ou uma lista (importação em massa). Devolve `{id, name}[]`. */
export async function criarAlunos(alunos: Record<string, any>[]): Promise<any[]> {
  invalidar('students');
  const resp = await fetch('/api/alunos', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alunos }),
  }).catch(() => null);

  if (resp?.ok) return (await resp.json()).alunos ?? [];
  if (resp && !(await usarFallback(resp))) throw await erroDaResposta(resp, 'Não consegui salvar.');
  avisarFallback('criarAlunos');

  const limpos = alunos.map(a => ({
    ...a,
    phone: typeof a.phone === 'string' ? a.phone.replace(/\D/g, '') : a.phone,
  }));
  const { data, error } = await supabase.from('students').insert(limpos).select('id, name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Atualiza um aluno (ou vários, no caso do consentimento dos irmãos). */
export async function atualizarAlunos(ids: string | string[], campos: Record<string, any>) {
  const lista = Array.isArray(ids) ? ids : [ids];
  // `ativo` muda a situação da matrícula, que libera ou ocupa vaga
  invalidar('students', ...(('ativo' in campos) ? ['class_slots'] : []));

  const resp = await fetch('/api/alunos', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: lista, campos }),
  }).catch(() => null);

  if (resp?.ok) return;
  if (resp && !(await usarFallback(resp))) throw await erroDaResposta(resp, 'Não consegui salvar.');
  avisarFallback('atualizarAlunos');

  const limpos = { ...campos };
  if (typeof limpos.phone === 'string') limpos.phone = limpos.phone.replace(/\D/g, '');
  const { error } = await supabase.from('students').update(limpos).in('id', lista);
  if (error) throw new Error(error.message);
}

export async function apagarAluno(id: string) {
  // apagar leva junto as avaliações e libera as vagas
  invalidar('students', 'class_slots', 'evaluations');
  const resp = await fetch(`/api/alunos?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  }).catch(() => null);

  if (resp?.ok) return;
  if (resp && !(await usarFallback(resp))) throw await erroDaResposta(resp, 'Não consegui apagar.');
  avisarFallback('apagarAluno');

  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
