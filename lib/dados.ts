/* ============================================================
   Leitura das tabelas compartilhadas entre as abas, com cache.

   `classes`, `class_slots` e `evaluations` são pedidas por quase
   toda aba (Painel, Alunos, Grade, Avaliação, Minha Semana). Antes
   cada uma buscava por conta própria, com um conjunto de colunas
   ligeiramente diferente.

   Aqui as colunas são UNIFICADAS de propósito: se cada tela pedisse
   o seu recorte, cada recorte viraria uma entrada separada no cache
   e nada seria reaproveitado. Vale mais trazer uma coluna a mais e
   buscar uma vez só.

   `students` e `app_users` NÃO entram aqui — elas têm RLS e passam
   por lib/alunos.ts e lib/equipe.ts, que têm o cache próprio delas.
   ============================================================ */

import { paginado } from '@/lib/paginado';
import { comCache, invalidar } from '@/lib/cache';

/**
 * Chame depois de mexer em turma ou vaga (criar/apagar turma, pôr ou
 * tirar aluno de uma vaga).
 *
 * `classes` e `class_slots` andam sempre juntas — apagar uma turma
 * apaga as vagas dela, e mover um aluno muda a ocupação que o Painel
 * mostra. Invalidar as duas de uma vez evita o caso em que a tela
 * seguinte mostra a turma nova com a contagem de vagas antiga.
 */
export function invalidarGrade() {
  invalidar('classes', 'class_slots');
}

/** Superset do que as telas usam. São poucas colunas, nenhuma sensível. */
const COLUNAS_TURMAS = '*';
const COLUNAS_VAGAS = '*';

/**
 * Avaliação tem dois recortes de propósito.
 *
 * O `scores` é um jsonb por avaliação e só a tela de Avaliação o usa.
 * Hoje são 431 linhas, mas são ~429 alunos x 4 trimestres por ano:
 * obrigar o Painel a baixar todos os critérios de todo mundo ficaria
 * caro rápido.
 */
const COLUNAS_AVAL_RESUMO = 'id, student_id, date, level, approved, avaliador_nome';
const COLUNAS_AVAL_COMPLETO = '*';

/**
 * Devolve CÓPIA do array guardado.
 *
 * Sem isso, um `.sort()` dentro de um módulo (e existem) reordenaria
 * o array que está no cache, afetando as outras abas. A cópia é rasa
 * e barata — o que ela protege é a ordem, não os objetos.
 */
const copia = <T,>(p: Promise<T[]>) => p.then(d => [...d]);

export const lerTurmas = (forcar = false) =>
  copia(comCache<any[]>('classes', () => paginado<any>('classes', COLUNAS_TURMAS, 'start_time'), forcar));

export const lerVagas = (forcar = false) =>
  copia(comCache<any[]>('class_slots', () => paginado<any>('class_slots', COLUNAS_VAGAS), forcar));

export const lerAvaliacoesResumo = (forcar = false) =>
  copia(comCache<any[]>('evaluations:resumo', () => paginado<any>('evaluations', COLUNAS_AVAL_RESUMO), forcar));

export const lerAvaliacoesCompletas = (forcar = false) =>
  copia(comCache<any[]>('evaluations:completo', () => paginado<any>('evaluations', COLUNAS_AVAL_COMPLETO), forcar));
