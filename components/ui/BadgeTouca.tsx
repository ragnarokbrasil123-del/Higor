'use client';

import React from 'react';
import { levels, type CapLevel } from '@/types';
import { cn } from '@/lib/utils';

/* ============================================================
   Selo de touca: cor E nome, sempre juntos.

   A regra que isso resolve: informação nunca só por cor. Quem não
   distingue verde de vermelho — ou está com o celular no sol, ou
   imprimiu o relatório em preto e branco — precisa ler a touca.

   O texto por cima é escolhido por cor, não por gosto. Cada uma das
   sete foi medida contra tinta e contra branco, e aqui fica a que
   passa em AA:

     amarela   tinta  11,37:1      azul claro  tinta   8,13:1
     laranja   tinta   6,21:1      azul escuro branco  6,70:1
     vermelha  tinta   4,63:1      preta       branco 17,74:1
     verde     tinta   7,64:1

   As cores vêm de `levels` em types/index.ts e NÃO entram na paleta
   da marca: elas representam a touca real, não um papel de interface.
   ============================================================ */

/** As duas toucas escuras pedem texto branco; as cinco claras, tinta. */
const TEXTO_BRANCO: CapLevel[] = ['darkBlue', 'black'];

interface BadgeToucaProps {
  nivel: CapLevel;
  /** `cheio` pinta o fundo; `discreto` usa só um ponto colorido. */
  variante?: 'cheio' | 'discreto';
  /** Rótulo longo ("Laranja (Sereia/Tritão)") em vez do curto. */
  completo?: boolean;
  className?: string;
}

export function BadgeTouca({ nivel, variante = 'cheio', completo = false, className }: BadgeToucaProps) {
  const info = levels[nivel];
  if (!info) return null;

  const texto = completo ? info.name : info.label;

  if (variante === 'discreto') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-badge bg-surface-sunken border border-line',
          'px-2 py-1 text-mini font-bold text-ink',
          className
        )}
      >
        <span className={cn('w-2 h-2 rounded-full shrink-0', info.bgClass)} aria-hidden="true" />
        {texto}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-badge px-2.5 py-1 text-mini font-black uppercase tracking-wide',
        info.bgClass,
        TEXTO_BRANCO.includes(nivel) ? 'text-white' : 'text-[#0b1b2b]',
        className
      )}
    >
      {texto}
    </span>
  );
}
