'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';
import type { Tendencia } from './tipos';

/* ============================================================
   Peças de apresentação do Painel: o cartão de número e o título
   de seção. Não buscam nada e não guardam estado — recebem tudo
   por props, que é o que permitiu tirá-las do módulo.
   ============================================================ */

export interface CartaoProps {
  icone: LucideIcon;
  titulo: string;
  valor: string;
  contexto: string;
  /** Só aparece quando existe base de comparação real. */
  tendencia?: { texto: string; sentido: 'sobe' | 'desce' | 'igual' };
  destaque?: 'neutro' | 'atencao';
  /** Quando presente, o cartão inteiro vira atalho para a aba correspondente. */
  aoClicar?: () => void;
}

export function Cartao({ icone: Icone, titulo, valor, contexto, tendencia, destaque = 'neutro', aoClicar }: CartaoProps) {
  const Seta = tendencia?.sentido === 'desce' ? TrendingDown : TrendingUp;
  return (
    <Card
      onClick={aoClicar}
      className={cn('flex flex-col gap-1.5', aoClicar && 'cursor-pointer transition-colors hover:border-brand/40 active:bg-surface-sunken')}
    >
      <div className="flex items-center gap-1.5 text-ink-subtle">
        <Icone className={cn('w-4 h-4 shrink-0', destaque === 'atencao' && 'text-warning')} />
        <span className="text-mini font-bold uppercase tracking-wider truncate">{titulo}</span>
      </div>

      <p
        className={cn(
          'text-2xl md:text-3xl font-black leading-none tabular-nums',
          destaque === 'atencao' ? 'text-warning-ink' : 'text-ink'
        )}
      >
        {valor}
      </p>

      <p className="text-xs text-ink-muted font-medium leading-snug">{contexto}</p>

      {tendencia && (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-mini font-bold mt-0.5',
            tendencia.sentido === 'sobe' && 'text-success-ink',
            tendencia.sentido === 'desce' && 'text-danger-ink',
            tendencia.sentido === 'igual' && 'text-ink-subtle'
          )}
        >
          {tendencia.sentido !== 'igual' && <Seta className="w-3 h-3 shrink-0" />}
          {tendencia.texto}
        </span>
      )}
    </Card>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-mini font-black text-ink-subtle uppercase tracking-wider">{titulo}</h2>
      {children}
    </section>
  );
}
