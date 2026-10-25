'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Plus, Trash2, Edit2, X, Save, Key, Clock, UserCheck, UserX, Copy, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  apagarConta, atualizarAtivo, definirLogin, lerEquipe,
  removerLogin, salvarProfessor, semearProfessores,
} from '@/lib/equipe';
import {
  Badge, Button, DataTable, EmptyState, EsqueletoLista, Input, Modal, PageHeader, PageShell,
  ResponsiveTable, RowCard, TD, TH, THead, TR, Toggle,
  avisar, avisarErro, confirmar,
} from '@/components/ui';

// Tipos, constantes e funções de horário vivem em
// components/professores/horario.ts — são puras e não dependem de tela.
import {
  DAYS, INITIAL_PROFESSORS,
  emptyDay, emptyShift, emptyWeek, fmtShifts, normalizeWeek,
  summarizeSchedule, weeklyLoadHours,
  type DayKey, type DaySchedule, type Professor, type Shift, type WeekSchedule,
} from './professores/horario';

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
    try {
      setProfessors(await lerEquipe('teacher') as Professor[]);
    } catch (e: any) {
      avisar(e?.message || 'Não consegui carregar os professores.');
    }
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
    if (!form.name.trim()) return avisar('Digite o nome do professor.');
    setSaving(true);
    try {
      await salvarProfessor({
        id: form.id ?? undefined,
        name: form.name.trim(),
        active: form.active,
        schedule: form.schedule,
      });
    } catch (e: any) {
      setSaving(false);
      return avisarErro('Erro ao salvar: ' + (e?.message || ''));
    }
    setSaving(false);
    setModalOpen(false);
    fetchProfessors();
  };

  const handleDelete = async (p: Professor) => {
    if (!await confirmar(`${p.name || p.username || 'Este professor'} sai do cadastro. Não há como desfazer.`, {
      titulo: 'Excluir professor?', acao: 'Excluir', perigo: true,
    })) return;
    try {
      await apagarConta(p.id);
    } catch (e: any) {
      return avisarErro('Erro ao excluir: ' + (e?.message || ''));
    }
    setProfessors(professors.filter(x => x.id !== p.id));
  };

  const toggleActive = async (p: Professor) => {
    const next = !(p.active ?? true);
    setProfessors(professors.map(x => x.id === p.id ? { ...x, active: next } : x));
    try {
      await atualizarAtivo(p.id, next);
    } catch (e: any) {
      avisarErro('Erro ao atualizar status: ' + (e?.message || ''));
      fetchProfessors();
    }
  };

  const saveAccess = async () => {
    if (!form.id) return;
    const u = accessUser.toLowerCase().trim();
    if (!u || !accessPass.trim()) return avisar('Preencha usuário e senha.');
    setAccessBusy(true);
    try {
      await definirLogin(form.id, u, accessPass.trim());
    } catch (e: any) {
      setAccessBusy(false);
      return avisarErro('Erro ao salvar acesso: ' + (e?.message || ''));
    }
    setAccessBusy(false);
    setShowAccessForm(false); setAccessUser(''); setAccessPass('');
    fetchProfessors();
  };

  const removeAccess = async () => {
    if (!form.id) return;
    if (!await confirmar('Ele não conseguirá mais entrar no sistema.', { titulo: 'Remover o login?', acao: 'Remover login', perigo: true })) return;
    try {
      await removerLogin(form.id);
    } catch (e: any) {
      return avisarErro('Erro: ' + (e?.message || ''));
    }
    fetchProfessors();
  };

  const seedInitial = async () => {
    if (!await confirmar(`Serão criados ${INITIAL_PROFESSORS.length} professores com os horários da lista.`, {
      titulo: 'Importar lista inicial?', acao: 'Importar',
    })) return;
    setSeeding(true);
    try {
      await semearProfessores(INITIAL_PROFESSORS.map(p => ({ name: p.name, schedule: p.schedule })));
    } catch (e: any) {
      setSeeding(false);
      return avisarErro('Erro ao importar: ' + (e?.message || ''));
    }
    setSeeding(false);
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
            <div className="flex p-1 bg-line rounded-lg">
              <button onClick={() => setView('lista')} className={cn('px-4 py-1.5 text-sm font-bold rounded-md transition-all', view === 'lista' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted')}>Lista</button>
              <button onClick={() => setView('disponibilidade')} className={cn('px-4 py-1.5 text-sm font-bold rounded-md transition-all', view === 'disponibilidade' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted')}>Disponibilidade</button>
            </div>
            <div className="px-4 py-2 bg-surface border border-line rounded-xl text-sm font-bold text-ink shadow-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-ink-subtle" /> {professors.length} no total
            </div>
            <div className="px-4 py-2 bg-success-soft border border-success-soft rounded-xl text-sm font-bold text-success-ink shadow-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> {activeCount} ativos
            </div>
          </div>
        )}

        {loading ? (
          <EsqueletoLista linhas={6} />
        ) : professors.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-14 h-14" />}
            title="Nenhum professor cadastrado"
            description="Adicione um por um, ou importe a lista inicial de uma vez."
            action={
              <Button variant="dark" size="lg" onClick={seedInitial} disabled={seeding}>
                <Copy className="w-5 h-5 text-brand" /> {seeding ? 'Importando...' : `Importar lista inicial (${INITIAL_PROFESSORS.length} professores)`}
              </Button>
            }
          />
        ) : view === 'disponibilidade' ? (
          <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-sm">
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
                              {!isActive && <span className="ml-2 text-micro font-bold text-danger uppercase">inativo</span>}
                            </TD>
                            {DAYS.map(d => {
                              // sábado é escala alternada para todos — não há horário a mostrar
                              if (d.key === 'sab') {
                                return (
                                  <TD key={d.key} className="align-top">
                                    <span className="text-micro font-bold text-ink-subtle uppercase tracking-wider">escala</span>
                                  </TD>
                                );
                              }
                              const day = wk[d.key];
                              const shifts = day?.enabled ? (day.shifts || []).filter(s => s.start && s.end) : [];
                              return (
                                <TD key={d.key} className={cn('align-top', shifts.length > 0 && 'bg-info-soft/60')}>
                                  {shifts.length ? (
                                    <div className="flex flex-col gap-1">
                                      {shifts.map((s, i) => (
                                        <span key={i} className="inline-block px-2 py-1 rounded-lg bg-surface border border-indigo-100 text-mini font-bold text-info-ink whitespace-nowrap">
                                          {s.start}–{s.end}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-ink-subtle text-xs">·</span>
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
                  "bg-surface border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-sm transition-opacity",
                  isActive ? "border-line" : "border-line opacity-60"
                )}>
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
                      isActive ? "bg-brand-wash text-warning-ink" : "bg-surface-sunken text-ink-subtle"
                    )}>
                      {(p.name || p.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink leading-tight">{p.name || <span className="text-ink-subtle italic">Sem nome</span>}</p>
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
                          <span key={line} className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted bg-surface-sunken border border-line rounded-lg px-2 py-1">
                            <Clock className="w-3 h-3 text-indigo-400 shrink-0" /> {line}
                          </span>
                        )) : (
                          <span className="text-xs text-ink-subtle italic">Sem horário definido</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button onClick={() => toggleActive(p)} title={isActive ? 'Marcar como inativo' : 'Reativar'} className={cn(
                      "p-2 rounded-lg transition-colors",
                      isActive ? "text-success bg-success-soft hover:bg-success-soft" : "text-ink-subtle bg-surface-sunken hover:bg-line"
                    )}>
                      {isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(p)} className="p-2 text-ink-subtle hover:text-info hover:bg-info-soft rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p)} className="p-2 text-ink-subtle hover:text-danger-ink hover:bg-danger-soft rounded-lg transition-colors">
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
          <>
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button form="professorForm" type="submit" disabled={saving} size="lg" className="flex-1">
              <Save className="w-5 h-5" /> {saving ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Cadastrar professor'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
                <form id="professorForm" onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">Nome completo *</label>
                      <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 bg-surface-sunken border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20" placeholder="Ex: Ana Paula da Silva" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">Situação</label>
                      <button type="button" onClick={() => setForm({ ...form, active: !form.active })} className={cn(
                        "w-full px-4 py-3 rounded-xl text-sm font-bold border flex items-center justify-center gap-2 transition-colors",
                        form.active ? "bg-success-soft border-success-soft text-success-ink" : "bg-surface-sunken border-line text-ink-muted"
                      )}>
                        {form.active ? <><UserCheck className="w-4 h-4" /> Ativo</> : <><UserX className="w-4 h-4" /> Inativo</>}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-black text-ink flex items-center gap-2">
                        <Clock className="w-4 h-4 text-info" /> Horário de trabalho
                      </label>
                      <button type="button" onClick={replicateMonday} className="text-xs font-bold text-info hover:text-info-ink flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" /> Replicar Segunda p/ dias úteis
                      </button>
                    </div>

                    <div className="space-y-2">
                      {DAYS.map(({ key, full }) => {
                        const day = form.schedule[key];

                        // Sábado não é cadastrado: todo funcionário faz escala
                        // um sábado sim, outro não. Um horário fixo aqui mentiria.
                        if (key === 'sab') {
                          return (
                            <div key={key} className="rounded-2xl border border-dashed border-line-strong bg-surface-sunken p-3 flex items-center justify-between gap-3">
                              <span className="font-bold text-sm text-ink-subtle w-16">{full}</span>
                              <span className="text-xs font-medium text-ink-muted text-right">
                                Escala alternada — um sábado sim, outro não. Vale para toda a equipe e não é definido aqui.
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div key={key} className={cn("rounded-2xl border p-3 transition-colors", day.enabled ? "bg-surface border-line" : "bg-surface-sunken border-line")}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Toggle checked={day.enabled} onChange={(v) => setDay(key, { enabled: v })} />
                                <span className={cn("font-bold text-sm w-16", day.enabled ? "text-ink" : "text-ink-subtle")}>{full}</span>
                              </div>
                              {day.enabled ? (
                                day.shifts.length < 2 && (
                                  <button type="button" onClick={() => addShift(key)} className="text-xs font-bold text-info hover:text-info-ink flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> 2º turno
                                  </button>
                                )
                              ) : (
                                <span className="text-xs font-bold text-ink-subtle uppercase tracking-wider">Folga</span>
                              )}
                            </div>

                            {day.enabled && (
                              <div className="mt-3 space-y-2 pl-[52px]">
                                {day.shifts.map((s, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <input type="time" value={s.start} onChange={e => setShift(key, i, { start: e.target.value })} className="px-3 py-2 bg-surface-sunken border border-line rounded-lg text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-info/20" />
                                    <span className="text-ink-subtle text-sm">às</span>
                                    <input type="time" value={s.end} onChange={e => setShift(key, i, { end: e.target.value })} className="px-3 py-2 bg-surface-sunken border border-line rounded-lg text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-info/20" />
                                    {day.shifts.length > 1 && (
                                      <button type="button" onClick={() => removeShift(key, i)} className="p-1.5 text-ink-subtle hover:text-danger hover:bg-danger-soft rounded-lg transition-colors">
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

                <div className="pt-6 border-t border-line">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2 mb-3">
                    <Key className="w-4 h-4 text-ink-subtle" /> Acesso ao sistema
                  </h3>

                  {!form.id ? (
                    <p className="text-xs text-ink-muted bg-surface-sunken border border-line rounded-xl p-3">
                      Salve o professor primeiro para poder criar um login de acesso.
                    </p>
                  ) : currentProfessor?.username && !showAccessForm ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-success-soft border border-success-soft rounded-xl p-3">
                      <div>
                        <p className="text-micro font-bold text-success-ink uppercase tracking-wider">Login ativo</p>
                        <p className="font-bold text-ink">{currentProfessor.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => { setShowAccessForm(true); setAccessUser(currentProfessor.username || ''); setAccessPass(currentProfessor.password || ''); }}>Alterar</Button>
                        <Button type="button" variant="danger" size="sm" onClick={removeAccess}>Remover</Button>
                      </div>
                    </div>
                  ) : showAccessForm ? (
                    <div className="space-y-3 bg-surface-sunken border border-line rounded-xl p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" placeholder="Usuário (ex: anderson)" value={accessUser} onChange={e => setAccessUser(e.target.value)} className="w-full px-3 py-2.5 bg-surface border border-line rounded-lg text-sm outline-none focus:ring-2 focus:ring-info/20" />
                        <input type="text" placeholder="Senha de acesso" value={accessPass} onChange={e => setAccessPass(e.target.value)} className="w-full px-3 py-2.5 bg-surface border border-line rounded-lg text-sm outline-none focus:ring-2 focus:ring-info/20" />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" disabled={accessBusy} onClick={saveAccess}>
                          {accessBusy ? 'Salvando...' : 'Salvar acesso'}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAccessForm(false)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <Button type="button" variant="secondary" onClick={() => setShowAccessForm(true)}>
                      <Key className="w-4 h-4" /> Criar login de acesso
                    </Button>
                  )}
                </div>
        </div>
      </Modal>
    </PageShell>
  );
}
