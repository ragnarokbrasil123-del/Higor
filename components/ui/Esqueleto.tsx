'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ============================================================
   Esqueleto de carregamento.

   Diferença para o <Loading>, que é um texto pulsante: o esqueleto
   tem o FORMATO do que vai chegar. A pessoa já entende que vem uma
   lista, ou quatro números, e a tela não dá um salto quando o dado
   aparece — o espaço já estava reservado.

   `aria-hidden`: para quem usa leitor de tela, um monte de caixa
   cinza não é informação. Quem anuncia o carregamento é o
   `aria-busy` no container, não estas formas.

   A pulsação é `motion-safe`: quem pediu "reduzir movimento" no
   sistema vê as caixas paradas.
   ============================================================ */

interface EsqueletoProps {
  className?: string;
}

/** Bloco cinza. Dê o tamanho pelo className. */
export function Esqueleto({ className }: EsqueletoProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-line rounded-control motion-safe:animate-pulse', className)}
    />
  );
}

/** Lista: uma linha por item, com avatar e duas linhas de texto. */
export function EsqueletoLista({ linhas = 6 }: { linhas?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-2">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex items-center gap-3 bg-surface border border-line rounded-card p-3">
          <Esqueleto className="w-11 h-11 rounded-control shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            {/* larguras diferentes a cada linha: um bloco uniforme
                parece tabela quebrada, não conteúdo chegando */}
            <Esqueleto className={cn('h-3.5 rounded-badge', i % 3 === 0 ? 'w-2/3' : i % 3 === 1 ? 'w-1/2' : 'w-3/5')} />
            <Esqueleto className="h-3 w-1/3 rounded-badge" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Fileira de números do Painel. */
export function EsqueletoCartoes({ cartoes = 4 }: { cartoes?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: cartoes }, (_, i) => (
        <div key={i} className="bg-surface border border-line rounded-card p-4 space-y-3">
          <Esqueleto className="h-3 w-1/2 rounded-badge" />
          <Esqueleto className="h-7 w-2/3 rounded-badge" />
          <Esqueleto className="h-2.5 w-full rounded-badge" />
        </div>
      ))}
    </div>
  );
}
