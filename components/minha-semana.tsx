'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Clock, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { capLevelOrder, levels, type CapLevel } from '@/types';
import { cn } from '@/lib/utils';
import { Badge, Card, EmptyState, ErrorState, Loading, PageHeader, PageShell } from '@/components/ui';
import { TRIMESTRE_ATUAL, trimestre } from '@/lib/trimestre';
import { lecionaEm } from '@/lib/professor';

/* ============================================================
   Minha Semana — a agenda do professor, só leitura.

   Substitui a Grade de Horários para o professor: ele precisa consultar
   o próprio horário, não criar e apagar turmas da escola inteira.
   ============================================================ */

const DIAS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const hhmm = (t: string) => String(t || '').slice(0, 5);

interface Turma { id: string; teacher_name: string; day_of_week: string; start_time: string; end_time: string }
interface Vaga { class_id: string; student_id: string | null }
interface Aluno { id: string; name: string; level: CapLevel }

async function paginado<T>(tabela: string, colunas: string): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select(colunas).range(de, de + 999);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    const lote = (data ?? []) as unknown as T[];
    if (!lote.length) break;
    linhas.push(...lote);
    if (lote.length < 1000) break;
  }
  return linhas;
}

export function MinhaSemana({ meuNome }: { meuNome: string }) {
  const [dados, setDados] = useState<{ turmas: Turma[]; vagas: Vaga[]; alunos: Aluno[]; avals: any[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [diaAberto, setDiaAberto] = useState<string>(() => {
    const d = new Date().getDay();
    return DIAS[d === 0 ? 0 : d - 1] || DIAS[0];
  });

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [turmas, vagas, alunos, avals] = await Promise.all([
          paginado<Turma>('classes', 'id, teacher_name, day_of_week, start_time, end_time'),
          paginado<Vaga>('class_slots', 'class_id, student_id'),
          paginado<Aluno>('students', 'id, name, level'),
          paginado<any>('evaluations', 'student_id, date'),
        ]);
        if (vivo) setDados({ turmas, vagas, alunos, avals });
      } catch (e: any) {
        if (vivo) setErro(e?.message ?? 'Falha ao carregar.');
      }
    })();
    return () => { vivo = false; };
  }, []);

  const semana = useMemo(() => {
    if (!dados) return null;
    const { turmas, vagas, alunos, avals } = dados;

    const minhas = turmas.filter(t => lecionaEm(t.teacher_name, meuNome));
    const alunoPorId = new Map(alunos.map(a => [a.id, a]));
    const avaliado = (id: string) => avals.some(e => e.student_id === id && trimestre(e.date) === TRIMESTRE_ATUAL);

    const porDia = DIAS.map(dia => {
      const doDia = minhas
        .filter(t => t.day_of_week === dia)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map(t => {
          const meus = vagas
            .filter(v => v.class_id === t.id && v.student_id)
            .map(v => alunoPorId.get(v.student_id!))
            .filter(Boolean) as Aluno[];
          return {
            id: t.id,
            hora: `${hhmm(t.start_time)} às ${hhmm(t.end_time)}`,
            alunos: meus,
            pendentes: meus.filter(a => !avaliado(a.id)).length,
            toucas: capLevelOrder.filter(k => meus.some(a => a.level === k)),
          };
        })
        .filter(t => t.alunos.length > 0);

      return {
        dia,
        turmas: doDia,
        alunos: doDia.reduce((s, t) => s + t.alunos.length, 0),
        pendentes: doDia.reduce((s, t) => s + t.pendentes, 0),
      };
    });

    return {
      porDia,
      totalTurmas: porDia.reduce((s, d) => s + d.turmas.length, 0),
      totalAlunos: new Set(porDia.flatMap(d => d.turmas.flatMap(t => t.alunos.map(a => a.id)))).size,
      totalPendentes: porDia.reduce((s, d) => s + d.pendentes, 0),
    };
  }, [dados, meuNome]);

  if (erro) {
    return <PageShell width="focus"><ErrorState title="Não deu para carregar a sua semana" description={erro} /></PageShell>;
  }
  if (!semana) return <PageShell width="focus"><Loading label="Montando a sua semana..." full /></PageShell>;

  const aberto = semana.porDia.find(d => d.dia === diaAberto);

  return (
    <PageShell width="focus">
      <PageHeader
        icon={CalendarDays}
        title="Minha semana"
        description={`${semana.totalTurmas} turmas · ${semana.totalAlunos} alunos · trimestre ${TRIMESTRE_ATUAL}`}
        metric={{ value: semana.totalPendentes, label: 'faltam avaliar' }}
      />

      {semana.totalTurmas === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-12 h-12" />}
          title="Nenhuma turma no seu nome"
          description="A grade ainda não tem aulas atribuídas a você. Fale com a administração."
        />
      ) : (
        <>
          {/* dias da semana */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {semana.porDia.map(d => (
              <button
                key={d.dia}
                onClick={() => setDiaAberto(d.dia)}
                disabled={d.turmas.length === 0}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-3 rounded-control border transition-all min-h-16',
                  d.turmas.length === 0 && 'opacity-40 cursor-not-allowed',
                  diaAberto === d.dia
                    ? 'bg-surface-raised text-ink-inverse border-surface-raised shadow-raised'
                    : 'bg-surface text-ink-muted border-line'
                )}
              >
                <span className="text-xs font-black uppercase">{d.dia.slice(0, 3)}</span>
                <span className="text-mini font-bold tabular-nums opacity-80">
                  {d.turmas.length === 0 ? '—' : `${d.turmas.length} turma${d.turmas.length > 1 ? 's' : ''}`}
                </span>
                {d.pendentes > 0 && (
                  <span className={cn(
                    'text-micro font-black px-1.5 rounded-badge',
                    diaAberto === d.dia ? 'bg-white/20' : 'bg-warning-soft text-warning-ink'
                  )}>
                    {d.pendentes}
                  </span>
                )}
              </button>
            ))}
          </div>

          {diaAberto === 'Sábado' && (
            <Card className="border-warning/40 bg-warning-soft flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-ink shrink-0 mt-0.5" />
              <p className="text-xs text-warning-ink leading-relaxed">
                <b>Sábado é escala alternada.</b> Estas turmas são da sua dupla: num sábado é você,
                no outro é o colega. Confira com a administração qual sábado é o seu.
              </p>
            </Card>
          )}

          {/* turmas do dia escolhido */}
          {!aberto || aberto.turmas.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-10 h-10" />}
              title={`Sem aulas na ${diaAberto.split('-')[0].toLowerCase()}`}
              description="Escolha outro dia acima."
            />
          ) : (
            <div className="space-y-3">
              {aberto.turmas.map(t => (
                <Card key={t.id} as="panel">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-black text-sm shrink-0">
                      <Clock className="w-3.5 h-3.5" /> {t.hora}
                    </span>
                    <span className="text-xs font-bold text-ink-muted flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {t.alunos.length}
                    </span>
                    <div className="flex flex-wrap gap-1 ml-auto">
                      {t.toucas.map(k => (
                        <span key={k} className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white', levels[k].bgClass)}>
                          {levels[k].label}
                        </span>
                      ))}
                    </div>
                    <Badge tone={t.pendentes > 0 ? 'warning' : 'success'}>
                      {t.pendentes > 0 ? `${t.pendentes} a avaliar` : 'turma avaliada'}
                    </Badge>
                  </div>

                  <ul className="divide-y divide-line -mx-1">
                    {t.alunos.map(a => (
                      <li key={a.id} className="flex items-center gap-2.5 px-1 py-2">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', levels[a.level]?.bgClass)} />
                        <span className="text-sm font-medium text-ink truncate">{a.name}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
