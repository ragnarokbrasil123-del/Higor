import type { CapLevel } from '@/types';

/* ============================================================
   Formatos e constantes da aba Alunos.

   `StudentRow` é a ficha COMPLETA — inclui endereço, telefone e
   `observacoes`, que guarda alergia e restrição alimentar (dado
   sensível de saúde). Só esta aba a recebe, e só para admin: ver o
   escopo `completo` em lib/alunos-colunas.ts e a matriz de permissão
   em app/api/alunos/route.ts.
   ============================================================ */

export interface StudentRow {
  id: string;
  name: string;
  age: number | null;
  level: CapLevel;
  guardian_name: string | null;
  phone: string | null;
  password: string | null;
  modalidade: string | null;
  endereco: string | null;
  observacoes: string | null;
  /** Matrícula ativa. Quem cancela vira false e mantém ficha e histórico. */
  ativo: boolean | null;
  inativo_em: string | null;
  inativo_motivo: string | null;
}

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

export interface EvalRow {
  student_id: string;
  date: string;
  approved: boolean;
}

/** Sem domingo: a escola não abre. */
export const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export const MODALIDADES = ['fixo', 'wellhub', 'avulso'];

/** '07:45:00' vira '07:45'. */
export const hhmm = (t: string) => String(t || '').slice(0, 5);
