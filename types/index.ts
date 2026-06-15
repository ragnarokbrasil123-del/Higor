export type CapLevel = 'yellow' | 'orange' | 'red' | 'green' | 'lightBlue' | 'darkBlue' | 'black';

export type EvalStatus = 'yes' | 'no' | 'untested';
export type GeneralStatus = 'approved' | 'reproved' | 'pending';

export interface Evaluation {
  id?: string;
  student_id?: string;
  date: string;
  results: Record<string, EvalStatus>;
  general_status: GeneralStatus;
  notes?: string;
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

export const levels: Record<CapLevel, { name: string; colorClass: string; bgClass: string }> = {
  yellow: { name: 'Amarela (Bebê 3)', colorClass: 'text-yellow-500', bgClass: 'bg-yellow-400' },
  orange: { name: 'Laranja (Sereia/Tritão)', colorClass: 'text-orange-500', bgClass: 'bg-orange-500' },
  red: { name: 'Vermelha (Iniciação)', colorClass: 'text-red-500', bgClass: 'bg-red-500' },
  green: { name: 'Verde (Aperfeiç. 1)', colorClass: 'text-green-500', bgClass: 'bg-green-500' },
  lightBlue: { name: 'Azul Claro', colorClass: 'text-sky-400', bgClass: 'bg-sky-400' },
  darkBlue: { name: 'Azul Escuro', colorClass: 'text-blue-700', bgClass: 'bg-blue-700' },
  black: { name: 'Preta', colorClass: 'text-gray-900', bgClass: 'bg-gray-900' },
};
