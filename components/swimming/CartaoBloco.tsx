'use client';

import React from 'react';
import { CheckCircle2, ListChecks, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import { ChipsTouca } from './ChipsTouca';
import type { Aluno } from './constantes';

interface CartaoBlocoProps {
  /** Selo escuro à esquerda: o horário (turmas) ou a bolinha + nome do grupo. */
  etiqueta: React.ReactNode;
  /** Linha fina acima dos chips de touca: o professor ou a descrição do grupo. */
  subtitulo?: React.ReactNode;
  alunos: Aluno[];
  pendentes: number;
  onAvaliar: () => void;
  /** "completa" para turma, "completo" para grupo — o texto muda de gênero. */
  rotuloCompleto: string;
  /** Faixa de aviso e/ou a lista de alunos. */
  children: React.ReactNode;
}

/**
 * Cartão de um grupo de alunos na home. Serve tanto para uma turma
 * (dias úteis e sábado) quanto para um grupo sem turma (Wellhub, avulso).
 * Antes eram duas cópias praticamente idênticas do mesmo cabeçalho.
 */
export function CartaoBloco({ etiqueta, subtitulo, alunos, pendentes, onAvaliar, rotuloCompleto, children }: CartaoBlocoProps) {
  return (
    <div className="bg-surface rounded-card border border-line shadow-raised overflow-hidden">
      <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-50">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-black text-sm shrink-0">
          {etiqueta}
        </div>

        <div className="flex-1 min-w-0">
          {subtitulo}
          <ChipsTouca alunos={alunos} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-ink-muted flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {alunos.length}
          </span>

          {pendentes > 0 && (
            <Button size="sm" onClick={onAvaliar}>
              <ListChecks className="w-4 h-4" /> Avaliar {pendentes}
            </Button>
          )}

          {alunos.length > 0 && pendentes === 0 && (
            <span className="px-3 py-2 bg-success-soft text-success-ink rounded-xl text-xs font-black flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {rotuloCompleto}
            </span>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
