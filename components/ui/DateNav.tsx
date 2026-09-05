'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateNavProps {
  /** Data no formato YYYY-MM-DD. */
  date: string;
  /** Recebe -1 ou +1. */
  onShift: (dias: number) => void;
  /** 0 a 100. */
  progress: number;
  done: number;
  total: number;
}

/**
 * Navegador de dia + anel de progresso.
 * Estava escrito igual em Checklist e Manutenção, com cores diferentes.
 * No celular ocupa a largura toda e as setas têm alvo de toque de 44px.
 */
export function DateNav({ date, onShift, progress, done, total }: DateNavProps) {
  const hoje = date === new Date().toISOString().split('T')[0];
  const raio = 20;
  const circunferencia = 2 * Math.PI * raio;

  return (
    <div className="flex items-center justify-between gap-2 bg-surface rounded-card border border-line shadow-raised p-2 w-full md:w-auto">
      <div className="flex items-center flex-1 md:flex-none">
        <button
          onClick={() => onShift(-1)}
          aria-label="Dia anterior"
          className="p-3 min-w-11 min-h-11 flex items-center justify-center text-ink-subtle hover:text-brand hover:bg-brand-soft rounded-control transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 md:w-36 text-center flex flex-col">
          <span className="text-micro font-bold text-ink-subtle uppercase tracking-wider">
            {hoje ? 'Hoje' : 'Histórico'}
          </span>
          <span className="font-bold text-ink tabular-nums">
            {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
        </div>

        <button
          onClick={() => onShift(1)}
          aria-label="Próximo dia"
          className="p-3 min-w-11 min-h-11 flex items-center justify-center text-ink-subtle hover:text-brand hover:bg-brand-soft rounded-control transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="w-px h-10 bg-line shrink-0" />

      <div className="flex items-center gap-2.5 pr-2 shrink-0">
        <div className="relative w-11 h-11 flex items-center justify-center">
          <svg className="w-11 h-11 -rotate-90" aria-hidden="true">
            <circle cx="22" cy="22" r={raio} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-surface-sunken" />
            <circle
              cx="22"
              cy="22"
              r={raio}
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circunferencia}
              strokeDashoffset={circunferencia - (circunferencia * progress) / 100}
              className={cn('transition-all duration-700 ease-out', progress === 100 ? 'text-success' : 'text-brand')}
            />
          </svg>
          <span className="absolute text-micro font-black text-ink tabular-nums">{progress}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-ink tabular-nums">
            {done} de {total}
          </span>
          <span className="text-micro text-ink-subtle font-bold uppercase tracking-wider">Concluídas</span>
        </div>
      </div>
    </div>
  );
}
