export type CapLevel = 'orange' | 'red' | 'green' | 'lightBlue' | 'darkBlue' | 'black';

export type EvaluationStatus = 'achieved' | 'developing' | 'untested';

export interface Evaluation {
  id?: string;
  student_id?: string;
  date?: string;
  breathing: EvaluationStatus;
  floating: EvaluationStatus;
  technique: EvaluationStatus;
  speed: EvaluationStatus;
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
  evalDetails: Evaluation;      // Mantém pro formato antigo funcionar visualmente
  evaluations?: Evaluation[];   // O histórico de avaliações que vem do Supabase
}

export const levels: Record<CapLevel, { name: string; colorClass: string; bgClass: string }> = {
  orange: { name: 'Laranja', colorClass: 'text-orange-500', bgClass: 'bg-orange-500' },
  red: { name: 'Vermelha', colorClass: 'text-red-500', bgClass: 'bg-red-500' },
  green: { name: 'Verde', colorClass: 'text-green-500', bgClass: 'bg-green-500' },
  lightBlue: { name: 'Azul Claro', colorClass: 'text-sky-400', bgClass: 'bg-sky-400' },
  darkBlue: { name: 'Azul Escuro', colorClass: 'text-blue-700', bgClass: 'bg-blue-700' },
  black: { name: 'Preta', colorClass: 'text-gray-900', bgClass: 'bg-gray-900' },
};
