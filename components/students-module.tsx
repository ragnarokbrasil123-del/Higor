'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Search, Edit2, Trash2, X, Save, Plus, Clock, User, MapPin,
  Phone, Lock, MessageCircle, AlertTriangle, CalendarDays, StickyNote,
} from 'lucide-react';
import { CapLevel, levels, capLevelOrder } from '@/types';
import { supabase } from '@/lib/supabase';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

interface StudentRow {
  id: string;
  name: string;
  age: number | null;
  level: CapLevel;
  guardian_name: string | null;
  phone: string | null;
  password: string | null;
  modalidade: string | null;
  endereco: string | null;
  observacoes: string | null;
}
interface ClassRow {
  id: string;
  teacher_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}
interface SlotRow {
  id: string;
  class_id: string;
  cap_color: string;
  student_id: string | null;
}

const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MODALIDADES = ['fixo', 'wellhub', 'avulso'];
const hhmm = (t: string) => String(t || '').slice(0, 5);

export function StudentsModule() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [fTouca, setFTouca] = useState<string>('all');
  const [fModal, setFModal] = useState<string>('all');

  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [addDay, setAddDay] = useState<string>(DAYS[0]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const page = async (table: string, cols: string) => {
      const out: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from(table).select(cols).range(from, from + 999);
        if (!data?.length) break;
        out.push(...data);
        if (data.length < 1000) break;
      }
      return out;
    };
    const [st, cl, sl] = await Promise.all([
      page('students', '*'),
      page('classes', 'id, teacher_name, day_of_week, start_time, end_time'),
      page('class_slots', 'id, class_id, cap_color, student_id'),
    ]);
    setStudents((st as StudentRow[]).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    setClasses(cl as ClassRow[]);
    setSlots(sl as SlotRow[]);
    setLoading(false);
  };

  const classById = new Map(classes.map(c => [c.id, c]));

  const aulasDe = (studentId: string) =>
    slots
      .filter(s => s.student_id === studentId)
      .map(s => ({ slot: s, cls: classById.get(s.class_id) }))
      .filter(a => a.cls)
      .sort((a, b) => {
        const d = DAYS.indexOf(a.cls!.day_of_week) - DAYS.indexOf(b.cls!.day_of_week);
        return d !== 0 ? d : a.cls!.start_time.localeCompare(b.cls!.start_time);
      });

  // ------------------------------------------------ salvar dados
  const salvar = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return alert('O nome é obrigatório.');
    setSaving(true);
    const { error } = await supabase.from('students').update({
      name: editing.name.trim(),
      age: editing.age === null || String(editing.age) === '' ? null : Number(editing.age),
      level: editing.level,
      guardian_name: editing.guardian_name,
      phone: (editing.phone || '').replace(/\D/g, ''),
      password: editing.password,
      modalidade: editing.modalidade || 'fixo',
      endereco: editing.endereco,
      observacoes: editing.observacoes,
    }).eq('id', editing.id);
    setSaving(false);
    if (error) return alert('Erro ao salvar: ' + error.message);
    await fetchAll();
    setEditing(null);
  };

  const excluir = async (s: StudentRow) => {
    if (!confirm(`Excluir ${s.name}? As avaliações e as vagas dele serão liberadas.`)) return;
    await supabase.from('class_slots').update({ student_id: null }).eq('student_id', s.id);
    await supabase.from('evaluations').delete().eq('student_id', s.id);
    const { error } = await supabase.from('students').delete().eq('id', s.id);
    if (error) return alert('Erro ao excluir: ' + error.message);
    setEditing(null);
    fetchAll();
  };

  // ------------------------------------------------ turmas
  const sairDaTurma = async (slotId: string) => {
    const { error } = await supabase.from('class_slots').update({ student_id: null }).eq('id', slotId);
    if (error) return alert('Erro: ' + error.message);
    setSlots(prev => prev.map(s => (s.id === slotId ? { ...s, student_id: null } : s)));
  };

  const entrarNaTurma = async (slotId: string) => {
    if (!editing) return;
    const { error } = await supabase.from('class_slots').update({ student_id: editing.id }).eq('id', slotId);
    if (error) return alert('Erro: ' + error.message);
    setSlots(prev => prev.map(s => (s.id === slotId ? { ...s, student_id: editing.id } : s)));
    setShowAdd(false);
  };

  // vagas livres da touca do aluno, no dia escolhido
  const vagasLivres = editing
    ? slots
        .filter(s => !s.student_id && s.cap_color === editing.level)
        .map(s => ({ slot: s, cls: classById.get(s.class_id) }))
        .filter(a => a.cls && a.cls.day_of_week === addDay)
        .sort((a, b) => a.cls!.start_time.localeCompare(b.cls!.start_time))
    : [];
  // uma opção por turma (não repete a mesma turma várias vezes)
  const vagasPorTurma = Array.from(new Map(vagasLivres.map(v => [v.cls!.id, v])).values());

  // ------------------------------------------------ lista filtrada
  const busca = search.trim().toLowerCase();
  const lista = students.filter(s => {
    if (fTouca !== 'all' && s.level !== fTouca) return false;
    if (fModal !== 'all' && (s.modalidade || 'fixo') !== fModal) return false;
    if (busca) {
      const alvo = `${s.name} ${s.guardian_name || ''} ${s.phone || ''}`.toLowerCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });

  const semTurma = students.filter(s => !slots.some(x => x.student_id === s.id)).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8 w-full space-y-5">

        <header>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-amber-500" /> Alunos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ficha completa de cada aluno — dados, responsável, endereço e as turmas dele.
          </p>
        </header>

        {/* filtros */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por aluno, responsável ou telefone..."
                className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/20" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              )}
            </div>
            <select value={fTouca} onChange={e => setFTouca(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none">
              <option value="all">Todas as toucas</option>
              {capLevelOrder.map(k => <option key={k} value={k}>{levels[k].label}</option>)}
            </select>
            <select value={fModal} onChange={e => setFModal(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none">
              <option value="all">Todas as modalidades</option>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <p className="text-xs font-bold text-slate-500">
            {lista.length} de {students.length} aluno(s){semTurma > 0 && <span className="text-amber-600"> · {semTurma} sem turma</span>}
          </p>
        </div>

        {/* lista */}
        {loading ? (
          <p className="text-center text-slate-400 text-sm py-16 font-bold animate-pulse">Carregando alunos...</p>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-3">Aluno</th>
                    <th className="p-3">Touca</th>
                    <th className="p-3">Responsável</th>
                    <th className="p-3">WhatsApp</th>
                    <th className="p-3">Turmas</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.length === 0 ? (
                    <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-medium">Nenhum aluno encontrado.</td></tr>
                  ) : lista.map(s => {
                    const aulas = aulasDe(s.id);
                    const info = levels[s.level];
                    return (
                      <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-slate-800 leading-tight">{s.name}</p>
                          <p className="text-xs text-slate-500">
                            {s.age ? `${s.age} anos` : 'idade —'}
                            {s.modalidade && s.modalidade !== 'fixo' && (
                              <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase">{s.modalidade}</span>
                            )}
                          </p>
                        </td>
                        <td className="p-3">
                          <span className={cn('px-2 py-1 rounded text-[10px] font-bold uppercase text-white shadow-sm', info?.bgClass || 'bg-slate-400')}>
                            {info?.label || s.level}
                          </span>
                        </td>
                        <td className="p-3 text-sm font-medium text-slate-600">{s.guardian_name || '—'}</td>
                        <td className="p-3 text-sm font-medium text-slate-500">{s.phone || '—'}</td>
                        <td className="p-3">
                          {aulas.length === 0 ? (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">sem turma</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {aulas.map(a => (
                                <span key={a.slot.id} className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                                  {a.cls!.day_of_week.slice(0, 3)} {hhmm(a.cls!.start_time)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => { setEditing({ ...s }); setShowAdd(false); }} className="px-3 py-2 bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-2 text-xs font-bold">
                            <Edit2 className="w-3.5 h-3.5" /> Abrir ficha
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ===================== FICHA ===================== */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditing(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black shrink-0', levels[editing.level]?.bgClass || 'bg-slate-400')}>
                    {editing.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-slate-800 truncate">{editing.name}</h2>
                    <p className="text-xs font-bold text-slate-500">Ficha do aluno</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editing.phone && (
                    <a href={`https://wa.me/55${editing.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-2.5 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white rounded-xl transition-colors" title="WhatsApp">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => setEditing(null)} className="p-2.5 bg-white hover:bg-slate-200 rounded-xl transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">

                {/* dados do aluno */}
                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Dados do aluno</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-slate-500">Nome *</label>
                      <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500">Idade</label>
                      <input type="number" min={0} value={editing.age ?? ''} onChange={e => setEditing({ ...editing, age: e.target.value === '' ? null : Number(e.target.value) })} className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500">Modalidade</label>
                      <select value={editing.modalidade || 'fixo'} onChange={e => setEditing({ ...editing, modalidade: e.target.value })} className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                        {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <label className="text-[11px] font-bold text-slate-500">Touca</label>
                      <select value={editing.level} onChange={e => setEditing({ ...editing, level: e.target.value as CapLevel })} className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                        {capLevelOrder.map(k => <option key={k} value={k}>{levels[k].name}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                {/* turmas */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Turmas (dia e horário)</h3>
                    <button onClick={() => setShowAdd(v => !v)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Adicionar aula
                    </button>
                  </div>

                  <div className="space-y-2">
                    {aulasDe(editing.id).length === 0 && (
                      <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">Este aluno não está em nenhuma turma.</p>
                    )}
                    {aulasDe(editing.id).map(a => {
                      const divergente = a.slot.cap_color !== editing.level;
                      return (
                        <div key={a.slot.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <CalendarDays className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800">
                              {a.cls!.day_of_week} · {hhmm(a.cls!.start_time)} às {hhmm(a.cls!.end_time)}
                            </p>
                            <p className="text-xs font-medium text-slate-500 truncate">Prof. {a.cls!.teacher_name}</p>
                            {divergente && (
                              <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3 h-3" /> vaga de {levels[a.slot.cap_color as CapLevel]?.label || a.slot.cap_color} — touca do aluno mudou
                              </p>
                            )}
                          </div>
                          <button onClick={() => sairDaTurma(a.slot.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0" title="Tirar desta turma">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {showAdd && (
                    <div className="mt-3 border border-indigo-200 bg-indigo-50/40 rounded-2xl p-3 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS.map(d => (
                          <button key={d} onClick={() => setAddDay(d)} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border transition-all', addDay === d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200')}>
                            {d.split('-')[0]}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] font-bold text-slate-500">
                        Vagas livres de <b>{levels[editing.level]?.label}</b> em {addDay.split('-')[0]}:
                      </p>
                      {vagasPorTurma.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Nenhuma vaga livre dessa touca nesse dia.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar">
                          {vagasPorTurma.map(v => (
                            <button key={v.slot.id} onClick={() => entrarNaTurma(v.slot.id)} className="text-left bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-2.5 transition-colors">
                              <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-500" /> {hhmm(v.cls!.start_time)}
                              </p>
                              <p className="text-[11px] font-medium text-slate-500 truncate">Prof. {v.cls!.teacher_name}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* responsável */}
                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Responsável e acesso</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> Nome do responsável</label>
                      <input value={editing.guardian_name || ''} onChange={e => setEditing({ ...editing, guardian_name: e.target.value })} className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> WhatsApp (login do portal)</label>
                      <input value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Senha do portal</label>
                      <input value={editing.password || ''} onChange={e => setEditing({ ...editing, password: e.target.value })} className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Endereço</label>
                      <input value={editing.endereco || ''} onChange={e => setEditing({ ...editing, endereco: e.target.value })} placeholder="Rua, número, bairro..." className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><StickyNote className="w-3 h-3" /> Observações</label>
                      <textarea value={editing.observacoes || ''} onChange={e => setEditing({ ...editing, observacoes: e.target.value })} placeholder="Alergias, restrições, combinados com a família..." className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[80px] resize-y" />
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center gap-3">
                <button onClick={() => excluir(editing)} className="px-4 py-3 text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
                <button onClick={salvar} disabled={saving} className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
