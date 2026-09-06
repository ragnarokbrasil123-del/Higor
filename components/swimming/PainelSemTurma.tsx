'use client';

import React from 'react';
import { CalendarDays, CheckCircle2, Search, X } from 'lucide-react';
import { capLevelOrder, levels } from '@/types';
import { cn } from '@/lib/utils';
import { Chip, ChipRow, EmptyState, FilterFooter, Toggle } from '@/components/ui';
import { CartaoBloco } from './CartaoBloco';
import { LinhaAluno } from './LinhaAluno';
import { GRUPOS_SEM_TURMA, type Aluno } from './constantes';

export interface FiltrosSemTurma {
  grupo: string; setGrupo: (v: string) => void;
  touca: string; setTouca: (v: string) => void;
  soPendentes: boolean; setSoPendentes: (v: boolean) => void;
}

interface PainelSemTurmaProps {
  /** Todos os alunos sem vaga na grade, antes dos filtros. Alimenta os contadores. */
  semTurma: Aluno[];
  /** Os mesmos alunos já filtrados — calculado no módulo porque o cabeçalho também usa. */
  semTurmaFiltrado: Aluno[];
  filtros: FiltrosSemTurma;
  avaliadoAgora: (id: string) => boolean;
  selo: (id: string) => React.ReactNode;
  onAbrirAluno: (id: string) => void;
  onAvaliarGrupo: (ids: string[]) => void;
}

/** Home da aba Avulsos & Wellhub: filtros por grupo/touca e os três grupos. */
export function PainelSemTurma({ semTurma, semTurmaFiltrado, filtros, avaliadoAgora, selo, onAbrirAluno, onAvaliarGrupo }: PainelSemTurmaProps) {
  const passaTouca = (s: Aluno) => filtros.touca === 'all' || s.level === filtros.touca;
  const passaPendente = (s: Aluno) => !filtros.soPendentes || !avaliadoAgora(s.id);
  const passaGrupo = (s: Aluno) => filtros.grupo === 'all' || (s.modalidade || 'fixo') === filtros.grupo;
  const toucasPresentes = capLevelOrder.filter(k =>
    semTurma.some(s => s.level === k && passaGrupo(s) && passaPendente(s))
  );

  return (
        <div className="space-y-4">
  
          {/* filtros */}
          <div className="space-y-2.5">
            <ChipRow>
              {[{ key: 'all', titulo: 'Todos' }, ...GRUPOS_SEM_TURMA].map(g => {
                const n = g.key === 'all'
                  ? semTurma.filter(s => passaTouca(s) && passaPendente(s)).length
                  : semTurma.filter(s => (s.modalidade || 'fixo') === g.key && passaTouca(s) && passaPendente(s)).length;
                if (g.key !== 'all' && n === 0 && filtros.grupo !== g.key) return null;
                return (
                  <Chip key={g.key} active={filtros.grupo === g.key} onClick={() => filtros.setGrupo(g.key)} count={n}>
                    {g.titulo}
                  </Chip>
                );
              })}
            </ChipRow>
  
            <ChipRow>
              <Chip active={filtros.touca === 'all'} onClick={() => filtros.setTouca('all')}>Todas as toucas</Chip>
              {toucasPresentes.map(k => {
                const n = semTurma.filter(s => s.level === k && passaGrupo(s) && passaPendente(s)).length;
                return (
                  <Chip key={k} active={filtros.touca === k} onClick={() => filtros.setTouca(k)} count={n} dotClass={levels[k].bgClass}>
                    {levels[k].label}
                  </Chip>
                );
              })}
            </ChipRow>
  
            <FilterFooter>
              <Toggle checked={filtros.soPendentes} onChange={filtros.setSoPendentes} label="Só quem falta avaliar" />
              <div className="flex items-center gap-3">
                {(filtros.grupo !== 'all' || filtros.touca !== 'all' || filtros.soPendentes) && (
                  <button onClick={() => { filtros.setGrupo('all'); filtros.setTouca('all'); filtros.setSoPendentes(false); }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-info bg-info-soft border border-indigo-200 rounded-lg px-3 py-1.5">
                    Limpar filtros <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <p className="text-xs font-bold text-ink-subtle">{semTurmaFiltrado.length} aluno(s)</p>
              </div>
            </FilterFooter>
          </div>
  
          {semTurmaFiltrado.length === 0 && semTurma.length > 0 && (
            <EmptyState
              icon={<Search className="w-10 h-10" />}
              title="Nada com esses filtros"
              description={'Toque em "Limpar filtros" para ver todos.'}
            />
          )}
  
          {semTurma.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-12 h-12 text-success/40" />}
              title="Todo mundo está alocado numa turma"
              description="Nenhum aluno sem horário definido no momento."
            />
          ) : GRUPOS_SEM_TURMA.map(g => {
            const doGrupo = semTurmaFiltrado.filter(s => (s.modalidade || 'fixo') === g.key);
            if (doGrupo.length === 0) return null;
            const pend = doGrupo.filter(s => !avaliadoAgora(s.id));
            return (
              <CartaoBloco
                key={g.key}
                alunos={doGrupo}
                pendentes={pend.length}
                onAvaliar={() => onAvaliarGrupo(pend.map(a => a.id))}
                rotuloCompleto="completo"
                etiqueta={<>
                  <span className={cn('w-2.5 h-2.5 rounded-full', g.cor)} />
                  {g.titulo}
                </>}
                subtitulo={
                  <p className={cn('text-[11px] font-bold truncate', g.aviso ? 'text-warning-ink' : 'text-ink-muted')}>{g.desc}</p>
                }
              >
                {g.aviso && (
                  <div className="px-4 py-2.5 bg-warning-soft border-b border-amber-100 flex items-start gap-2">
                    <CalendarDays className="w-4 h-4 text-warning-ink shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium text-amber-800">
                      Estes alunos são de turma fixa mas ficaram sem horário — o dia/hora da planilha não bateu com nenhum professor.
                      Dá pra alocar cada um na aba <b>Alunos</b> → <b>Abrir ficha</b>.
                    </p>
                  </div>
                )}
  
                <div className="divide-y divide-slate-50">
                  {doGrupo.map(a => (
                    <LinhaAluno
                      key={a.id}
                      aluno={a}
                      mostrarTouca
                      selo={selo(a.id)}
                      onClick={() => onAbrirAluno(a.id)}
                    />
                  ))}
                </div>
              </CartaoBloco>
            );
          })}
        </div>
  );
}
