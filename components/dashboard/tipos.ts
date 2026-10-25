import type { CapLevel } from '@/types';

/* ============================================================
   Formatos que o Painel lê. Um recorte do banco, não a tabela
   inteira: o que não aparece aqui também não desce para o
   navegador (ver COLUNAS_PAINEL em lib/alunos-colunas.ts).
   ============================================================ */

/** Sem `phone`: o Painel nunca mostrou telefone em tela. */
export type Aluno = {
  id: string;
  name: string;
  level: CapLevel;
  modalidade: string | null;
  ativo: boolean | null;
  guardian_name: string | null;
};

export type Aval = {
  id: string;
  student_id: string;
  date: string;
  level: CapLevel;
  approved: boolean;
  /**
   * Quem lançou. Nulo nas avaliações anteriores ao registro de autoria
   * (as 431 que já existiam em 24/10/2026).
   */
  avaliador_nome: string | null;
};

export type Turma = { id: string; day_of_week: string; start_time: string; teacher_name: string };
export type Vaga = { class_id: string; student_id: string | null };
export type Equipe = { name: string; username: string | null; role: string; active: boolean | null };
export type Tarefa = { id: string; title: string; completed: boolean; date: string; created_at: string };

/** Tudo que o Painel carrega de uma vez. */
export interface DadosPainel {
  alunos: Aluno[];
  avals: Aval[];
  turmas: Turma[];
  vagas: Vaga[];
  equipe: Equipe[];
  limpeza: Tarefa[];
  manut: Tarefa[];
}

/** Seta de comparação com o mês anterior. */
export interface Tendencia {
  sentido: 'sobe' | 'desce' | 'igual';
  texto: string;
}
