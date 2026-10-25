'use client';

import React from 'react';
import { ArrowLeft, Award, FileText, History, Trash2 } from 'lucide-react';
import { levels, type CapLevel } from '@/types';
import { EVALUATION_CRITERIA } from '@/lib/evaluation-criteria';
import { gerarBoletimPDF } from '@/lib/boletim-pdf';
import { cn } from '@/lib/utils';
import { BadgeTouca, textoSobreTouca } from '@/components/ui';
import type { Aluno } from './constantes';

interface FichaAlunoProps {
  aluno: Aluno;
  /** Avaliações do aluno, já filtradas e em ordem decrescente de data. */
  historico: any[];
  /** Só o admin pode apagar uma avaliação do histórico. */
  isAdmin: boolean;
  selo: React.ReactNode;
  onVoltar: () => void;
  onAvaliar: () => void;
  onApagar: (id: string) => void;
}

/** Ficha do aluno: cabeçalho, botão de avaliar e histórico com PDF. */
export function FichaAluno({ aluno, historico, isAdmin, selo, onVoltar, onAvaliar, onApagar }: FichaAlunoProps) {
  const info = levels[aluno.level as CapLevel];

  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-surface-sunken">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm font-bold text-ink-muted hover:text-ink">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="bg-surface rounded-panel border border-line shadow-raised p-5 flex items-center gap-4">
          <div className={cn('w-16 h-16 rounded-card flex items-center justify-center font-titulo font-bold text-2xl shrink-0', info?.bgClass, textoSobreTouca(aluno.level as CapLevel))}>
            {aluno.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-ink leading-tight break-words">{aluno.name}</h1>
            <p className="text-sm font-bold text-ink-muted">Touca {info?.name}</p>
            <div className="mt-1">{selo}</div>
          </div>
        </div>

        <button onClick={onAvaliar} className="w-full py-5 bg-gradient-to-r from-brand to-brand-hover text-white rounded-2xl shadow-lg shadow-brand/30 font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform">
          <Award className="w-6 h-6" /> Fazer avaliação
        </button>

        <div className="bg-surface rounded-panel border border-line shadow-raised p-5">
          <h3 className="font-black text-ink flex items-center gap-2 mb-4 pb-3 border-b border-line">
            <History className="w-5 h-5 text-info" /> Histórico
          </h3>
          {historico.length === 0 ? (
            <p className="text-sm text-ink-subtle text-center py-6">Nenhuma avaliação registrada.</p>
          ) : (
            <div className="space-y-4">
              {historico.map(ev => (
                <div key={ev.id} className="bg-surface-sunken border border-line rounded-2xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="numero font-black text-ink">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                      <BadgeTouca nivel={ev.level as CapLevel} completo className="mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('px-3 py-1.5 rounded-lg text-xs font-black', ev.approved ? 'bg-success-soft text-success-ink' : 'bg-brand-wash text-warning-ink')}>
                        {ev.approved ? 'APROVADO' : 'EM TREINAMENTO'}
                      </span>
                      <button onClick={() => gerarBoletimPDF(ev, aluno.name)} className="px-3 py-1.5 bg-surface-raised-soft text-white rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform">
                        <FileText className="w-3.5 h-3.5" /> PDF
                      </button>
                      {isAdmin && (
                        <button onClick={() => onApagar(ev.id)} className="p-2 text-ink-subtle hover:text-danger hover:bg-danger-soft rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                  {/*
                    Quem lançou. Fica na ficha e não só no banco porque o
                    objetivo é prático: ao ver uma touca ou um critério
                    estranho, saber na hora com quem conversar.

                    O "·" com aviso aparece quando `avaliador_verificado` é
                    false — autoria autodeclarada pelo aparelho, do período
                    em que o servidor ainda não conferia a sessão. Mostrar
                    igual ao resto esconderia que ali o nome é mais fraco.
                  */}
                  {ev.avaliador_nome ? (
                    <p className="text-xs text-ink-subtle mb-3">
                      Avaliado por <span className="font-bold text-ink-muted">{ev.avaliador_nome}</span>
                      {ev.avaliador_verificado === false && (
                        <span title="Autoria informada pelo aparelho, não conferida pelo servidor"> · não verificada</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-ink-subtle mb-3">Avaliação anterior ao registro de autoria.</p>
                  )}

                  {ev.notes && <p className="text-sm italic text-ink-muted bg-surface border border-line rounded-xl p-3 mb-3">"{ev.notes}"</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {(EVALUATION_CRITERIA[ev.level as CapLevel] || []).map(c => {
                      const st = ev.scores?.[c.id] || 'pending';
                      return (
                        <div key={c.id} className="flex items-start gap-2 text-xs">
                          <div className={cn('w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-micro font-black',
                            st === 'passed' ? 'bg-success-soft text-success' : st === 'failed' ? 'bg-danger-soft text-danger' : 'bg-surface-sunken text-ink-subtle')}>
                            {st === 'passed' ? '✔' : st === 'failed' ? '✖' : '–'}
                          </div>
                          <span className={st === 'passed' ? 'text-ink' : 'text-ink-muted'}>{c.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
