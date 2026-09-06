'use client';

import React from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { Chip, ChipRow, Toggle } from '@/components/ui';
import { CartaoBloco } from './CartaoBloco';
import { LinhaAluno } from './LinhaAluno';
import { DAYS, type Bloco } from './constantes';

interface PainelTurmasProps {
  /** No sábado o dia é fixo e o professor não aparece (a escala gira). */
  sabadoMode: boolean;
  isAdmin: boolean;
  selectedDay: string;
  setSelectedDay: (d: string) => void;
  /** Dia mostrado agora: "Sábado" na aba de sábado, o escolhido nas demais. */
  diaAtivo: string;
  filterProf: string;
  soPendentes: boolean;
  setSoPendentes: (v: boolean) => void;
  contarTurmasDoDia: (dia: string) => number;
  blocos: Bloco[];
  avaliadoAgora: (id: string) => boolean;
  selo: (id: string) => React.ReactNode;
  onAbrirAluno: (id: string) => void;
  onAvaliarBloco: (ids: string[]) => void;
}

/** Home das abas Avaliação e Avaliação de Sábado: chips de dia + blocos. */
export function PainelTurmas({
  sabadoMode, isAdmin, selectedDay, setSelectedDay, diaAtivo, filterProf,
  soPendentes, setSoPendentes, contarTurmasDoDia, blocos,
  avaliadoAgora, selo, onAbrirAluno, onAvaliarBloco,
}: PainelTurmasProps) {
  return (
        <>
          {/* dias — na aba de sábado o dia é fixo, então não aparecem */}
          {!sabadoMode && (
            <ChipRow>
              {DAYS.map(d => {
                const n = contarTurmasDoDia(d);
                return (
                  <Chip key={d} active={selectedDay === d} onClick={() => setSelectedDay(d)} count={n}>
                    {d.split('-')[0]}
                  </Chip>
                );
              })}
            </ChipRow>
          )}
  
          {/* só quem falta avaliar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Toggle checked={soPendentes} onChange={setSoPendentes} label="Só quem falta avaliar" />
            <p className="text-xs font-bold text-ink-subtle">
              {blocos.length} {sabadoMode ? 'horário(s)' : 'turma(s)'}
            </p>
          </div>
  
          {blocos.length === 0 ? (
            <div className="text-center py-16 bg-surface rounded-3xl border border-dashed border-line-strong">
              <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <h3 className="font-bold text-ink">
                {soPendentes ? 'Nada pendente' : 'Ninguém com aula'} em {diaAtivo.split('-')[0]}
                {!sabadoMode && filterProf !== 'all' && <> para {filterProf.split(' ')[0]}</>}
              </h3>
              <p className="text-ink-subtle text-sm mt-1">
                {soPendentes
                  ? 'Todo mundo já foi avaliado neste trimestre. Desligue o filtro para ver todos.'
                  : sabadoMode ? 'Busque o aluno pelo nome.' : 'Escolha outro dia, troque o professor ou busque o aluno pelo nome.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {blocos.map(bloco => {
                const alunos = bloco.alunos;
                const pend = alunos.filter(a => !avaliadoAgora(a.id));
                return (
                  <CartaoBloco
                    key={bloco.chave}
                    alunos={alunos}
                    pendentes={pend.length}
                    onAvaliar={() => onAvaliarBloco(pend.map(a => a.id))}
                    rotuloCompleto="completa"
                    etiqueta={<><Clock className="w-3.5 h-3.5" /> {bloco.hora}</>}
                    subtitulo={
                      bloco.professor && isAdmin
                        ? <p className="text-[11px] font-bold text-ink-muted truncate">{bloco.professor}</p>
                        : undefined
                    }
                  >
                    {alunos.length > 0 && (
                      <div className="divide-y divide-slate-50">
                        {alunos.map(a => (
                          <LinhaAluno
                            key={a.id}
                            aluno={a}
                            selo={selo(a.id)}
                            onClick={() => onAbrirAluno(a.id)}
                          />
                        ))}
                      </div>
                    )}
                  </CartaoBloco>
                );
              })}
            </div>
          )}
        </>
  );
}
