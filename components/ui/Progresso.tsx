'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ============================================================
   Progresso: barra e anel.

   Para a avaliação à beira da piscina, o professor precisa saber
   "quanto falta" sem ler. Por isso o número vai SEMPRE junto da
   forma — a barra sozinha obriga a estimar, e com a mão molhada e
   pressa ninguém estima.

   Sem animação contínua: a barra anima só quando o valor muda, e
   quem pediu "reduzir movimento" vê o salto direto.
   ============================================================ */

interface BarraProps {
  valor: number;
  total: number;
  /** Texto à esquerda. O "de" é montado aqui: "4 de 7 critérios". */
  rotulo?: string;
  /** Dourado em vez de azul — para quando a meta foi batida. */
  conquista?: boolean;
  className?: string;
}

export function BarraProgresso({ valor, total, rotulo, conquista = false, className }: BarraProps) {
  const pct = total > 0 ? Math.round((Math.min(valor, total) / total) * 100) : 0;

  return (
    <div className={cn('w-full', className)}>
      {(rotulo || total > 0) && (
        <div className="flex items-baseline justify-between mb-1.5">
          {rotulo && <span className="text-mini font-bold uppercase tracking-wider text-ink-muted">{rotulo}</span>}
          <span className={cn('numero text-sm font-black', conquista ? 'text-ouro-text' : 'text-ink')}>
            {valor} <span className="text-ink-subtle font-bold">de {total}</span>
          </span>
        </div>
      )}
      <div
        className="h-2 w-full rounded-full bg-surface-sunken border border-line overflow-hidden"
        role="progressbar"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={rotulo ?? 'Progresso'}
      >
        <div
          className={cn(
            'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out',
            conquista ? 'bg-ouro' : 'bg-brand'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface AnelProps {
  valor: number;
  total: number;
  /** Diâmetro em px. */
  tamanho?: number;
  conquista?: boolean;
  /** O que aparece no meio. Por padrão, "valor/total". */
  centro?: React.ReactNode;
  className?: string;
}

/**
 * Anel de progresso em SVG.
 *
 * SVG e não `conic-gradient` porque o anel precisa de borda
 * arredondada na ponta e de funcionar igual nos dois temas — e
 * porque um SVG de 2 círculos é mais barato de repintar que um
 * gradiente cônico animado.
 */
export function AnelProgresso({ valor, total, tamanho = 64, conquista = false, centro, className }: AnelProps) {
  const pct = total > 0 ? Math.min(valor, total) / total : 0;
  const traco = Math.max(4, Math.round(tamanho * 0.1));
  const raio = (tamanho - traco) / 2;
  const volta = 2 * Math.PI * raio;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
      style={{ width: tamanho, height: tamanho }}
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <svg width={tamanho} height={tamanho} className="-rotate-90" aria-hidden="true">
        <circle
          cx={tamanho / 2} cy={tamanho / 2} r={raio}
          fill="none" strokeWidth={traco}
          className="stroke-surface-sunken"
        />
        <circle
          cx={tamanho / 2} cy={tamanho / 2} r={raio}
          fill="none" strokeWidth={traco} strokeLinecap="round"
          strokeDasharray={volta}
          strokeDashoffset={volta * (1 - pct)}
          className={cn(
            conquista ? 'stroke-ouro' : 'stroke-brand',
            'motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500 motion-safe:ease-out'
          )}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {centro ?? (
          <span className={cn('numero font-black leading-none', conquista ? 'text-ouro-text' : 'text-ink')}
                style={{ fontSize: tamanho * 0.28 }}>
            {valor}<span className="text-ink-subtle">/{total}</span>
          </span>
        )}
      </span>
    </div>
  );
}
