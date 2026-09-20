export type CapLevel = 'yellow' | 'orange' | 'red' | 'green' | 'lightBlue' | 'darkBlue' | 'black';

export type EvalStatus = 'passed' | 'failed' | 'pending';

export interface Evaluation {
  id?: string;
  student_id?: string;
  date: string;
  /** Touca que estava sendo avaliada nesta ficha */
  level: CapLevel;
  /** Resultado por critério: { [criterioId]: 'passed' | 'failed' | 'pending' } */
  scores: Record<string, EvalStatus>;
  notes?: string;
  /** true quando o aluno passou em todos os critérios e trocou de touca */
  approved: boolean;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  level: CapLevel;
  guardian_name?: string;
  phone?: string;
  created_at?: string;
  evaluations?: Evaluation[];
}

export interface LevelInfo {
  /** Rótulo completo para telas ("Amarela (Bebê 3)") */
  name: string;
  /** Nome curto da cor ("Amarela") — usado na Grade de Horários */
  label: string;
  colorClass: string;
  bgClass: string;
}

/** Ordem oficial de progressão das toucas (usada para promover o aluno). */
export const capLevelOrder: CapLevel[] = [
  'yellow', 'orange', 'red', 'green', 'lightBlue', 'darkBlue', 'black',
];

export const levels: Record<CapLevel, LevelInfo> = {
  yellow:    { name: 'Amarela (Bebê 3)',        label: 'Amarela',     colorClass: 'text-yellow-500', bgClass: 'bg-yellow-400' },
  orange:    { name: 'Laranja (Sereia/Tritão)', label: 'Laranja',     colorClass: 'text-orange-500', bgClass: 'bg-orange-500' },
  red:       { name: 'Vermelha (Iniciação)',    label: 'Vermelha',    colorClass: 'text-red-500',    bgClass: 'bg-red-500' },
  green:     { name: 'Verde (Aperfeiç. 1)',     label: 'Verde',       colorClass: 'text-green-500',  bgClass: 'bg-green-500' },
  lightBlue: { name: 'Azul Claro',              label: 'Azul Claro',  colorClass: 'text-sky-400',    bgClass: 'bg-sky-400' },
  darkBlue:  { name: 'Azul Escuro',             label: 'Azul Escuro', colorClass: 'text-blue-700',   bgClass: 'bg-blue-700' },
  black:     { name: 'Preta',                   label: 'Preta',       colorClass: 'text-gray-900',   bgClass: 'bg-gray-900' },
};

/**
 * Capacidade máxima de alunos por turma, por touca — regra do dono da escola.
 * Amarela/Laranja/Vermelha são turmas de nível único: o número vale para a
 * turma inteira. Verde em diante pode misturar níveis na mesma turma; nesse
 * caso as 4 toucas dividem um teto único de 9 vagas por turma.
 */
export const CAPACIDADE_TOUCA: Record<CapLevel, number> = {
  yellow: 4,
  orange: 5,
  red: 6,
  green: 9,
  lightBlue: 9,
  darkBlue: 9,
  black: 9,
};

/** Toucas que só podem ocupar uma turma sozinhas — não misturam entre si. */
export const NIVEL_UNICO: CapLevel[] = ['yellow', 'orange', 'red'];

/** Toucas que dividem o mesmo teto de vagas dentro de uma turma (ver CAPACIDADE_TOUCA). */
export const GRUPO_VERDE_MAIS: CapLevel[] = ['green', 'lightBlue', 'darkBlue', 'black'];
