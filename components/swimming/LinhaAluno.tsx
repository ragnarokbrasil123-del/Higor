'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { levels, type CapLevel } from '@/types';
import { cn } from '@/lib/utils';
import type { Aluno } from './constantes';

interface LinhaAlunoProps {
  aluno: Aluno;
  /** Selo de situação, montado por quem chama (depende das avaliações carregadas). */
  selo: React.ReactNode;
  onClick: () => void;
  /**
   * 'compacta' = bolinha da touca + nome (listas de turma e de grupo)
   * 'busca'    = avatar com a inicial + nome e touca em duas linhas
   */
  variante?: 'compacta' | 'busca';
  /** Só na variante compacta: mostra o rótulo da touca à direita (some no celular). */
  mostrarTouca?: boolean;
}

/**
 * A linha de aluno clicável das listas. Antes existiam três cópias quase
 * iguais — busca, grupo sem turma e turma do dia.
 */
export function LinhaAluno({ aluno, selo, onClick, variante = 'compacta', mostrarTouca = false }: LinhaAlunoProps) {
  const info = levels[aluno.level as CapLevel];

  if (variante === 'busca') {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3.5 hover:bg-surface-sunken transition-colors text-left"
      >
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0', info?.bgClass)}>
          {aluno.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink text-sm leading-tight break-words">{aluno.name}</p>
          <p className="text-xs text-ink-muted">Touca {info?.label}</p>
        </div>
        {selo}
        <ChevronRight className="w-4 h-4 text-ink-subtle shrink-0" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-sunken transition-colors text-left"
    >
      <div className={cn('w-2 h-2 rounded-full shrink-0', info?.bgClass)} />
      <span className="flex-1 text-sm font-medium text-ink truncate">{aluno.name}</span>
      {mostrarTouca && (
        <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider shrink-0 hidden sm:inline">
          {info?.label}
        </span>
      )}
      {selo}
      <ChevronRight className="w-4 h-4 text-ink-subtle shrink-0" />
    </button>
  );
}
