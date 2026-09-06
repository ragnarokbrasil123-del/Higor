'use client';

import React from 'react';
import { Check, Target } from 'lucide-react';
import { capLevelOrder, levels, type CapLevel } from '@/types';
import { EVALUATION_CRITERIA } from '@/lib/evaluation-criteria';
import { cn } from '@/lib/utils';

/* ============================================================
   "O que falta para a próxima touca"

   O buraco que este bloco tapa: antes o responsável só via critérios
   DENTRO de uma avaliação já feita. Entre uma avaliação e outra — três
   meses — ele abria o app e não via nada sobre o que o filho treina.
   ============================================================ */

interface CaminhoToucaProps {
  nome: string;
  nivel: CapLevel;
  /** Avaliações do aluno, mais recente primeiro. */
  avaliacoes: any[];
}

export function CaminhoTouca({ nome, nivel, avaliacoes }: CaminhoToucaProps) {
  const criterios = EVALUATION_CRITERIA[nivel] || [];
  if (criterios.length === 0) return null;

  const atual = levels[nivel];
  const i = capLevelOrder.indexOf(nivel);
  const proxima = i >= 0 && i < capLevelOrder.length - 1 ? levels[capLevelOrder[i + 1]] : null;

  // a foto mais recente do desempenho NESTA touca; sem avaliação, tudo a treinar
  const ultimaDoNivel = avaliacoes.find(a => a.level === nivel);
  const marcas: Record<string, string> = ultimaDoNivel?.scores || {};

  const concluidos = criterios.filter(c => marcas[c.id] === 'passed');
  const faltam = criterios.filter(c => marcas[c.id] !== 'passed');
  const pct = Math.round((concluidos.length / criterios.length) * 100);

  return (
    <div className="bg-surface rounded-panel p-6 shadow-raised border border-line">
      <h2 className="text-sm font-black text-ink-subtle uppercase tracking-wider mb-4 flex items-center gap-2">
        <Target className="w-4 h-4" /> O caminho até a próxima touca
      </h2>

      {/* touca atual -> próxima */}
      <div className="flex items-center gap-3 mb-5">
        <span className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-sunken border border-line">
          <span className={cn('w-3 h-3 rounded-full shrink-0', atual.bgClass)} />
          <span className="text-sm font-bold text-ink">{atual.label}</span>
        </span>

        {proxima ? (
          <>
            <span className="text-ink-subtle font-black shrink-0">→</span>
            <span className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-sunken border border-dashed border-line-strong">
              <span className={cn('w-3 h-3 rounded-full shrink-0', proxima.bgClass)} />
              <span className="text-sm font-bold text-ink-muted">{proxima.label}</span>
            </span>
          </>
        ) : (
          <span className="text-sm font-bold text-ink-muted">é o nível mais alto 🏆</span>
        )}
      </div>

      {/* progresso */}
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-sm font-bold text-ink">
          {concluidos.length} de {criterios.length} fundamentos concluídos
        </p>
        <span className="text-sm font-black text-ink tabular-nums shrink-0">{pct}%</span>
      </div>
      <div className="h-2.5 bg-surface-sunken rounded-full overflow-hidden mb-5">
        <div className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-success' : 'bg-brand')} style={{ width: `${pct}%` }} />
      </div>

      {!ultimaDoNivel && (
        <p className="text-xs font-medium text-ink-muted bg-surface-sunken border border-line rounded-xl p-3 mb-4 leading-relaxed">
          {nome.split(' ')[0]} ainda não passou por uma avaliação nesta touca. A lista abaixo é o que
          está sendo treinado nas aulas.
        </p>
      )}

      {/* o que falta */}
      {faltam.length > 0 && (
        <>
          <p className="text-xs font-black text-ink-subtle uppercase tracking-wider mb-2">
            {ultimaDoNivel ? 'Ainda a treinar' : 'Fundamentos desta touca'}
          </p>
          <ul className="space-y-1.5 mb-4">
            {faltam.map(c => (
              <li key={c.id} className="flex items-start gap-2.5 text-sm">
                <span className="w-5 h-5 rounded-full border-2 border-line-strong shrink-0 mt-0.5" />
                <span className="text-ink-muted leading-snug">{c.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* o que já passou */}
      {concluidos.length > 0 && (
        <>
          <p className="text-xs font-black text-success-ink uppercase tracking-wider mb-2">Já conquistado</p>
          <ul className="space-y-1.5">
            {concluidos.map(c => (
              <li key={c.id} className="flex items-start gap-2.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span className="text-ink leading-snug">{c.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {faltam.length === 0 && (
        <p className="text-sm font-bold text-success-ink bg-success-soft border border-emerald-200 rounded-xl p-3 mt-2">
          🏅 Todos os fundamentos concluídos! {nome.split(' ')[0]} está pronto para a próxima touca.
        </p>
      )}
    </div>
  );
}
