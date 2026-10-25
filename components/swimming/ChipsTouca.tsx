'use client';

import React from 'react';
import { capLevelOrder, levels } from '@/types';
import { cn } from '@/lib/utils';
import { textoSobreTouca } from '@/components/ui';
import type { Aluno } from './constantes';

/**
 * Faixinhas com as toucas presentes num grupo/turma, na ordem oficial.
 *
 * O texto era `text-white` fixo, que dá 1,53:1 sobre a amarela e
 * 2,14:1 sobre a azul-claro — ilegível. `textoSobreTouca` escolhe
 * tinta ou branco conforme a cor, e aí as sete passam em AA.
 */
export function ChipsTouca({ alunos }: { alunos: Aluno[] }) {
  const toucas = capLevelOrder.filter(k => alunos.some(a => a.level === k));
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {toucas.map(t => (
        <span
          key={t}
          className={cn(
            'text-micro font-bold uppercase px-1.5 py-0.5 rounded-badge',
            levels[t].bgClass,
            textoSobreTouca(t)
          )}
        >
          {levels[t].label}
        </span>
      ))}
    </div>
  );
}
