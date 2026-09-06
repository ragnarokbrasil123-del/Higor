'use client';

import React from 'react';
import { capLevelOrder, levels } from '@/types';
import { cn } from '@/lib/utils';
import type { Aluno } from './constantes';

/** Faixinhas coloridas com as toucas presentes num grupo/turma, na ordem oficial. */
export function ChipsTouca({ alunos }: { alunos: Aluno[] }) {
  const toucas = capLevelOrder.filter(k => alunos.some(a => a.level === k));
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {toucas.map(t => (
        <span key={t} className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white', levels[t].bgClass)}>
          {levels[t].label}
        </span>
      ))}
    </div>
  );
}
