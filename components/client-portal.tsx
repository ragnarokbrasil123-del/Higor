'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, Droplets, Award, Calendar, Check, X as XIcon, FileText, Clock, User, BellRing, BellOff } from 'lucide-react';
import { levels, Student, CapLevel } from '@/types';
import { EVALUATION_CRITERIA } from '@/lib/evaluation-criteria';
import { gerarBoletimPDF } from '@/lib/boletim-pdf';
import { ativarAvisos, jaInscrito, suportaAvisos } from '@/lib/push';
import { InstallPrompt } from '@/components/install-prompt';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ClientPortalProps {
  students: Student[];
  onLogout: () => void;
}

interface Aula {
  dia: string;
  inicio: string;
  fim: string;
  professor: string;
}

const hhmm = (t: string) => String(t || '').slice(0, 5);

export function ClientPortal({ students, onLogout }: ClientPortalProps) {
  const filhos = (students || []).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const [aulas, setAulas] = useState<Record<string, Aula[]>>({});
  const [avisosOn, setAvisosOn] = useState<boolean | null>(null);
  const [ativando, setAtivando] = useState(false);

  useEffect(() => { jaInscrito().then(setAvisosOn); }, []);

  const ligarAvisos = async () => {
    setAtivando(true);
    try {
      await ativarAvisos(filhos[0]?.phone || '');
      setAvisosOn(true);
      alert('Pronto! Você será avisado assim que sair uma nova avaliação. 🔔');
    } catch (e: any) {
      alert(e.message || 'Não consegui ativar os avisos.');
    } finally {
      setAtivando(false);
    }
  };

  const student = filhos[Math.min(idx, filhos.length - 1)];

  // busca dia/horário/professor de cada filho
  useEffect(() => {
    (async () => {
      const ids = filhos.map(f => f.id);
      if (!ids.length) return;
      const { data: slots } = await supabase.from('class_slots').select('class_id, student_id').in('student_id', ids);
      if (!slots?.length) return;
      const classIds = [...new Set(slots.map(s => s.class_id))];
      const { data: cls } = await supabase
        .from('classes')
        .select('id, teacher_name, day_of_week, start_time, end_time')
        .in('id', classIds);
      if (!cls) return;
      const porId = new Map(cls.map(c => [c.id, c]));
      const mapa: Record<string, Aula[]> = {};
      slots.forEach(s => {
        const c = porId.get(s.class_id);
        if (!c || !s.student_id) return;
        (mapa[s.student_id] ||= []).push({
          dia: c.day_of_week, inicio: hhmm(c.start_time), fim: hhmm(c.end_time), professor: c.teacher_name,
        });
      });
      const ORDEM = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      Object.values(mapa).forEach(a => a.sort((x, y) => ORDEM.indexOf(x.dia) - ORDEM.indexOf(y.dia) || x.inicio.localeCompare(y.inicio)));
      setAulas(mapa);
    })();
  }, [filhos.length]);

  if (!student) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <p className="text-slate-500 font-bold">Nenhum aluno encontrado nesta conta.</p>
        <button onClick={onLogout} className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold">Sair</button>
      </div>
    );
  }

  const nivel = levels[student.level] || levels.orange;
  const avaliacoes = [...(student.evaluations || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const minhasAulas = aulas[student.id] || [];

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 overflow-y-auto">
      {/* Cabeçalho */}
      <div className="bg-black pt-12 pb-6 px-6 shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex justify-between items-start relative z-10">
          <img src="/logo.png" alt="Clube Olimpo" className="h-10 w-auto object-contain" />
          <button onClick={onLogout} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 backdrop-blur-md">
            Sair <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Seletor de filhos */}
        {filhos.length > 1 && (
          <div className="mt-6 flex gap-2 overflow-x-auto relative z-10 pb-1">
            {filhos.map((f, i) => (
              <button key={f.id} onClick={() => setIdx(i)} className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border transition-all',
                i === idx ? 'bg-white text-slate-900 border-white' : 'bg-white/10 text-white border-white/20'
              )}>
                {f.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-4 relative z-10">
          <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-lg border-2 border-white/20', nivel.bgClass)}>
            {student.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">{student.name}</h1>
            <p className="text-slate-400 text-sm mt-1">Dossiê do Aluno</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full -mt-4 relative z-20 space-y-6">

        {/* Avisos no celular */}
        {suportaAvisos() && avisosOn === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-11 h-11 bg-amber-400 rounded-2xl flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1">
              <p className="font-black text-amber-900 text-sm">Quer ser avisado quando sair a avaliação?</p>
              <p className="text-xs font-medium text-amber-800 mt-0.5">
                Ative os avisos e o celular te avisa sozinho — não precisa ficar conferindo.
              </p>
            </div>
            <button onClick={ligarAvisos} disabled={ativando} className="px-5 py-3 bg-black text-white rounded-xl font-bold text-sm shrink-0 active:scale-95 transition-transform disabled:opacity-50">
              {ativando ? 'Ativando...' : 'Ativar avisos'}
            </button>
          </div>
        )}
        {avisosOn === true && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 w-fit">
            <BellRing className="w-3.5 h-3.5" /> Avisos ativados neste aparelho
          </div>
        )}

        {/* Nível */}
        <div className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200 border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nível Atual</p>
            <div className="flex items-center gap-2">
              <Award className={cn('w-6 h-6', nivel.colorClass)} />
              <p className="text-xl font-extrabold text-slate-800">Touca {nivel.name}</p>
            </div>
          </div>
          {student.age ? (
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Idade</p>
              <p className="text-xl font-extrabold text-slate-800">{student.age} anos</p>
            </div>
          ) : null}
        </div>

        {/* Aulas */}
        {minhasAulas.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Aulas da semana
            </h2>
            <div className="space-y-2">
              {minhasAulas.map((a, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-black shrink-0">
                    {a.inicio} às {a.fim}
                  </span>
                  <span className="font-bold text-slate-700 text-sm">{a.dia}</span>
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1 ml-auto">
                    <User className="w-3 h-3" /> {a.professor}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avaliações */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> Histórico de Avaliações
          </h2>

          {avaliacoes.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 border-dashed">
              <Droplets className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma avaliação registrada ainda.</p>
              <p className="text-slate-400 text-sm mt-1">Assim que o professor avaliar, aparece aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {avaliacoes.map(ev => {
                const evLevel = levels[ev.level as CapLevel];
                const criterios = EVALUATION_CRITERIA[ev.level as CapLevel] || [];
                const scores = ev.scores || {};
                const passou = criterios.filter(c => scores[c.id] === 'passed').length;

                return (
                  <div key={ev.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                      <div>
                        <p className="font-extrabold text-slate-800 text-lg leading-tight">
                          {new Date(ev.date).toLocaleDateString('pt-BR')}
                        </p>
                        {evLevel && (
                          <span className={cn('inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white', evLevel.bgClass)}>
                            Touca {evLevel.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('px-3 py-1 text-xs font-bold rounded-lg uppercase', ev.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                          {ev.approved ? 'Aprovado' : 'Em treinamento'}
                        </span>
                        <button onClick={() => gerarBoletimPDF(ev, student.name)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform">
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </div>

                    {/* Recado do professor primeiro — é o que o pai quer ler */}
                    {ev.notes && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Recado do Professor</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{ev.notes}</p>
                      </div>
                    )}

                    {criterios.length > 0 && (
                      <>
                        <p className="text-xs font-bold text-slate-500 mb-2">
                          {passou} de {criterios.length} fundamentos concluídos
                        </p>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${criterios.length ? (passou / criterios.length) * 100 : 0}%` }} />
                        </div>
                        <div className="space-y-1.5">
                          {criterios.map(crit => {
                            const st = scores[crit.id] || 'pending';
                            return (
                              <div key={crit.id} className="flex items-start gap-2 text-sm">
                                <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                                  st === 'passed' ? 'bg-emerald-100 text-emerald-600' : st === 'failed' ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400')}>
                                  {st === 'passed' ? <Check className="w-3 h-3" strokeWidth={3} /> : st === 'failed' ? <XIcon className="w-3 h-3" strokeWidth={3} /> : <span className="text-[10px] font-bold">–</span>}
                                </div>
                                <span className={cn('leading-snug', st === 'passed' ? 'text-slate-700' : 'text-slate-500')}>{crit.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {ev.approved && (
                      <div className="mt-4 p-3 bg-emerald-500 rounded-xl text-white text-center shadow-lg shadow-emerald-500/20">
                        <p className="text-sm font-bold">Parabéns! {student.name.split(' ')[0]} foi aprovado(a) para trocar de touca! 🏅</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Convite para instalar o app na tela do celular */}
      <InstallPrompt />
    </div>
  );
}
