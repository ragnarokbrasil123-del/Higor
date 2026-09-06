import type { Student } from '@/types';

/* ============================================================
   Tipos, constantes e helpers da Avaliação de Natação.
   Extraído de swimming-module.tsx sem nenhuma alteração de valor.
   ============================================================ */

export interface ClassRow {
  id: string;
  teacher_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface SlotRow {
  id: string;
  class_id: string;
  cap_color: string;
  student_id: string | null;
}

export type Aluno = Student & { modalidade?: string | null };

/**
 * 'turmas'    = avaliação por turma do dia
 * 'sem-turma' = Wellhub, avulsos e quem ficou sem horário
 * 'sabado'    = só as turmas de sábado
 */
export type Escopo = 'turmas' | 'sem-turma' | 'sabado';

/** Um cartão da home: uma turma (dias úteis) ou um horário inteiro (sábado). */
export interface Bloco {
  chave: string;
  hora: string;
  professor?: string;
  alunos: Aluno[];
}

export const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export const hhmm = (t: string) => String(t || '').slice(0, 5);

export const hojeDia = () => { const d = new Date().getDay(); return DAYS[d === 0 ? 0 : d - 1] || DAYS[0]; };

// o cálculo do trimestre mora em lib/trimestre.ts porque o portal dos pais
// também precisa dele; aqui é só reexport para não mudar quem já importava
export { trimestre, TRIMESTRE_ATUAL } from '@/lib/trimestre';

export const draftKey = (id: string) => `olimpo_draft_aval_${id}`;

/** Grupos da tela de alunos sem turma fixa. */
export const GRUPOS_SEM_TURMA: { key: string; titulo: string; desc: string; cor: string; aviso?: boolean }[] = [
  { key: 'wellhub', titulo: 'Wellhub', desc: 'Agenda conforme a disponibilidade', cor: 'bg-indigo-500' },
  { key: 'avulso', titulo: 'Avulso', desc: 'Agenda conforme a disponibilidade', cor: 'bg-teal-600' },
  { key: 'fixo', titulo: 'Sem turma definida', desc: 'São alunos fixos que ficaram sem horário — vale alocar na Grade', cor: 'bg-amber-500', aviso: true },
];
