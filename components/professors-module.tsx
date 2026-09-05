'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Plus, Trash2, Edit2, X, Save, Key, Clock, UserCheck, UserX, Copy, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Badge, Button, DataTable, EmptyState, Input, Loading, Modal, PageHeader, PageShell, ResponsiveTable, RowCard, TD, TH, THead, TR, Toggle } from '@/components/ui';

type Shift = { start: string; end: string };
type DaySchedule = { enabled: boolean; shifts: Shift[] };
type DayKey = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab';
type WeekSchedule = Record<DayKey, DaySchedule>;

interface Professor {
  id: string;
  name: string | null;
  username: string | null;
  password: string | null;
  role: string;
  active: boolean | null;
  schedule: WeekSchedule | null;
}

const DAYS: { key: DayKey; label: string; full: string }[] = [
  { key: 'seg', label: 'Seg', full: 'Segunda' },
  { key: 'ter', label: 'Ter', full: 'Terça' },
  { key: 'qua', label: 'Qua', full: 'Quarta' },
  { key: 'qui', label: 'Qui', full: 'Quinta' },
  { key: 'sex', label: 'Sex', full: 'Sexta' },
  { key: 'sab', label: 'Sáb', full: 'Sábado' },
];
const WEEKDAYS: DayKey[] = ['seg', 'ter', 'qua', 'qui', 'sex'];

const emptyShift = (): Shift => ({ start: '', end: '' });
const emptyDay = (enabled = false): DaySchedule => ({ enabled, shifts: [emptyShift()] });

function emptyWeek(): WeekSchedule {
  return {
    seg: emptyDay(true), ter: emptyDay(true), qua: emptyDay(true),
    qui: emptyDay(true), sex: emptyDay(true), sab: emptyDay(false),
  };
}

function buildWeek(shifts: Shift[], days: DayKey[] = WEEKDAYS): WeekSchedule {
  const week = {} as WeekSchedule;
  DAYS.forEach(({ key }) => {
    week[key] = days.includes(key)
      ? { enabled: true, shifts: shifts.map(s => ({ ...s })) }
      : emptyDay(false);
  });
  return week;
}

// Conserta um horário possivelmente incompleto vindo do banco
function normalizeWeek(raw: any): WeekSchedule {
  const base = emptyWeek();
  if (!raw || typeof raw !== 'object') return base;
  DAYS.forEach(({ key }) => {
    const d = raw[key];
    if (d && typeof d === 'object') {
      const shifts = Array.isArray(d.shifts) && d.shifts.length
        ? d.shifts.map((s: any) => ({ start: s?.start || '', end: s?.end || '' })).slice(0, 2)
        : [emptyShift()];
      base[key] = { enabled: !!d.enabled, shifts };
    }
  });
  return base;
}

const INITIAL_PROFESSORS: { name: string; schedule: WeekSchedule }[] = [
  { name: 'ANDERSON GUIMARÃES DOS SANTOS', schedule: buildWeek([{ start: '13:00', end: '17:30' }]) },
  { name: 'ANDRÉ LUIZ PAIVA DA SILVA', schedule: buildWeek([{ start: '07:30', end: '14:15' }], ['sab']) },
  { name: 'CAIO CEZAR ANASTÁCIO DE AVILA', schedule: buildWeek([{ start: '07:45', end: '11:30' }, { start: '14:30', end: '18:15' }]) },
  { name: 'DOUGLAS GOMES DE ARAÚJO', schedule: buildWeek([{ start: '16:00', end: '22:00' }]) },
  { name: 'FLÁVIA REIS LIMA', schedule: buildWeek([{ start: '17:30', end: '21:15' }]) },
  { name: 'ISABELLA KATHELYN GONÇALVES ROCHA', schedule: buildWeek([{ start: '13:00', end: '18:15' }]) },
  { name: 'LETÍCIA TOLEDO DO ESPIRITO SANTOS', schedule: buildWeek([{ start: '07:00', end: '11:30' }]) },
  { name: 'LIVIA RODRIGUES SOUZA', schedule: buildWeek([{ start: '16:00', end: '20:30' }]) },
  { name: 'LUIZ GABRIEL RAMOS DOS SANTOS', schedule: buildWeek([{ start: '07:00', end: '12:15' }]) },
  { name: 'PAULA GABRIELLE GONÇALVES DA SILVA GAMA', schedule: buildWeek([{ start: '07:00', end: '12:15' }]) },
  { name: 'RENÊ GAMA TEIXEIRA', schedule: buildWeek([{ start: '16:45', end: '21:15' }]) },
  { name: 'EDUARDO DOS SANTOS DA SILVA', schedule: buildWeek([{ start: '17:30', end: '21:15' }]) },
];

function fmtShifts(day: DaySchedule): string {
  return day.shifts
    .filter(s => s.start && s.end)
    .map(s => `${s.start}–${s.end}`)
    .join('  •  ');
}

// Agrupa dias seguidos com o mesmo horário: "Seg a Sex  07:00–11:30"
function summarizeSchedule(raw: WeekSchedule | null): string[] {
  if (!raw) return [];
  const groups: { from: DayKey; to: DayKey; txt: string }[] = [];
  DAYS.forEach(({ key }, idx) => {
    const day = raw[key];
    if (!day?.enabled) return;
    const txt = fmtShifts(day);
    if (!txt) return;
    const last = groups[groups.length - 1];
    const prevIdx = last ? DAYS.findIndex(d => d.key === last.to) : -99;
    if (last && last.txt === txt && idx === prevIdx + 1) {
      last.to = key;
    } else {
      groups.push({ from: key, to: key, txt });
    }
  });
  const lbl = (k: DayKey) => DAYS.find(d => d.key === k)!.label;
  return groups.map(g => (g.from === g.to ? `${lbl(g.from)}  ${g.txt}` : `${lbl(g.from)} a ${lbl(g.to)}  ${g.txt}`));
}

const toMinutes = (t: string): number => {
  const [h, m] = (t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Carga horária semanal (soma dos turnos), em horas com 1 casa decimal
function weeklyLoadHours(raw: WeekSchedule | null): number {
  if (!raw) return 0;
  let mins = 0;
  DAYS.forEach(({ key }) => {
    const d = raw[key];
    if (!d?.enabled) return;
    (d.shifts || []).forEach(s => {
      if (s.start && s.end) mins += Math.max(0, toMinutes(s.end) - toMinutes(s.start));
    });
  });
  return Math.round((mins / 60) * 10) / 10;
}

export function ProfessorsModule() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [view, setView] = useState<'lista' | 'disponibilidade'>('lista');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ id: string | null; name: string; active: boolean; schedule: WeekSchedule }>({
    id: null, name: '', active: true, schedule: emptyWeek(),
  });

  // Sub-formulário de login
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessUser, setAccessUser] = useState('');
  const [accessPass, setAccessPass] = useState('');
  const [accessBusy, setAccessBusy] = useState(false);

  useEffect(() => { fetchProfessors(); }, []);

  const fetchProfessors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('role', 'teacher')
      .order('name', { ascending: true });
    if (data) setProfessors(data as Professor[]);
    setLoading(false);
  };

  const openNew = () => {
    setForm({ id: null, name: '', active: true, schedule: emptyWeek() });
    setShowAccessForm(false); setAccessUser(''); setAccessPass('');
    setModalOpen(true);
  };

  const openEdit = (p: Professor) => {
    setForm({ id: p.id, name: p.name || '', active: p.active ?? true, schedule: normalizeWeek(p.schedule) });
    setShowAccessForm(false); setAccessUser(''); setAccessPass('');
    setModalOpen(true);
  };

  const currentProfessor = form.id ? professors.find(p => p.id === form.id) || null : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Digite o nome do professor.');
    setSaving(true);
    const payload = { name: form.name.trim(), active: form.active, schedule: form.schedule };
    const { error } = form.id
      ? await supabase.from('app_users').update(payload).eq('id', form.id)
      : await supabase.from('app_users').insert([{ ...payload, role: 'teacher' }]);
    setSaving(false);
    if (error) return alert('Erro ao salvar: ' + error.message);
    setModalOpen(false);
    fetchProfessors();
  };

  const handleDelete = async (p: Professor) => {
    if (!confirm(`Excluir o professor ${p.name || p.username || ''}? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('app_users').delete().eq('id', p.id);
    if (error) return alert('Erro ao excluir: ' + error.message);
    setProfessors(professors.filter(x => x.id !== p.id));
  };

  const toggleActive = async (p: Professor) => {
    const next = !(p.active ?? true);
    setProfessors(professors.map(x => x.id === p.id ? { ...x, active: next } : x));
    const { error } = await supabase.from('app_users').update({ active: next }).eq('id', p.id);
    if (error) { alert('Erro ao atualizar status: ' + error.message); fetchProfessors(); }
  };

  const saveAccess = async () => {
    if (!form.id) return;
    const u = accessUser.toLowerCase().trim();
    if (!u || !accessPass.trim()) return alert('Preencha usuário e senha.');
    setAccessBusy(true);
    const { error } = await supabase.from('app_users')
      .update({ username: u, password: accessPass.trim() })
      .eq('id', form.id);
    setAccessBusy(false);
    if (error) {
      if (error.message.includes('duplicate')) return alert('Esse nome de usuário já está em uso por outra pessoa.');
      return alert('Erro ao salvar acesso: ' + error.message);
    }
    setShowAccessForm(false); setAccessUser(''); setAccessPass('');
    fetchProfessors();
  };

  const removeAccess = async () => {
    if (!form.id) return;
    if (!confirm('Remover o login deste professor? Ele não conseguirá mais entrar no sistema.')) return;
    const { error } = await supabase.from('app_users')
      .update({ username: null, password: null })
      .eq('id', form.id);
    if (error) return alert('Erro: ' + error.message);
    fetchProfessors();
  };

  const seedInitial = async () => {
    if (!confirm('Cadastrar os 12 professores da lista inicial com os horários?')) return;
    setSeeding(true);
    const rows = INITIAL_PROFESSORS.map(p => ({ name: p.name, role: 'teacher', active: true, schedule: p.schedule }));
    const { error } = await supabase.from('app_users').insert(rows);
    setSeeding(false);
    if (error) return alert('Erro ao importar: ' + error.message);
    fetchProfessors();
  };

  // --- Helpers do formulário de horário ---
  const setDay = (key: DayKey, patch: Partial<DaySchedule>) => {
    setForm(f => ({ ...f, schedule: { ...f.schedule, [key]: { ...f.schedule[key], ...patch } } }));
  };
  const setShift = (key: DayKey, idx: number, patch: Partial<Shift>) => {
    setForm(f => {
      const shifts = f.schedule[key].shifts.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      return { ...f, schedule: { ...f.schedule, [key]: { ...f.schedule[key], shifts } } };
    });
  };
  const addShift = (key: DayKey) => {
    setForm(f => {
      if (f.schedule[key].shifts.length >= 2) return f;
      return { ...f, schedule: { ...f.schedule, [key]: { ...f.schedule[key], shifts: [...f.schedule[key].shifts, emptyShift()] } } };
    });
  };
  const removeShift = (key: DayKey, idx: number) => {
    setForm(f => {
      const shifts = f.schedule[key].shifts.filter((_, i) => i !== idx);
      return { ...f, schedule: { ...f.schedule, [key]: { ...f.schedule[key], shifts: shifts.length ? shifts : [emptyShift()] } } };
    });
  };
  const replicateMonday = () => {
    setForm(f => {
      const src = f.schedule.seg;
      const schedule = { ...f.schedule };
      (['ter', 'qua', 'qui', 'sex'] as DayKey[]).forEach(k => {
        schedule[k] = { enabled: src.enabled, shifts: src.shifts.map(s => ({ ...s })) };
      });
      return { ...f, schedule };
    });
  };

  const activeCount = professors.filter(p => p.active ?? true).length;

  return (
    <PageShell width="focus">
        <PageHeader
          icon={GraduationCap}
          title="Professores"
          description="Cadastro da equipe, horário de trabalho e acesso ao sistema."
          action={
            <Button onClick={openNew}>
              <Plus className="w-4 h-4" /> Adicionar professor
            </Button>
          }
        />

        {!loading && professors.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex p-1 bg-slate-200 rounded-lg">
              <button onClick={() => setView('lista')} className={cn('px-4 py-1.5 text-sm font-bold rounded-md transition-all', view === 'lista' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}>Lista</button>
              <button onClick={() => setView('disponibilidade')} className={cn('px-4 py-1.5 text-sm font-bold rounded-md transition-all', view === 'disponibilidade' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}>Disponibilidade</button>
            </div>
            <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" /> {professors.length} no total
            </div>
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 shadow-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> {activeCount} ativos
            </div>
          </div>
        )}

        {loading ? (
          <Loading label="Carregando professores..." />
        ) : professors.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-14 h-14" />}
            title="Nenhum professor cadastrado"
            description="Adicione um por um, ou importe a lista inicial de uma vez."
            action={
              <Button variant="dark" size="lg" onClick={seedInitial} disabled={seeding}>
                <Copy className="w-5 h-5 text-brand" /> {seeding ? 'Importando...' : 'Importar lista inicial (12 professores)'}
              </Button>
            }
          />
        ) : view === 'disponibilidade' ? (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <ResponsiveTable
              table={            <DataTable minWidth={760}>
                    <THead>
                      <TH className="sticky left-0 bg-surface-sunken z-10">Professor</TH>
                      {DAYS.map(d => <TH key={d.key}>{d.full}</TH>)}
                      <TH align="right">Carga/sem</TH>
                    </THead>
                    <tbody>
                      {professors.map(p => {
                        const wk = normalizeWeek(p.schedule);
                        const isActive = p.active ?? true;
                        const load = weeklyLoadHours(wk);
                        return (
                          <TR key={p.id} muted={!isActive}>
                            <TD className="font-bold text-ink sticky left-0 bg-surface z-10 whitespace-nowrap">
                              {p.name || p.username || '—'}
                              {!isActive && <span className="ml-2 text-[9px] font-bold text-red-500 uppercase">inativo</span>}
                            </TD>
                            {DAYS.map(d => {
                              const day = wk[d.key];
                              const shifts = day?.enabled ? (day.shifts || []).filter(s => s.start && s.end) : [];
                              return (
                                <TD key={d.key} className={cn('align-top', shifts.length > 0 && 'bg-info-soft/60')}>
                                  {shifts.length ? (
                                    <div className="flex flex-col gap-1">
                                      {shifts.map((s, i) => (
                                        <span key={i} className="inline-block px-2 py-1 rounded-lg bg-white border border-indigo-100 text-[11px] font-bold text-indigo-700 whitespace-nowrap">
                                          {s.start}–{s.end}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-xs">·</span>
                                  )}
                                </TD>
                              );
                            })}
                            <TD align="right" className="font-black text-ink whitespace-nowrap">{load ? `${load}h` : '—'}</TD>
                          </TR>
                        );
                      })}
                    </tbody>
                </DataTable>}
              cards={professors.map(p => {
                const wk = normalizeWeek(p.schedule);
                const isActive = p.active ?? true;
                const load = weeklyLoadHours(wk);
                const diasComAula = DAYS.filter(d => {
                  const day = wk[d.key];
                  return day?.enabled && (day.shifts || []).some(sh => sh.start && sh.end);
                });
                return (
                  <RowCard
                    key={p.id}
                    muted={!isActive}
                    title={p.name || p.username || '—'}
                    subtitle={load ? `${load}h por semana` : 'sem horário definido'}
                    badges={!isActive ? <Badge tone="danger" uppercase>inativo</Badge> : undefined}
                  >
                    {diasComAula.length === 0 ? (
                      <p className="text-xs text-ink-subtle italic">Nenhum dia com horário cadastrado.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {diasComAula.map(d => (
                          <div key={d.key} className="flex items-start gap-2">
                            <span className="w-10 shrink-0 text-micro font-black text-ink-subtle uppercase tracking-wider pt-1">{d.label}</span>
                            <div className="flex flex-wrap gap-1">
                              {(wk[d.key].shifts || []).filter(sh => sh.start && sh.end).map((sh, i) => (
                                <span key={i} className="px-2 py-1 rounded-badge bg-info-soft border border-info/20 text-mini font-bold text-info-ink whitespace-nowrap">
                                  {sh.start}–{sh.end}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </RowCard>
                );
              })}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {professors.map(p => {
              const lines = summarizeSchedule(normalizeWeek(p.schedule));
              const isActive = p.active ?? true;
              return (
                <div key={p.id} className={cn(
                  "bg-white border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-sm transition-opacity",
                  isActive ? "border-slate-200" : "border-slate-200 opacity-60"
                )}>
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
                      isActive ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
                    )}>
                      {(p.name || p.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 leading-tight">{p.name || <span className="text-slate-400 italic">Sem nome</span>}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {p.username ? (
                          <Badge tone="success" uppercase>Login: {p.username}</Badge>
                        ) : (
                          <Badge uppercase>Sem login</Badge>
                        )}
                        {!isActive && <Badge tone="danger" uppercase>Inativo</Badge>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {lines.length > 0 ? lines.map(line => (
                          <span key={line} className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                            <Clock className="w-3 h-3 text-indigo-400 shrink-0" /> {line}
                          </span>
                        )) : (
                          <span className="text-xs text-slate-400 italic">Sem horário definido</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button onClick={() => toggleActive(p)} title={isActive ? 'Marcar como inativo' : 'Reativar'} className={cn(
                      "p-2 rounded-lg transition-colors",
                      isActive ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : "text-slate-400 bg-slate-100 hover:bg-slate-200"
                    )}>
                      {isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title={
          <h2 className="text-lg font-black text-ink flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-brand" /> {form.id ? 'Editar professor' : 'Novo professor'}
          </h2>
        }
        footer={
          <Button form="professorForm" type="submit" disabled={saving} block size="lg">
            <Save className="w-5 h-5" /> {saving ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Cadastrar professor'}
          </Button>
        }
      >
        <div className="space-y-6">
                <form id="professorForm" onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome completo *</label>
                      <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" placeholder="Ex: Ana Paula da Silva" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Situação</label>
                      <button type="button" onClick={() => setForm({ ...form, active: !form.active })} className={cn(
                        "w-full px-4 py-3 rounded-xl text-sm font-bold border flex items-center justify-center gap-2 transition-colors",
                        form.active ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-500"
                      )}>
                        {form.active ? <><UserCheck className="w-4 h-4" /> Ativo</> : <><UserX className="w-4 h-4" /> Inativo</>}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" /> Horário de trabalho
                      </label>
                      <button type="button" onClick={replicateMonday} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" /> Replicar Segunda p/ dias úteis
                      </button>
                    </div>

                    <div className="space-y-2">
                      {DAYS.map(({ key, full }) => {
                        const day = form.schedule[key];
                        return (
                          <div key={key} className={cn("rounded-2xl border p-3 transition-colors", day.enabled ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100")}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Toggle checked={day.enabled} onChange={(v) => setDay(key, { enabled: v })} />
                                <span className={cn("font-bold text-sm w-16", day.enabled ? "text-slate-700" : "text-slate-400")}>{full}</span>
                              </div>
                              {day.enabled ? (
                                day.shifts.length < 2 && (
                                  <button type="button" onClick={() => addShift(key)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> 2º turno
                                  </button>
                                )
                              ) : (
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Folga</span>
                              )}
                            </div>

                            {day.enabled && (
                              <div className="mt-3 space-y-2 pl-[52px]">
                                {day.shifts.map((s, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <input type="time" value={s.start} onChange={e => setShift(key, i, { start: e.target.value })} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                    <span className="text-slate-400 text-sm">às</span>
                                    <input type="time" value={s.end} onChange={e => setShift(key, i, { end: e.target.value })} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                    {day.shifts.length > 1 && (
                                      <button type="button" onClick={() => removeShift(key, i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </form>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                    <Key className="w-4 h-4 text-slate-400" /> Acesso ao sistema
                  </h3>

                  {!form.id ? (
                    <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      Salve o professor primeiro para poder criar um login de acesso.
                    </p>
                  ) : currentProfessor?.username && !showAccessForm ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Login ativo</p>
                        <p className="font-bold text-slate-800">{currentProfessor.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setShowAccessForm(true); setAccessUser(currentProfessor.username || ''); setAccessPass(currentProfessor.password || ''); }} className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Alterar</button>
                        <button type="button" onClick={removeAccess} className="px-3 py-2 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">Remover</button>
                      </div>
                    </div>
                  ) : showAccessForm ? (
                    <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" placeholder="Usuário (ex: anderson)" value={accessUser} onChange={e => setAccessUser(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        <input type="text" placeholder="Senha de acesso" value={accessPass} onChange={e => setAccessPass(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" disabled={accessBusy} onClick={saveAccess} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 active:scale-95 transition-transform">
                          {accessBusy ? 'Salvando...' : 'Salvar acesso'}
                        </button>
                        <button type="button" onClick={() => setShowAccessForm(false)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowAccessForm(true)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 flex items-center gap-2 transition-colors">
                      <Key className="w-4 h-4" /> Criar login de acesso
                    </button>
                  )}
                </div>
        </div>
      </Modal>
    </PageShell>
  );
}
