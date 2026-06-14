// types/index.ts
export type CapLevel = 'orange' | 'red' | 'green' | 'lightBlue' | 'darkBlue' | 'black';

export type EvaluationStatus = 'achieved' | 'developing' | 'untested';

export interface Evaluation {
  breathing: EvaluationStatus;
  floating: EvaluationStatus;
  technique: EvaluationStatus;
  speed: EvaluationStatus;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  level: CapLevel;
  lastEvaluation: string;
  evalDetails: Evaluation;
  guardianName?: string; // Novo campo
  phone?: string;        // Novo campo
}

export const levels: Record<CapLevel, { name: string; colorClass: string; bgClass: string }> = {
  orange: { name: 'Laranja', colorClass: 'text-orange-500', bgClass: 'bg-orange-500' },
  red: { name: 'Vermelha', colorClass: 'text-red-500', bgClass: 'bg-red-500' },
  green: { name: 'Verde', colorClass: 'text-green-500', bgClass: 'bg-green-500' },
  lightBlue: { name: 'Azul Claro', colorClass: 'text-sky-400', bgClass: 'bg-sky-400' },
  darkBlue: { name: 'Azul Escuro', colorClass: 'text-blue-700', bgClass: 'bg-blue-700' },
  black: { name: 'Preta', colorClass: 'text-gray-900', bgClass: 'bg-gray-900' },
};

export const initialStudents: Student[] = [
  {
    id: '1',
    name: 'Sofia Almeida',
    age: 7,
    level: 'orange',
    lastEvaluation: '2023-10-15',
    evalDetails: { breathing: 'developing', floating: 'achieved', technique: 'developing', speed: 'untested' }
  },
  {
    id: '2',
    name: 'Lucas Ferreira',
    age: 9,
    level: 'green',
    lastEvaluation: '2023-11-02',
    evalDetails: { breathing: 'achieved', floating: 'achieved', technique: 'developing', speed: 'achieved' }
  },
  {
    id: '3',
    name: 'Mariana Costa',
    age: 12,
    level: 'darkBlue',
    lastEvaluation: '2023-11-20',
    evalDetails: { breathing: 'achieved', floating: 'achieved', technique: 'achieved', speed: 'developing' }
  },
  {
    id: '4',
    name: 'Pedro Gomes',
    age: 6,
    level: 'red',
    lastEvaluation: '2023-09-10',
    evalDetails: { breathing: 'untested', floating: 'developing', technique: 'untested', speed: 'untested' }
  },
];
