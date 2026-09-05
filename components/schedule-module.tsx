'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Calendar, Clock, User, X, LayoutGrid, AlertTriangle, ChevronDown, CheckCircle2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CapLevel, levels, capLevelOrder } from '@/types';
import { cn } from '@/lib/utils';
import { Button, Chip, ChipRow, EmptyState, FilterBar, FilterFooter, Input, Modal, PageHeader, PageShell, Select, Toggle } from '@/components/ui';

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

  // --- filtros da grade ---
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const d = new Date().getDay(); // 0=dom
    return DAYS[d === 0 ? 0 : d - 1] || DAYS[0];
  });
  const [search, setSearch] = useState('');
  const [filterProf, setFilterProf] = useState<string>('all');
  const [filterTouca, setFilterTouca] = useState<string>('all');
  const [onlyWithStudents, setOnlyWithStudents] = useState(false);

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

  // ================= filtros / agrupamento da grade =================
  const busca = search.trim().toLowerCase();
  const buscando = busca.length > 0;

  const alunosDaTurma = (c: ClassBlock) =>
    (c.class_slots || []).map(s => (s.student_id ? studentsMap[s.student_id] : null)).filter(Boolean) as string[];

  const passaFiltros = (c: ClassBlock) => {
    if (filterProf !== 'all' && c.teacher_name !== filterProf) return false;
    if (filterTouca !== 'all' && !(c.class_slots || []).some(s => s.cap_color === filterTouca)) return false;
    if (onlyWithStudents && !(c.class_slots || []).some(s => s.student_id)) return false;
    if (buscando) {
      const noProf = c.teacher_name.toLowerCase().includes(busca);
      const noAluno = alunosDaTurma(c).some(n => n.toLowerCase().includes(busca));
      if (!noProf && !noAluno) return false;
    } else if (c.day_of_week !== selectedDay) {
      return false;
    }
    return true;
  };

  const visiveis = classes.filter(passaFiltros);
  const contagemPorDia = DAYS.reduce((acc, d) => {
    acc[d] = classes.filter(c => c.day_of_week === d).length;
    return acc;
  }, {} as Record<string, number>);

  // agrupa: (dia quando buscando) -> horario -> turmas
  const grupos: { titulo: string; blocos: { hora: string; turmas: ClassBlock[] }[] }[] = [];
  const diasParaMostrar = buscando ? DAYS.filter(d => visiveis.some(c => c.day_of_week === d)) : [selectedDay];
  for (const dia of diasParaMostrar) {
    const doDia = visiveis.filter(c => c.day_of_week === dia);
    if (!doDia.length) continue;
    const horas = [...new Set(doDia.map(c => c.start_time.slice(0, 5)))].sort();
    grupos.push({
      titulo: dia,
      blocos: horas.map(h => ({ hora: h, turmas: doDia.filter(c => c.start_time.slice(0, 5) === h) })),
    });
  }

  const totalVagas = visiveis.reduce((s, c) => s + (c.class_slots?.length || 0), 0);
  const totalOcupadas = visiveis.reduce((s, c) => s + (c.class_slots || []).filter(x => x.student_id).length, 0);

  return (
    <PageShell width="wide">
        <PageHeader
          icon={LayoutGrid}
          title="Grade de horários"
          description="Turmas por professor, touca e horário."
          action={isAdmin ? (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-5 h-5" /> Adicionar horário
            </Button>
          ) : undefined}
        />

        {/* ===================== Filtros ===================== */}
        <FilterBar>
          <ChipRow>
            {DAYS.map(d => (
              <Chip key={d} active={!buscando && selectedDay === d} onClick={() => { setSelectedDay(d); setSearch(''); }} count={contagemPorDia[d]}>
                {d.split('-')[0]}
              </Chip>
            ))}
          </ChipRow>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar aluno ou professor (em todos os dias)..."
                className="pl-9 pr-9 py-2.5"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Select value={filterProf} onChange={e => setFilterProf(e.target.value)} className="w-full md:w-auto py-2.5 md:max-w-[230px]">
              <option value="all">Todos os professores</option>
              {professors.map(p => <option key={p.id} value={p.name || ''}>{p.name}</option>)}
            </Select>
            <Select value={filterTouca} onChange={e => setFilterTouca(e.target.value)} className="w-full md:w-auto py-2.5">
              <option value="all">Todas as toucas</option>
              {CAP_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </Select>
          </div>

          <FilterFooter>
            <p className="text-xs font-bold text-ink-muted">
              {visiveis.length} turma(s) · {totalOcupadas} aluno(s) · {totalVagas - totalOcupadas} vaga(s) livre(s)
              {buscando && <span className="text-info"> · buscando em todos os dias</span>}
            </p>
            <Toggle checked={onlyWithStudents} onChange={setOnlyWithStudents} label="Só turmas com aluno" />
          </FilterFooter>
        </FilterBar>

        {/* ===================== Turmas ===================== */}
        <div className="space-y-8">
          {grupos.map(g => (
            <div key={g.titulo}>
              {buscando && (
                <h2 className="text-lg font-black text-ink mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" /> {g.titulo}
                </h2>
              )}
              <div className="space-y-5">
                {g.blocos.map(b => (
                  <div key={b.hora}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-white rounded-lg text-sm font-black shrink-0">
                        <Clock className="w-3.5 h-3.5" /> {b.hora}
                      </div>
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[11px] font-bold text-ink-subtle shrink-0">{b.turmas.length} turma(s)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {b.turmas.map(cls => (
                        <div key={cls.id} className="relative bg-surface rounded-2xl p-3.5 border border-line group hover:border-indigo-300 transition-colors shadow-sm">
                          {isAdmin && (
                            <button onClick={() => handleDeleteClass(cls.id)} className="absolute top-3 right-3 p-1.5 text-ink-subtle hover:text-danger hover:bg-danger-soft rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div className="flex items-start gap-2 mb-3 pr-6">
                            <User className="w-3.5 h-3.5 text-ink-subtle mt-0.5 shrink-0" />
                            <span className="text-xs font-black text-ink-muted leading-tight">{cls.teacher_name}</span>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            {cls.class_slots?.map(slot => {
                              const info = levels[slot.cap_color as CapLevel];
                              const studentName = slot.student_id ? studentsMap[slot.student_id] : null;
                              const destaque = buscando && !!studentName && studentName.toLowerCase().includes(busca);
                              return (
                                <div
                                  key={slot.id}
                                  onClick={() => handleStudentClick(slot.student_id)}
                                  className={cn(
                                    'px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border text-white transition-all',
                                    info?.bgClass || 'bg-slate-300 text-ink',
                                    studentName ? 'border-white/30 cursor-pointer hover:-translate-y-0.5 active:scale-95' : 'opacity-50 border-dashed cursor-default',
                                    destaque && 'ring-2 ring-offset-1 ring-amber-400'
                                  )}
                                >
                                  <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', studentName ? 'bg-surface' : 'bg-white/50')} />
                                  <span className="flex-1 break-words leading-tight">
                                    {studentName ? studentName : `${info?.label || slot.cap_color} (livre)`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {classes.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-line-strong">
              <LayoutGrid className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-ink">Nenhum horário criado</h3>
              <p className="text-ink-muted mt-2">
                {isAdmin ? 'Clique em "Adicionar Horário" para montar a primeira turma.' : 'Nenhuma turma vinculada a você ainda.'}
              </p>
            </div>
          ) : grupos.length === 0 ? (
            <div className="text-center py-16 bg-surface rounded-3xl border border-dashed border-line-strong">
              <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-ink">Nada encontrado</h3>
              <p className="text-ink-muted text-sm mt-1">Ajuste a busca ou os filtros.</p>
            </div>
          ) : null}
        </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="md"
        title="Nova turma / horário"
        footer={
          <Button form="classForm" type="submit" disabled={isSubmitting} block size="lg">
            {isSubmitting ? 'Criando turmas...' : form.days_of_week.length > 1 ? `Criar ${form.days_of_week.length} turmas` : 'Criar turma'}
          </Button>
        }
      >
                <form id="classForm" onSubmit={handleCreateClass} className="space-y-6">
                  <div className="space-y-5 bg-surface-sunken p-5 rounded-2xl border border-line">
                    <div className="relative">
                      <label className="block text-sm font-bold text-ink mb-2">Professor</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={form.teacher_name}
                          onChange={e => { setForm({ ...form, teacher_name: e.target.value }); setIsTeacherDropdownOpen(true); setShowFullList(false); }}
                          onFocus={() => { setIsTeacherDropdownOpen(true); setShowFullList(true); }}
                          onBlur={() => setTimeout(() => setIsTeacherDropdownOpen(false), 200)}
                          placeholder="Clique para escolher da lista..."
                          className="w-full bg-surface border border-line rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-ink font-medium pr-10"
                        />
                        <button type="button" tabIndex={-1} className="absolute right-3 top-3.5" onClick={() => { setIsTeacherDropdownOpen(true); setShowFullList(true); }}>
                          <ChevronDown className="w-5 h-5 text-ink-subtle hover:text-indigo-500 transition-colors" />
                        </button>
                      </div>

                      <AnimatePresence>
                        {isTeacherDropdownOpen && activeList.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-10 w-full mt-2 bg-surface border border-line rounded-xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
                            {activeList.map(p => (
                              <button key={p.id} type="button" onClick={() => { setForm({ ...form, teacher_name: p.name || '' }); setIsTeacherDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-info-soft transition-colors border-b border-slate-50 last:border-0">
                                <span className="block text-ink font-bold">{p.name || p.username}</span>
                                <span className="block text-[11px] text-ink-subtle font-medium truncate">{summarizeProf(p.schedule)}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {professors.length === 0 && (
                        <p className="mt-2 text-xs font-bold text-warning-ink bg-warning-soft border border-amber-200 rounded-lg p-2">
                          Nenhum professor ativo cadastrado. Cadastre na aba Professores.
                        </p>
                      )}
                      {selectedProf && (
                        <p className="mt-2 text-[11px] text-ink-muted font-medium">
                          <span className="font-bold text-ink-muted">Trabalha:</span> {summarizeProf(selectedProf.schedule)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-ink mb-2">Quais dias dessa aula?</label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map(d => (
                          <button type="button" key={d} onClick={() => toggleDay(d)} className={cn('px-4 py-2 rounded-xl text-sm font-bold border transition-all', form.days_of_week.includes(d) ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-surface text-ink-muted border-line hover:border-indigo-300')}>
                            {d.split('-')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-ink mb-2">Horário Início</label>
                        <input type="time" required value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="w-full bg-surface border border-line rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-ink" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-ink mb-2">Horário Fim</label>
                        <input type="time" required value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="w-full bg-surface border border-line rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-ink" />
                      </div>
                    </div>

                    {/* Cruzamento com o horário do professor */}
                    {selectedProf && form.days_of_week.length > 0 && (
                      conflicts.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-success-ink bg-success-soft border border-emerald-200 rounded-xl p-3">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> Dentro do horário de trabalho do professor.
                        </div>
                      ) : (
                        <div className="text-sm bg-warning-soft border border-amber-200 rounded-xl p-3 space-y-1">
                          <div className="flex items-center gap-2 font-black text-amber-800">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> Fora do horário do professor:
                          </div>
                          {conflicts.map(c => (
                            <p key={c.day} className="text-warning-ink font-medium ml-6">
                              {c.day.split('-')[0]}: {c.hours === 'folga' ? 'é folga dele(a)' : `só trabalha ${c.hours}`}
                            </p>
                          ))}
                          <p className="text-[11px] text-warning-ink ml-6 pt-1">Você ainda pode salvar (ex.: substituição).</p>
                        </div>
                      )
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-ink mb-1">Vagas por touca</h3>
                    <p className="text-xs text-ink-muted mb-4">
                      Amarela / Laranja / Vermelha: turma de um nível só. Verde em diante: pode misturar níveis na mesma turma.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {CAP_OPTIONS.map(opt => (
                        <div key={opt.key} className={cn('flex flex-col p-3 rounded-xl border transition-colors', form.slots[opt.key] > 0 ? 'bg-info-soft border-indigo-200' : 'bg-surface border-line')}>
                          <label className="text-sm font-bold text-ink mb-2 flex items-center gap-2">
                            <div className={cn('w-3 h-3 rounded-full shadow-sm', opt.bg)} /> {opt.label}
                          </label>
                          <div className="flex items-center bg-surface-sunken rounded-lg p-1">
                            <button type="button" onClick={() => setForm({ ...form, slots: { ...form.slots, [opt.key]: Math.max(0, form.slots[opt.key] - 1) } })} className="w-8 h-8 flex items-center justify-center bg-surface rounded-md text-ink-muted font-bold shadow-sm hover:text-danger">-</button>
                            <span className="flex-1 text-center font-black text-ink">{form.slots[opt.key]}</span>
                            <button type="button" onClick={() => setForm({ ...form, slots: { ...form.slots, [opt.key]: form.slots[opt.key] + 1 } })} className="w-8 h-8 flex items-center justify-center bg-surface rounded-md text-ink-muted font-bold shadow-sm hover:text-green-500">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
      </Modal>
    </PageShell>
  );
}
