'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Save, Lock, UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CapLevel, levels } from '@/types';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { DataTable, PageHeader, PageShell, ResponsiveTable, RowCard, Select, TD, TH, THead, TR } from '@/components/ui';

// ===================== Helpers de importação em massa =====================
const stripAccents = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');

function parseLevelSmart(raw: string): { level: CapLevel; guessed: boolean } {
  const k = stripAccents((raw || '').toLowerCase().trim());
  const exact: Record<string, CapLevel> = {
    amarela: 'yellow', laranja: 'orange', vermelha: 'red', verde: 'green',
    'azul claro': 'lightBlue', 'azul escuro': 'darkBlue', preta: 'black',
    yellow: 'yellow', orange: 'orange', red: 'red', green: 'green',
    lightblue: 'lightBlue', darkblue: 'darkBlue', black: 'black',
  };
  if (exact[k]) return { level: exact[k], guessed: false };
  if (k.includes('amarel') || k.includes('bebe')) return { level: 'yellow', guessed: false };
  if (k.includes('laranj')) return { level: 'orange', guessed: false };
  if (k.includes('vermelh')) return { level: 'red', guessed: false };
  if (k.includes('verde')) return { level: 'green', guessed: false };
  if (k.includes('azul') && k.includes('escur')) return { level: 'darkBlue', guessed: false };
  if (k.includes('azul')) return { level: 'lightBlue', guessed: true };
  if (k.includes('pret')) return { level: 'black', guessed: false };
  return { level: 'orange', guessed: true };
}

const DAY_CANON: Record<string, string> = {
  'segunda-feira': 'Segunda-feira', segunda: 'Segunda-feira', seg: 'Segunda-feira', '2': 'Segunda-feira', '2a': 'Segunda-feira',
  'terca-feira': 'Terça-feira', terca: 'Terça-feira', ter: 'Terça-feira', '3': 'Terça-feira', '3a': 'Terça-feira',
  'quarta-feira': 'Quarta-feira', quarta: 'Quarta-feira', qua: 'Quarta-feira', '4': 'Quarta-feira', '4a': 'Quarta-feira',
  'quinta-feira': 'Quinta-feira', quinta: 'Quinta-feira', qui: 'Quinta-feira', '5': 'Quinta-feira', '5a': 'Quinta-feira',
  'sexta-feira': 'Sexta-feira', sexta: 'Sexta-feira', sex: 'Sexta-feira', '6': 'Sexta-feira', '6a': 'Sexta-feira',
  sabado: 'Sábado', sab: 'Sábado', '7': 'Sábado',
};
function parseDays(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[/,;&]| e /i)
    .map(p => DAY_CANON[stripAccents(p.toLowerCase().trim())])
    .filter(Boolean) as string[];
}
function parseTime(raw: string): string {
  if (!raw) return '';
  const m = stripAccents(raw.toLowerCase()).match(/(\d{1,2})[:h.]?(\d{2})?/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${(m[2] || '00').padStart(2, '0')}`;
}
function splitDelimited(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const first = lines[0];
  const delim = first.includes('\t') ? '\t' : first.split(';').length > first.split(',').length ? ';' : ',';
  return lines.map(l => l.split(delim).map(c => c.trim().replace(/^"|"$/g, '')));
}
const HEADER_MAP: Record<string, string> = {
  nome: 'name', aluno: 'name', 'nome do aluno': 'name', crianca: 'name',
  idade: 'age', anos: 'age',
  touca: 'level', nivel: 'level', cor: 'level', categoria: 'level',
  dia: 'day', dias: 'day', 'dia da semana': 'day',
  horario: 'time', hora: 'time', 'horario da aula': 'time',
  responsavel: 'guardian', 'nome do responsavel': 'guardian', mae: 'guardian', pai: 'guardian',
  telefone: 'phone', whatsapp: 'phone', celular: 'phone', fone: 'phone', contato: 'phone',
  senha: 'password', password: 'password',
};

interface BulkRow {
  name: string;
  age: number;
  level: CapLevel;
  guardian: string;
  phone: string;
  password: string;
  days: string[];
  time: string;
  issues: string[];
  skip: boolean;
}
// ========================================================================

interface RegistrationModuleProps {
  onSuccess: () => void;
}

export function RegistrationModule({ onSuccess }: RegistrationModuleProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  // Variáveis do Cadastro Único
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [level, setLevel] = useState<CapLevel>('orange');
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Variáveis de Conexão com a Grade
  const [classes, setClasses] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  

  // Variáveis do Cadastro em Lote
  const [bulkText, setBulkText] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; allocated: number; failed: number } | null>(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Usado só para detectar duplicatas na importação em lote
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchScheduleData();
    fetchAllStudents();
  }, []);

  const fetchScheduleData = async () => {
    const { data: clsData } = await supabase.from('classes').select('*').order('start_time');
    const { data: slotData } = await supabase.from('class_slots').select('*');
    if (clsData && slotData) {
      setClasses(clsData);
      setAvailableSlots(slotData.filter(s => !s.student_id || s.student_id === ''));
    }
  };

  const fetchAllStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('name');
    if (data) setAllStudents(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) return;
    setLoading(true);

    const { error } = await supabase.from('students').insert([
      { name, age: age === '' ? null : parseInt(age), level, guardian_name: guardianName, phone: phone.replace(/\D/g, ''), password }
    ]);

    setLoading(false);
    if (error) return alert('Erro ao salvar no banco: ' + error.message);

    setName(''); setAge(''); setLevel('orange'); setGuardianName(''); setPhone(''); setPassword('');
    fetchAllStudents();
    alert('Aluno matriculado com sucesso!\n\nPara definir o dia e o horário dele, abra a aba "Alunos" e clique em "Abrir ficha".');
  };

  // ---- Importação em massa ----
  const downloadTemplate = () => {
    const csv =
      'nome;idade;touca;dia;horario;responsavel;telefone;senha\n' +
      'Ana Clara Souza;7;Laranja;Segunda-feira/Quarta-feira;08:00;Marcia Souza;11999998888;1234\n' +
      'Pedro Henrique Lima;9;Verde;Terça-feira;15:30;Joao Lima;11988887777;\n';
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_alunos_olimpo.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const readFileToText = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setBulkText(String(reader.result || ''));
    reader.readAsText(f, 'utf-8');
  };

  const analyzeBulk = () => {
    setBulkResult(null);
    const grid = splitDelimited(bulkText);
    if (grid.length < 2) {
      setBulkRows([]);
      setBulkStatus('Cole pelo menos o cabeçalho + 1 linha de aluno.');
      return;
    }

    const header = grid[0].map(h => HEADER_MAP[stripAccents(h.toLowerCase().trim())] || '');
    if (!header.includes('name')) {
      setBulkRows([]);
      setBulkStatus('Não achei a coluna "nome" no cabeçalho. Baixe o modelo.');
      return;
    }
    const col = (row: string[], key: string) => {
      const i = header.indexOf(key);
      return i >= 0 ? (row[i] || '').trim() : '';
    };

    const existingNames = new Set(allStudents.map(s => (s.name || '').toLowerCase().trim()));
    const rows: BulkRow[] = [];

    for (let r = 1; r < grid.length; r++) {
      const raw = grid[r];
      const nm = col(raw, 'name');
      if (!nm) continue;

      const issues: string[] = [];
      let skip = false;

      if (existingNames.has(nm.toLowerCase().trim())) {
        issues.push('já cadastrado — será ignorado');
        skip = true;
      }

      const { level, guessed } = parseLevelSmart(col(raw, 'level'));
      if (guessed) issues.push(`touca incerta → assumido "${levels[level].label}"`);

      const days = parseDays(col(raw, 'day'));
      const time = parseTime(col(raw, 'time'));
      const rawDay = col(raw, 'day');
      if (rawDay && days.length === 0) issues.push('dia não reconhecido');

      const phone = col(raw, 'phone').replace(/\D/g, '');
      let password = col(raw, 'password').trim();
      if (!password) {
        password = phone.slice(-4) || '1234';
        issues.push(`sem senha → gerada "${password}"`);
      }

      if (days.length && time) {
        const hasSlot = days.some(day => {
          const cls = classes.find(c => c.day_of_week === day && String(c.start_time).slice(0, 5) === time);
          return cls && availableSlots.some(s => s.class_id === cls.id && s.cap_color === level);
        });
        if (!hasSlot) issues.push('sem vaga livre na grade p/ esse dia/horário/touca');
      } else if (!skip) {
        issues.push('sem turma — entra só no cadastro');
      }

      const ageNum = parseInt(col(raw, 'age'), 10);
      rows.push({
        name: nm,
        age: Number.isFinite(ageNum) ? ageNum : 0,
        level,
        guardian: col(raw, 'guardian'),
        phone,
        password,
        days,
        time,
        issues,
        skip,
      });
    }

    setBulkRows(rows);
    setBulkStatus(`${rows.filter(r => !r.skip).length} aluno(s) prontos, ${rows.filter(r => r.skip).length} ignorado(s).`);
  };

  const runBulkImport = async () => {
    const toCreate = bulkRows.filter(r => !r.skip);
    if (toCreate.length === 0) return;
    setBulkImporting(true);

    let created = 0, allocated = 0, failed = 0;
    const usedSlots = new Set<string>();

    for (const r of toCreate) {
      const { data: student, error } = await supabase
        .from('students')
        .insert([{ name: r.name, age: r.age, level: r.level, guardian_name: r.guardian, phone: r.phone, password: r.password }])
        .select()
        .single();

      if (error || !student) { failed++; continue; }
      created++;

      for (const day of r.days) {
        if (!r.time) continue;
        const cls = classes.find(c => c.day_of_week === day && String(c.start_time).slice(0, 5) === r.time);
        if (!cls) continue;
        const slot = availableSlots.find(s => s.class_id === cls.id && s.cap_color === r.level && !s.student_id && !usedSlots.has(s.id));
        if (slot) {
          await supabase.from('class_slots').update({ student_id: student.id }).eq('id', slot.id);
          usedSlots.add(slot.id);
          allocated++;
        }
      }
    }

    setBulkImporting(false);
    setBulkRows([]);
    setBulkText('');
    setBulkStatus('');
    setBulkResult({ created, allocated, failed });
    await fetchScheduleData();
    fetchAllStudents();
    onSuccess();
  };

  return (
    <PageShell width="focus">
        <PageHeader
          icon={UserPlus}
          title="Cadastro de alunos"
          description="Matricule um aluno por vez ou importe uma planilha inteira."
          action={
            <div className="flex p-1 bg-surface-sunken border border-line rounded-control">
              <button onClick={() => setMode('single')} className={cn('px-4 py-2 text-sm font-bold rounded-badge transition-all whitespace-nowrap', mode === 'single' ? 'bg-surface text-ink shadow-raised' : 'text-ink-muted')}>Matricular</button>
              <button onClick={() => setMode('bulk')} className={cn('px-4 py-2 text-sm font-bold rounded-badge transition-all whitespace-nowrap', mode === 'bulk' ? 'bg-surface text-ink shadow-raised' : 'text-ink-muted')}>Em lote</button>
            </div>
          }
        />

        <AnimatePresence mode="wait">
          
          {mode === 'single' ? (
            
            <motion.div key="single" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-3xl mx-auto bg-surface md:rounded-panel shadow-raised border border-line overflow-hidden rounded-2xl">
              <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  
                  <div className="space-y-1 md:space-y-2 md:col-span-2">
                    <label className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Nome do Aluno *</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                  </div>
                  
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Idade</label>
                    <input type="number" min="1" value={age} onChange={(e) => setAge(e.target.value)} placeholder="opcional" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                  </div>
                  
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Nível Inicial (Touca) *</label>
                    <Select value={level} onChange={(e) => setLevel(e.target.value as CapLevel)}>
                      {Object.entries(levels).map(([key, value]) => (<option key={key} value={key}>Touca {value.name}</option>))}
                    </Select>
                  </div>

                  <div className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-xs font-medium text-slate-500">
                      O dia e o horário da aula são definidos depois, na aba <b className="text-slate-700">Alunos</b> → <b className="text-slate-700">Abrir ficha</b>.
                    </p>
                  </div>

                  <div className="md:col-span-2 mt-4 p-4 md:p-6 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-4 md:space-y-6">
                    <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2"><UserPlus className="w-4 h-4 text-amber-500" /> Dados do Responsável (Acesso ao Portal)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-1 md:space-y-2">
                        <label className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Nome do Responsável</label>
                        <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm md:text-base focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1 md:space-y-2">
                        <label className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">WhatsApp (Login)</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(DDD) 99999-9999" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm md:text-base focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1 md:space-y-2 md:col-span-2">
                        <label className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Senha de Acesso do Pai *</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Defina a senha que o pai usará no app" className="w-full pl-10 pr-4 py-3 bg-white border border-amber-200 rounded-xl text-sm md:text-base focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-medium text-amber-900" />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
                
                <div className="pt-4 md:pt-6 border-t border-slate-100 flex justify-end">
                  <button type="submit" disabled={loading} className="w-full md:w-auto px-8 py-4 md:py-3 bg-black text-white md:bg-amber-500 md:text-black rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-md">
                    <Save className="w-4 h-4" /> {loading ? "Salvando..." : "Matricular Aluno"}
                  </button>
                </div>
              </form>
            </motion.div>

          ) : (

            <motion.div key="bulk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-3xl mx-auto space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6">
                <h2 className="font-bold text-amber-900 flex items-center gap-2 mb-2"><FileSpreadsheet className="w-5 h-5" /> Importar lista de alunos</h2>
                <p className="text-sm text-amber-800">
                  Cole a planilha (do Excel / Google Sheets) ou selecione um arquivo CSV. Colunas aceitas:
                  <b> nome, idade, touca, dia, horario, responsavel, telefone, senha</b>. Só <b>nome</b> é obrigatório.
                  Vários dias na mesma célula: separe por <code className="bg-white/60 px-1 rounded">/</code>.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={downloadTemplate} className="px-4 py-2 bg-white border border-amber-300 text-amber-800 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-100 transition-colors">
                    <Download className="w-4 h-4" /> Baixar modelo CSV
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-amber-300 text-amber-800 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-100 transition-colors">
                    <UploadCloud className="w-4 h-4" /> Selecionar arquivo
                  </button>
                  <input type="file" accept=".csv,.tsv,.txt" className="hidden" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) readFileToText(f); e.target.value = ''; }} />
                </div>
              </div>

              {bulkResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-black text-emerald-800">Importação concluída!</p>
                    <p className="text-emerald-700 font-medium mt-1">
                      {bulkResult.created} aluno(s) cadastrado(s) · {bulkResult.allocated} alocado(s) em vagas da grade
                      {bulkResult.failed > 0 && <span className="text-red-600"> · {bulkResult.failed} falha(s)</span>}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-3xl p-4 md:p-6 space-y-4">
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  spellCheck={false}
                  placeholder={'nome;idade;touca;dia;horario;responsavel;telefone;senha\nAna Clara Souza;7;Laranja;Segunda-feira/Quarta-feira;08:00;Marcia Souza;11999998888;1234'}
                  className="w-full h-44 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm font-mono text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 resize-y"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-500">{bulkStatus}</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setBulkText(''); setBulkRows([]); setBulkStatus(''); setBulkResult(null); }} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700">Limpar</button>
                    <button onClick={analyzeBulk} disabled={!bulkText.trim()} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform">Analisar</button>
                  </div>
                </div>
              </div>

              {bulkRows.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                    <h3 className="font-black text-slate-800 text-sm">Prévia ({bulkRows.length} linha{bulkRows.length > 1 ? 's' : ''})</h3>
                    <button onClick={runBulkImport} disabled={bulkImporting || bulkRows.filter(r => !r.skip).length === 0} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black disabled:opacity-40 active:scale-95 transition-transform flex items-center gap-2">
                      <Save className="w-4 h-4" /> {bulkImporting ? 'Importando...' : `Importar ${bulkRows.filter(r => !r.skip).length} aluno(s)`}
                    </button>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                    <ResponsiveTable
                      table={                    <DataTable minWidth={560}>
                          <THead>
                            <TH>Aluno</TH>
                            <TH>Touca</TH>
                            <TH>Dia / Hora</TH>
                            <TH>Observações</TH>
                          </THead>
                          <tbody>
                            {bulkRows.map((r, i) => (
                              <TR key={i} muted={r.skip}>
                                <TD>
                                  <p className="font-bold text-slate-800">{r.name}</p>
                                  <p className="text-xs text-slate-500">{r.age || '?'} anos{r.guardian ? ` · ${r.guardian}` : ''}</p>
                                </TD>
                                <TD>
                                  <span className={cn('px-2 py-1 rounded text-[10px] font-bold uppercase text-white shadow-sm', levels[r.level].bgClass)}>{levels[r.level].label}</span>
                                </TD>
                                <TD className="text-xs font-medium text-ink-muted">
                                  {r.days.length ? r.days.map(d => d.split('-')[0]).join(' / ') : '—'}
                                  {r.time ? ` · ${r.time}` : ''}
                                </TD>
                                <TD>
                                  {r.issues.length === 0 ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> ok</span>
                                  ) : (
                                    <ul className="space-y-0.5">
                                      {r.issues.map((iss, k) => (
                                        <li key={k} className={cn('inline-flex items-center gap-1 text-[11px] font-medium', r.skip ? 'text-red-500' : 'text-amber-600')}>
                                          <AlertTriangle className="w-3 h-3 shrink-0" /> {iss}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </TD>
                              </TR>
                            ))}
                          </tbody>
                        </DataTable>}
                      cards={bulkRows.map((r, i) => (
                        <RowCard
                          key={i}
                          muted={r.skip}
                          title={r.name}
                          subtitle={`${r.age || '?'} anos${r.guardian ? ' · ' + r.guardian : ''}`}
                          badges={
                            <span className={cn('px-2 py-1 rounded-badge text-micro font-bold uppercase text-white', levels[r.level].bgClass)}>
                              {levels[r.level].label}
                            </span>
                          }
                          fields={[
                            { label: 'Dia / Hora', value: `${r.days.length ? r.days.map(d => d.split('-')[0]).join(' / ') : '—'}${r.time ? ' · ' + r.time : ''}` },
                          ]}
                        >
                          {r.issues.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                              <CheckCircle2 className="w-3.5 h-3.5" /> pronto para importar
                            </span>
                          ) : (
                            <ul className="space-y-1">
                              {r.issues.map((iss, k) => (
                                <li key={k} className={cn('flex items-start gap-1.5 text-mini font-medium', r.skip ? 'text-danger' : 'text-warning-ink')}>
                                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {iss}
                                </li>
                              ))}
                            </ul>
                          )}
                        </RowCard>
                      ))}
                    />
                  </div>
                </div>
              )}
            </motion.div>

          )}
        </AnimatePresence>
    </PageShell>
  );
}
