'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Calendar, Clock, User, X, LayoutGrid, AlertTriangle, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CapLevel, levels, capLevelOrder } from '@/types';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

interface ClassSlot {
  id: string;
  class_id: string;
  cap_color: string; // chave de nível: 'orange', 'green', ...
  student_id: string | null;
}

interface ClassBlock {
  id: string;
  teacher_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  class_slots?: ClassSlot[];
}

type Shift = { start: string; end: string };
interface ProfLite {
  id: string;
  name: string | null;
  username: string | null;
  active: boolean | null;
  schedule: Record<string, { enabled: boolean; shifts: Shift[] }> | null;
}

const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DAY_TO_KEY: Record<string, string> = {
  'Segunda-feira': 'seg', 'Terça-feira': 'ter', 'Quarta-feira': 'qua',
  'Quinta-feira': 'qui', 'Sexta-feira': 'sex', 'Sábado': 'sab',
};
const DAY_KEY_SHORT: Record<string, string> = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb' };

const CAP_OPTIONS = capLevelOrder.map(key => ({ key, label: levels[key].label, bg: levels[key].bgClass }));
const emptySlots = () => capLevelOrder.reduce((acc, k) => ({ ...acc, [k]: 0 }), {} as Record<CapLevel, number>);

// Verifica se a janela [start,end] cabe em algum turno do professor naquele dia
function windowFits(schedule: ProfLite['schedule'], dayKey: string, start: string, end: string): { ok: boolean; hours: string } {
  const d = schedule?.[dayKey];
  if (!d?.enabled) return { ok: false, hours: 'folga' };
  const shifts = (Array.isArray(d.shifts) ? d.shifts : []).filter(s => s?.start && s?.end);
  if (!shifts.length) return { ok: false, hours: 'sem horário definido' };
  const ok = shifts.some(s => s.start <= start && end <= s.end);
  return { ok, hours: shifts.map(s => `${s.start}–${s.end}`).join(' / ') };
}

// Resumo textual do horário semanal do professor
function summarizeProf(schedule: ProfLite['schedule']): string {
  if (!schedule) return 'sem horário cadastrado';
  const parts: string[] = [];
  (['seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const).forEach(k => {
    const d = schedule[k];
    if (!d?.enabled) return;
    const txt = (d.shifts || []).filter(s => s.start && s.end).map(s => `${s.start}–${s.end}`).join(' / ');
    if (txt) parts.push(`${DAY_KEY_SHORT[k]} ${txt}`);
  });
  return parts.length ? parts.join('  •  ') : 'sem horário cadastrado';
}

export function ScheduleModule() {
  const [classes, setClasses] = useState<ClassBlock[]>([]);
  const [professors, setProfessors] = useState<ProfLite[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: string; data: any } | null>(null);
  const [studentsMap, setStudentsMap] = useState<Record<string, string>>({});
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [showFullList, setShowFullList] = useState(false);

  const [form, setForm] = useState({
    teacher_name: '',
    days_of_week: ['Segunda-feira'] as string[],
    start_time: '08:00',
    end_time: '08:45',
    slots: emptySlots(),
  });

  useEffect(() => {
    const raw = localStorage.getItem('olimpo_session');
    if (raw) setCurrentUser(JSON.parse(raw));
    loadClasses();
    loadProfessors();
  }, []);

  const loadClasses = async () => {
    const raw = localStorage.getItem('olimpo_session');
    const sess = raw ? JSON.parse(raw) : null;

    let query = supabase.from('classes').select('*').order('start_time', { ascending: true });
    if (sess && sess.role !== 'admin') {
      const tName = sess.data?.name || sess.data?.username;
      if (tName) query = query.eq('teacher_name', tName);
    }

    const { data: clsData } = await query;
    const { data: slotData } = await supabase.from('class_slots').select('*');
    const { data: stuData } = await supabase.from('students').select('id, name');

    if (stuData) {
      const map: Record<string, string> = {};
      stuData.forEach(s => { map[s.id] = s.name; });
      setStudentsMap(map);
    }

    if (clsData) {
      setClasses(clsData.map(c => ({
        ...c,
        class_slots: slotData?.filter(s => s.class_id === c.id) || [],
      })));
    }
  };

  const loadProfessors = async () => {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, name, username, active, schedule')
      .eq('role', 'teacher')
      .order('name', { ascending: true });
    if (error) { console.error('Erro ao carregar professores:', error); return; }
    if (data) {
      setProfessors((data as ProfLite[]).filter(p => (p.active ?? true) && (p.name || p.username)));
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacher_name.trim()) return alert('Selecione o professor.');
    if (form.days_of_week.length === 0) return alert('Selecione pelo menos um dia da semana.');

    const totalSlots = Object.values(form.slots).reduce((a, b) => a + b, 0);
    if (totalSlots === 0) return alert('Adicione pelo menos 1 vaga de aluno para essa turma.');

    setIsSubmitting(true);
    try {
      for (const day of form.days_of_week) {
        const { data: newClass, error: classErr } = await supabase.from('classes').insert([{
          teacher_name: form.teacher_name.trim(),
          day_of_week: day,
          start_time: form.start_time,
          end_time: form.end_time,
        }]).select().single();

        if (classErr) throw new Error('Tabela classes: ' + classErr.message);

        const slotsToInsert: { class_id: string; cap_color: string }[] = [];
        for (const [levelKey, amount] of Object.entries(form.slots)) {
          for (let i = 0; i < (amount as number); i++) {
            slotsToInsert.push({ class_id: newClass.id, cap_color: levelKey });
          }
        }
        if (slotsToInsert.length > 0) {
          const { error: slotsErr } = await supabase.from('class_slots').insert(slotsToInsert);
          if (slotsErr) throw new Error('Tabela class_slots: ' + slotsErr.message);
        }
      }

      await loadClasses();
      setIsModalOpen(false);
      setForm({ ...form, teacher_name: '', days_of_week: ['Segunda-feira'], slots: emptySlots() });
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar turma: ' + (err.message || 'desconhecido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Apagar essa turma inteira e todas as suas vagas?')) return;
    await supabase.from('class_slots').delete().eq('class_id', id);
    await supabase.from('classes').delete().eq('id', id);
    loadClasses();
  };

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day],
    }));
  };

  // Teleporte para a Avaliação ao clicar num aluno
  const handleStudentClick = (studentId: string | null) => {
    if (!studentId) return;
    localStorage.setItem('olympus_jump_eval', studentId);
    window.dispatchEvent(new CustomEvent('jumpToTab', { detail: 'swimming' }));
  };

  const selectedProf = professors.find(p => p.name === form.teacher_name);
  const activeList = showFullList
    ? professors
    : professors.filter(p => (p.name || '').toLowerCase().includes(form.teacher_name.toLowerCase()));

  const availability = selectedProf
    ? form.days_of_week.map(day => ({
        day,
        ...windowFits(selectedProf.schedule, DAY_TO_KEY[day], form.start_time, form.end_time),
      }))
    : [];
  const conflicts = availability.filter(a => !a.ok);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-4 md:mt-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                <LayoutGrid className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Grade de Horários</h1>
            </div>
            <p className="text-slate-500 font-medium ml-16">Turmas por professor, touca e horário.</p>
          </div>

          {isAdmin && (
            <button onClick={() => setIsModalOpen(true)} className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all">
              <Plus className="w-5 h-5" /> Adicionar Horário
            </button>
          )}
        </div>

        <div className="space-y-6">
          {DAYS.map(day => {
            const classesOnDay = classes.filter(c => c.day_of_week === day);
            if (classesOnDay.length === 0) return null;

            return (
              <div key={day} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-black text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" /> {day}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classesOnDay.map(cls => (
                    <div key={cls.id} className="relative bg-slate-50 rounded-2xl p-4 border border-slate-200 group hover:border-indigo-300 transition-colors shadow-sm hover:shadow-md">
                      {isAdmin && (
                        <button onClick={() => handleDeleteClass(cls.id)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="flex items-center gap-2 text-slate-700 font-black text-lg mb-1">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        {cls.start_time.slice(0, 5)} às {cls.end_time.slice(0, 5)}
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 font-bold mb-4">
                        <User className="w-4 h-4" />
                        Prof. {cls.teacher_name}
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Alunos na Turma:</div>
                        <div className="flex flex-col gap-2">
                          {cls.class_slots?.map(slot => {
                            const info = levels[slot.cap_color as CapLevel];
                            const studentName = slot.student_id ? studentsMap[slot.student_id] : null;

                            return (
                              <div
                                key={slot.id}
                                onClick={() => handleStudentClick(slot.student_id)}
                                className={cn(
                                  'px-3 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 border transition-all text-white',
                                  info?.bgClass || 'bg-slate-300 text-slate-700',
                                  studentName ? 'border-white/30 cursor-pointer hover:-translate-y-0.5 active:scale-95 hover:shadow-md' : 'opacity-70 border-dashed cursor-default'
                                )}
                              >
                                <div className={cn('w-2 h-2 rounded-full shrink-0', studentName ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/50 animate-pulse')} />
                                <span className="flex-1 break-words leading-tight">
                                  {studentName ? studentName : `${info?.label || slot.cap_color} (vaga livre)`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {classes.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <LayoutGrid className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700">Nenhum horário criado</h3>
              <p className="text-slate-500 mt-2">
                {isAdmin ? 'Clique em "Adicionar Horário" para montar a primeira turma.' : 'Nenhuma turma vinculada a você ainda.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-100 shrink-0">
                <h2 className="text-xl font-black text-slate-800">Nova Turma / Horário</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="classForm" onSubmit={handleCreateClass} className="space-y-6">
                  <div className="space-y-5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="relative">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Professor</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={form.teacher_name}
                          onChange={e => { setForm({ ...form, teacher_name: e.target.value }); setIsTeacherDropdownOpen(true); setShowFullList(false); }}
                          onFocus={() => { setIsTeacherDropdownOpen(true); setShowFullList(true); }}
                          onBlur={() => setTimeout(() => setIsTeacherDropdownOpen(false), 200)}
                          placeholder="Clique para escolher da lista..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium pr-10"
                        />
                        <button type="button" tabIndex={-1} className="absolute right-3 top-3.5" onClick={() => { setIsTeacherDropdownOpen(true); setShowFullList(true); }}>
                          <ChevronDown className="w-5 h-5 text-slate-400 hover:text-indigo-500 transition-colors" />
                        </button>
                      </div>

                      <AnimatePresence>
                        {isTeacherDropdownOpen && activeList.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
                            {activeList.map(p => (
                              <button key={p.id} type="button" onClick={() => { setForm({ ...form, teacher_name: p.name || '' }); setIsTeacherDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0">
                                <span className="block text-slate-700 font-bold">{p.name || p.username}</span>
                                <span className="block text-[11px] text-slate-400 font-medium truncate">{summarizeProf(p.schedule)}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {professors.length === 0 && (
                        <p className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                          Nenhum professor ativo cadastrado. Cadastre na aba Professores.
                        </p>
                      )}
                      {selectedProf && (
                        <p className="mt-2 text-[11px] text-slate-500 font-medium">
                          <span className="font-bold text-slate-600">Trabalha:</span> {summarizeProf(selectedProf.schedule)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Quais dias dessa aula?</label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map(d => (
                          <button type="button" key={d} onClick={() => toggleDay(d)} className={cn('px-4 py-2 rounded-xl text-sm font-bold border transition-all', form.days_of_week.includes(d) ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300')}>
                            {d.split('-')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Horário Início</label>
                        <input type="time" required value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Horário Fim</label>
                        <input type="time" required value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700" />
                      </div>
                    </div>

                    {/* Cruzamento com o horário do professor */}
                    {selectedProf && form.days_of_week.length > 0 && (
                      conflicts.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> Dentro do horário de trabalho do professor.
                        </div>
                      ) : (
                        <div className="text-sm bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                          <div className="flex items-center gap-2 font-black text-amber-800">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> Fora do horário do professor:
                          </div>
                          {conflicts.map(c => (
                            <p key={c.day} className="text-amber-700 font-medium ml-6">
                              {c.day.split('-')[0]}: {c.hours === 'folga' ? 'é folga dele(a)' : `só trabalha ${c.hours}`}
                            </p>
                          ))}
                          <p className="text-[11px] text-amber-600 ml-6 pt-1">Você ainda pode salvar (ex.: substituição).</p>
                        </div>
                      )
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-800 mb-1">Vagas por touca</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Amarela / Laranja / Vermelha: turma de um nível só. Verde em diante: pode misturar níveis na mesma turma.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {CAP_OPTIONS.map(opt => (
                        <div key={opt.key} className={cn('flex flex-col p-3 rounded-xl border transition-colors', form.slots[opt.key] > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200')}>
                          <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <div className={cn('w-3 h-3 rounded-full shadow-sm', opt.bg)} /> {opt.label}
                          </label>
                          <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button type="button" onClick={() => setForm({ ...form, slots: { ...form.slots, [opt.key]: Math.max(0, form.slots[opt.key] - 1) } })} className="w-8 h-8 flex items-center justify-center bg-white rounded-md text-slate-600 font-bold shadow-sm hover:text-red-500">-</button>
                            <span className="flex-1 text-center font-black text-slate-700">{form.slots[opt.key]}</span>
                            <button type="button" onClick={() => setForm({ ...form, slots: { ...form.slots, [opt.key]: form.slots[opt.key] + 1 } })} className="w-8 h-8 flex items-center justify-center bg-white rounded-md text-slate-600 font-bold shadow-sm hover:text-green-500">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                <button form="classForm" type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? 'Criando turmas...' : form.days_of_week.length > 1 ? `Criar ${form.days_of_week.length} turmas` : 'Criar turma'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
