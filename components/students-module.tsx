'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Search, Edit2, Trash2, X, Save, Plus, Clock, User, MapPin,
  Phone, Lock, MessageCircle, AlertTriangle, CalendarDays, StickyNote, ChevronRight,
} from 'lucide-react';
import { CapLevel, levels, capLevelOrder } from '@/types';
import { supabase } from '@/lib/supabase';
import { rotuloProfessor } from '@/lib/professor';
import { cn } from '@/lib/utils';
import { Badge, Button, DataTable, EmptyState, FilterBar, FilterFooter, Input, Loading, Modal, PageHeader, PageShell, ResponsiveTable, RowCard, Select, TD, TEmpty, TH, THead, TR } from '@/components/ui';

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
  /** Matrícula ativa. Quem cancela vira false e mantém ficha e histórico. */
  ativo: boolean | null;
  inativo_em: string | null;
  inativo_motivo: string | null;
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
  /** Por padrao a lista mostra so quem esta matriculado. */
  const [fSituacao, setFSituacao] = useState<'ativos' | 'inativos' | 'todos'>('ativos');

  const [editing, setEditing] = useState<StudentRow | null>(null);
  /**
   * Cópia de como a ficha estava ao abrir. Serve só para avisar quem
   * fecha sem salvar — já aconteceu de digitar a observação, não
   * alcançar o botão Salvar (o teclado do celular cobre) e perder tudo
   * sem nenhum aviso.
   */
  const [original, setOriginal] = useState<StudentRow | null>(null);
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

  /** Abre a ficha guardando o estado inicial, para saber o que mudou. */
  const abrirFicha = (s: StudentRow) => {
    setEditing({ ...s });
    setOriginal({ ...s });
    setShowAdd(false);
  };

  const CAMPOS: (keyof StudentRow)[] = [
    'name', 'age', 'level', 'guardian_name', 'phone', 'password', 'modalidade', 'endereco', 'observacoes',
  ];
  const temMudanca = () =>
    !!editing && !!original && CAMPOS.some(c => (editing[c] ?? '') !== (original[c] ?? ''));

  /** Fecha a ficha, mas não deixa perder texto digitado em silêncio. */
  const fecharFicha = () => {
    if (temMudanca() && !confirm('Você alterou a ficha e ainda não salvou. Fechar mesmo assim e perder as alterações?')) return;
    setEditing(null);
    setOriginal(null);
  };

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
    setOriginal(null);
  };

  /**
   * Cancelar matrícula — o caminho normal de quem sai.
   *
   * Libera a vaga na turma (senão o lugar fica bloqueado para quem quer
   * entrar) mas preserva ficha, avaliações e histórico de touca. Se a
   * pessoa voltar em seis meses, está tudo lá.
   */
  const cancelarMatricula = async (s: StudentRow) => {
    const motivo = prompt(
      `Cancelar a matrícula de ${s.name}?\n\n` +
      'A ficha, as avaliações e o histórico de touca são mantidos — só a vaga na turma é liberada.\n\n' +
      'Motivo (opcional):'
    );
    if (motivo === null) return; // clicou em cancelar no diálogo

    await supabase.from('class_slots').update({ student_id: null }).eq('student_id', s.id);
    const { error } = await supabase.from('students').update({
      ativo: false,
      inativo_em: new Date().toISOString(),
      inativo_motivo: motivo.trim() || null,
    }).eq('id', s.id);

    if (error) return alert('Erro ao cancelar: ' + error.message);
    setEditing(null);
    setOriginal(null);
    fetchAll();
  };

  /** Volta a matrícula. A turma precisa ser escolhida de novo. */
  const reativarMatricula = async (s: StudentRow) => {
    const { error } = await supabase.from('students').update({
      ativo: true,
      inativo_em: null,
      inativo_motivo: null,
    }).eq('id', s.id);
    if (error) return alert('Erro ao reativar: ' + error.message);
    setEditing(e => (e ? { ...e, ativo: true, inativo_em: null, inativo_motivo: null } : e));
    setOriginal(o => (o ? { ...o, ativo: true, inativo_em: null, inativo_motivo: null } : o));
    fetchAll();
    alert(`${s.name} voltou para a lista de ativos. Escolha a turma dele aqui na ficha.`);
  };

  /**
   * Apagar de verdade. Fica escondido atrás do cancelamento porque é
   * irreversível e leva as avaliações junto — serve para cadastro
   * duplicado ou digitado errado, não para aluno que saiu.
   */
  const excluir = async (s: StudentRow) => {
    if (!confirm(
      `APAGAR ${s.name} de vez?\n\n` +
      'As avaliações dele serão apagadas junto e não há como desfazer.\n\n' +
      'Se a pessoa apenas saiu da escola, use "Cancelar matrícula" — ela mantém o histórico.'
    )) return;
    await supabase.from('class_slots').update({ student_id: null }).eq('student_id', s.id);
    await supabase.from('evaluations').delete().eq('student_id', s.id);
    const { error } = await supabase.from('students').delete().eq('id', s.id);
    if (error) return alert('Erro ao excluir: ' + error.message);
    setEditing(null);
    setOriginal(null);
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
    const ativo = s.ativo !== false;
    if (fSituacao === 'ativos' && !ativo) return false;
    if (fSituacao === 'inativos' && ativo) return false;
    if (busca) {
      const alvo = `${s.name} ${s.guardian_name || ''} ${s.phone || ''}`.toLowerCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });

  const semTurma = students.filter(s => !slots.some(x => x.student_id === s.id)).length;

  return (
    <PageShell width="wide">

        <PageHeader
          icon={Users}
          title="Alunos"
          description="Ficha completa de cada aluno — dados, responsável, endereço e turmas."
        />

        {/* filtros */}
        <FilterBar>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por aluno, responsável ou telefone..." className="pl-9 pr-9 py-2.5" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted"><X className="w-4 h-4" /></button>
              )}
            </div>
            <Select value={fTouca} onChange={e => setFTouca(e.target.value)} className="w-full md:w-auto py-2.5">
              <option value="all">Todas as toucas</option>
              {capLevelOrder.map(k => <option key={k} value={k}>{levels[k].label}</option>)}
            </Select>
            <Select value={fModal} onChange={e => setFModal(e.target.value)} className="w-full md:w-auto py-2.5">
              <option value="all">Todas as modalidades</option>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Select value={fSituacao} onChange={e => setFSituacao(e.target.value as typeof fSituacao)} className="w-full md:w-auto py-2.5">
              <option value="ativos">Matriculados</option>
              <option value="inativos">Matrícula cancelada</option>
              <option value="todos">Todos</option>
            </Select>
          </div>
          <FilterFooter>
            <p className="text-xs font-bold text-ink-muted">
              {lista.length} de {students.length} aluno(s){semTurma > 0 && <span className="text-warning-ink"> · {semTurma} sem turma</span>}
            </p>
          </FilterFooter>
        </FilterBar>

        {/* lista */}
        {loading ? (
          <Loading label="Carregando alunos..." />
        ) : (
          <div className="bg-surface rounded-panel border border-line shadow-raised overflow-hidden">
            <ResponsiveTable
              table={
                <DataTable minWidth={860}>
                  <THead>
                    <TH>Aluno</TH>
                    <TH>Touca</TH>
                    <TH>Responsável</TH>
                    <TH>WhatsApp</TH>
                    <TH>Turmas</TH>
                    <TH align="right">Ações</TH>
                  </THead>
                  <tbody>
                    {lista.length === 0 ? (
                      <TEmpty colSpan={6}>Nenhum aluno encontrado.</TEmpty>
                    ) : lista.map(s => {
                      const aulas = aulasDe(s.id);
                      const info = levels[s.level];
                      return (
                        <TR key={s.id}>
                          <TD>
                            <p className="font-bold text-ink leading-tight">{s.name}</p>
                            <p className="text-xs text-ink-muted">
                              {s.age ? `${s.age} anos` : 'idade —'}
                              {s.modalidade && s.modalidade !== 'fixo' && (
                                <Badge tone="info" uppercase className="ml-2">{s.modalidade}</Badge>
                              )}
                            </p>
                          </TD>
                          <TD>
                            <Badge uppercase className={cn('text-white', info?.bgClass || 'bg-ink-subtle')}>
                              {info?.label || s.level}
                            </Badge>
                          </TD>
                          <TD className="text-sm font-medium text-ink-muted">{s.guardian_name || '—'}</TD>
                          <TD className="text-sm font-medium text-ink-subtle">{s.phone || '—'}</TD>
                          <TD>
                            {aulas.length === 0 ? (
                              <Badge tone="warning">sem turma</Badge>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {aulas.map(a => (
                                  <Badge key={a.slot.id}>{a.cls!.day_of_week.slice(0, 3)} {hhmm(a.cls!.start_time)}</Badge>
                                ))}
                              </div>
                            )}
                          </TD>
                          <TD align="right">
                            <Button size="sm" variant="secondary" onClick={() => abrirFicha(s)}>
                              <Edit2 className="w-3.5 h-3.5" /> Abrir ficha
                            </Button>
                          </TD>
                        </TR>
                      );
                    })}
                  </tbody>
                </DataTable>
              }
              cards={
                lista.length === 0 ? (
                  <p className="p-10 text-center text-ink-subtle font-medium text-sm">Nenhum aluno encontrado.</p>
                ) : lista.map(s => {
                  const aulas = aulasDe(s.id);
                  const info = levels[s.level];
                  return (
                    <RowCard
                      key={s.id}
                      onClick={() => abrirFicha(s)}
                      title={s.name}
                      subtitle={s.age ? `${s.age} anos` : undefined}
                      badges={
                        <>
                          <Badge uppercase className={cn('text-white', info?.bgClass || 'bg-ink-subtle')}>
                            {info?.label || s.level}
                          </Badge>
                          {s.modalidade && s.modalidade !== 'fixo' && <Badge tone="info" uppercase>{s.modalidade}</Badge>}
                          {aulas.length === 0
                            ? <Badge tone="warning">sem turma</Badge>
                            : aulas.map(a => <Badge key={a.slot.id}>{a.cls!.day_of_week.slice(0, 3)} {hhmm(a.cls!.start_time)}</Badge>)}
                        </>
                      }
                      fields={[
                        { label: 'Responsável', value: s.guardian_name || '—' },
                        { label: 'WhatsApp', value: s.phone || '—' },
                      ]}
                      action={<ChevronRight className="w-5 h-5 text-ink-subtle" />}
                    />
                  );
                })
              }
            />
          </div>
        )}

      {/* ===================== FICHA ===================== */}
      {editing && (
      <Modal
        open={!!editing}
        onClose={fecharFicha}
        size="xl"
        title={
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('w-11 h-11 rounded-card flex items-center justify-center text-white font-black shrink-0', levels[editing.level]?.bgClass || 'bg-ink-subtle')}>
              {editing.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-ink leading-tight break-words line-clamp-2">{editing.name}</h2>
              <p className="text-xs font-bold text-ink-muted">Ficha do aluno</p>
            </div>
          </div>
        }
        headerAction={editing.phone ? (
          <a href={`https://wa.me/55${editing.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-2.5 bg-success-soft text-success hover:bg-success hover:text-white rounded-control transition-colors" title="WhatsApp">
            <MessageCircle className="w-4 h-4" />
          </a>
        ) : undefined}
        footer={
          editing.ativo === false ? (
            <>
              <Button variant="secondary" size="lg" onClick={() => excluir(editing)} title="Apagar de vez, com as avaliações">
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button size="lg" className="flex-1" onClick={() => reativarMatricula(editing)}>
                <Save className="w-4 h-4" /> Reativar matrícula
              </Button>
            </>
          ) : (
            <>
              <Button variant="danger" size="lg" onClick={() => cancelarMatricula(editing)}>
                <X className="w-4 h-4" /> Cancelar matrícula
              </Button>
              <Button size="lg" className="flex-1" onClick={salvar} disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </>
          )
        }
      >
                {editing.ativo === false && (
                  <div className="mb-5 flex items-start gap-3 bg-warning-soft border border-warning/40 rounded-card p-4">
                    <AlertTriangle className="w-5 h-5 text-warning-ink shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-bold text-warning-ink text-sm">Matrícula cancelada</p>
                      <p className="text-xs text-warning-ink/80 mt-0.5 leading-relaxed">
                        {editing.inativo_em && <>Desde {new Date(editing.inativo_em).toLocaleDateString('pt-BR')}. </>}
                        {editing.inativo_motivo ? <>Motivo: <b>{editing.inativo_motivo}</b>. </> : null}
                        A ficha e as avaliações foram mantidas. Toque em <b>Reativar matrícula</b> para trazer de volta —
                        depois é só escolher a turma.
                      </p>
                    </div>
                  </div>
                )}

                {/* dados do aluno */}
                <section>
                  <h3 className="text-xs font-black text-ink-subtle uppercase tracking-wider mb-3">Dados do aluno</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-ink-muted">Nome *</label>
                      <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full mt-1 px-3 py-2.5 bg-surface-sunken border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-ink-muted">Idade</label>
                      <input type="number" min={0} value={editing.age ?? ''} onChange={e => setEditing({ ...editing, age: e.target.value === '' ? null : Number(e.target.value) })} className="w-full mt-1 px-3 py-2.5 bg-surface-sunken border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-ink-muted">Modalidade</label>
                      <Select value={editing.modalidade || 'fixo'} onChange={e => setEditing({ ...editing, modalidade: e.target.value })} className="mt-1 py-2.5">
                        {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                      </Select>
                    </div>
                    <div className="md:col-span-4">
                      <label className="text-[11px] font-bold text-ink-muted">Touca</label>
                      <Select value={editing.level} onChange={e => setEditing({ ...editing, level: e.target.value as CapLevel })} className="mt-1 py-2.5">
                        {capLevelOrder.map(k => <option key={k} value={k}>{levels[k].name}</option>)}
                      </Select>
                    </div>
                  </div>
                </section>

                {/* turmas */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-ink-subtle uppercase tracking-wider">Turmas (dia e horário)</h3>
                    <button onClick={() => setShowAdd(v => !v)} className="text-xs font-bold text-info hover:text-info-ink flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Adicionar aula
                    </button>
                  </div>

                  <div className="space-y-2">
                    {aulasDe(editing.id).length === 0 && (
                      <p className="text-xs font-bold text-warning-ink bg-warning-soft border border-amber-200 rounded-xl p-3">Este aluno não está em nenhuma turma.</p>
                    )}
                    {aulasDe(editing.id).map(a => {
                      const divergente = a.slot.cap_color !== editing.level;
                      return (
                        <div key={a.slot.id} className="flex items-center gap-3 bg-surface-sunken border border-line rounded-xl p-3">
                          <CalendarDays className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-ink">
                              {a.cls!.day_of_week} · {hhmm(a.cls!.start_time)} às {hhmm(a.cls!.end_time)}
                            </p>
                            <p className="text-xs font-medium text-ink-muted truncate">Prof. {rotuloProfessor(a.cls!.teacher_name)}</p>
                            {divergente && (
                              <p className="text-[11px] font-bold text-warning-ink flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3 h-3" /> vaga de {levels[a.slot.cap_color as CapLevel]?.label || a.slot.cap_color} — touca do aluno mudou
                              </p>
                            )}
                          </div>
                          <button onClick={() => sairDaTurma(a.slot.id)} className="p-2 text-ink-subtle hover:text-danger hover:bg-danger-soft rounded-lg transition-colors shrink-0" title="Tirar desta turma">
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
                          <button key={d} onClick={() => setAddDay(d)} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border transition-all', addDay === d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-surface text-ink-muted border-line')}>
                            {d.split('-')[0]}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] font-bold text-ink-muted">
                        Vagas livres de <b>{levels[editing.level]?.label}</b> em {addDay.split('-')[0]}:
                      </p>
                      {vagasPorTurma.length === 0 ? (
                        <p className="text-xs text-ink-muted italic">Nenhuma vaga livre dessa touca nesse dia.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar">
                          {vagasPorTurma.map(v => (
                            <button key={v.slot.id} onClick={() => entrarNaTurma(v.slot.id)} className="text-left bg-surface border border-line hover:border-indigo-400 rounded-xl p-2.5 transition-colors">
                              <p className="text-sm font-black text-ink flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-500" /> {hhmm(v.cls!.start_time)}
                              </p>
                              <p className="text-[11px] font-medium text-ink-muted truncate">Prof. {rotuloProfessor(v.cls!.teacher_name)}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* responsável */}
                <section>
                  <h3 className="text-xs font-black text-ink-subtle uppercase tracking-wider mb-3">Responsável e acesso</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-ink-muted flex items-center gap-1"><User className="w-3 h-3" /> Nome do responsável</label>
                      <input value={editing.guardian_name || ''} onChange={e => setEditing({ ...editing, guardian_name: e.target.value })} className="w-full mt-1 px-3 py-2.5 bg-surface-sunken border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-ink-muted flex items-center gap-1"><Phone className="w-3 h-3" /> WhatsApp (login do portal)</label>
                      <input value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} className="w-full mt-1 px-3 py-2.5 bg-surface-sunken border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-ink-muted flex items-center gap-1"><Lock className="w-3 h-3" /> Senha do portal</label>
                      <input value={editing.password || ''} onChange={e => setEditing({ ...editing, password: e.target.value })} className="w-full mt-1 px-3 py-2.5 bg-surface-sunken border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-ink-muted flex items-center gap-1"><MapPin className="w-3 h-3" /> Endereço</label>
                      <input value={editing.endereco || ''} onChange={e => setEditing({ ...editing, endereco: e.target.value })} placeholder="Rua, número, bairro..." className="w-full mt-1 px-3 py-2.5 bg-surface-sunken border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-ink-muted flex items-center gap-1"><StickyNote className="w-3 h-3" /> Observações</label>
                      <textarea value={editing.observacoes || ''} onChange={e => setEditing({ ...editing, observacoes: e.target.value })} placeholder="Alergias, restrições, combinados com a família..." className="w-full mt-1 px-3 py-2.5 bg-surface-sunken border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[80px] resize-y" />
                    </div>
                  </div>
                </section>
      </Modal>
      )}
    </PageShell>
  );
}
