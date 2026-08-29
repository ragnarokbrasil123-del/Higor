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
