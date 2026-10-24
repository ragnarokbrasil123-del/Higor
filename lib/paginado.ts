/* ============================================================
   Consulta paginada.

   O PostgREST devolve no máximo 1000 linhas por consulta, e
   `class_slots` já passou disso (1303). Quem esquece a paginação
   não recebe erro: recebe uma resposta curta, silenciosamente
   incompleta — vaga livre que existe e não aparece na matrícula,
   turma que parece ter menos aluno do que tem na Grade.

   Cada módulo tinha a sua própria cópia deste laço, e dois deles
   simplesmente não tinham. Fonte única aqui.
   ============================================================ */

import { supabase } from '@/lib/supabase';

/** Teto de linhas por resposta do PostgREST. */
const LOTE = 1000;

/**
 * Traz a tabela inteira, em lotes de 1000.
 *
 * `ordem` entra na consulta (e não num `sort` depois) porque sem uma
 * ordem estável o banco pode devolver a mesma linha em dois lotes e
 * esconder outra — paginar sem ordenar é sorteio, não paginação.
 */
export async function paginado<T = any>(tabela: string, colunas = '*', ordem?: string): Promise<T[]> {
  const todas: T[] = [];

  for (let de = 0; ; de += LOTE) {
    // O builder é construído dentro do laço de propósito: reaproveitar o
    // mesmo entre dois `await` reaproveita também a resposta anterior.
    const base = supabase.from(tabela).select(colunas);
    const consulta = ordem ? base.order(ordem, { ascending: true }) : base;

    const { data, error } = await consulta.range(de, de + LOTE - 1);
    if (error) throw new Error(`${tabela}: ${error.message}`);

    const lote = (data ?? []) as unknown as T[];
    todas.push(...lote);

    // lote incompleto = última página
    if (lote.length < LOTE) break;
  }

  return todas;
}
