'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { capLevelOrder, levels, type CapLevel } from '@/types';
import { cn } from '@/lib/utils';

/* ============================================================
   A jornada das 7 toucas, para o responsável.

   O que isto responde, e que hoje o portal não responde bem: "meu
   filho está em que ponto?". Uma lista de avaliações passadas não
   mostra percurso; uma linha com as sete etapas mostra de onde ele
   veio e o que vem depois, numa olhada.

   Três estados por etapa, e cada um se distingue sem depender de
   cor: concluída tem ✓, atual tem anel e nome em negrito, futura
   fica esmaecida. Quem imprimir em preto e branco continua lendo.

   Horizontal com rolagem no celular, porque sete etapas não cabem
   na largura de um telefone sem espremer o nome a ponto de sumir.
   ============================================================ */

interface JornadaToucasProps {
  /** Touca em que o aluno está hoje. */
  atual: CapLevel;
  /** Realça a próxima como conquista à vista. */
  destacarProxima?: boolean;
  className?: string;
}

export function JornadaToucas({ atual, destacarProxima = true, className }: JornadaToucasProps) {
  const indiceAtual = capLevelOrder.indexOf(atual);

  return (
    <div className={cn('w-full', className)}>
      <ol
        className="flex items-start gap-1 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar"
        aria-label="Caminho das toucas"
      >
        {capLevelOrder.map((nivel, i) => {
          const info = levels[nivel];
          const concluida = i < indiceAtual;
          const ehAtual = i === indiceAtual;
          const proxima = destacarProxima && i === indiceAtual + 1;

          return (
            <li
              key={nivel}
              className="flex-1 min-w-[4.25rem] flex flex-col items-center text-center"
              aria-current={ehAtual ? 'step' : undefined}
            >
              {/* trilho + bolinha */}
              <div className="relative w-full flex items-center justify-center h-9">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute left-0 right-1/2 top-1/2 -translate-y-1/2 h-0.5',
                      concluida || ehAtual ? 'bg-brand' : 'bg-line'
                    )}
                  />
                )}
                {i < capLevelOrder.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute left-1/2 right-0 top-1/2 -translate-y-1/2 h-0.5',
                      concluida ? 'bg-brand' : 'bg-line'
                    )}
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 grid place-items-center rounded-full shrink-0 transition-all',
                    info.bgClass,
                    ehAtual ? 'w-8 h-8 ring-4 ring-brand/30' : 'w-5 h-5',
                    !concluida && !ehAtual && 'opacity-35'
                  )}
                >
                  {concluida && <Check className="w-3 h-3 text-white drop-shadow" strokeWidth={4} />}
                </span>
              </div>

              <span
                className={cn(
                  'mt-1 leading-tight break-words px-0.5',
                  ehAtual ? 'text-mini font-black text-ink' : 'text-micro font-bold',
                  concluida && 'text-ink-muted',
                  !concluida && !ehAtual && 'text-ink-subtle'
                )}
              >
                {info.label}
              </span>

              {ehAtual && (
                <span className="mt-0.5 text-micro font-bold uppercase tracking-wider text-brand-text">
                  aqui
                </span>
              )}
              {proxima && (
                <span className="mt-0.5 text-micro font-bold uppercase tracking-wider text-ouro-text">
                  próxima
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
