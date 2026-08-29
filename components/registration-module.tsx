'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Save, Lock, UploadCloud, FileSpreadsheet, Download, CheckCircle2, CalendarCheck, Search, Edit, Trash2, X, Users, AlertTriangle } from 'lucide-react';
import { CapLevel, levels } from '@/types';
import { supabase } from '@/lib/supabase';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

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
  const [mode, setMode] = useState<'single' | 'bulk' | 'list'>('single');
  
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
  
  // AGORA É UM ARRAY (Para permitir selecionar Segunda e Quarta, por exemplo)
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);

  // Variáveis do Cadastro em Lote
  const [bulkText, setBulkText] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; allocated: number; failed: number } | null>(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Variáveis da Lista Geral
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudent, setEditingStudent] = useState<any>(null);

  useEffect(() => {
    fetchScheduleData();
  }, []);

  useEffect(() => {
    if (mode === 'list') {
      fetchAllStudents();
    }
  }, [mode]);

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

  // As vagas (class_slots.cap_color) guardam a CHAVE do nível ('orange', 'green', ...)
  const emptySlotsForColor = availableSlots.filter(s => s.cap_color === level);
  const classesWithEmptySlots = classes.filter(c => emptySlotsForColor.some(s => s.class_id === c.id));

  const toggleSlotSelection = (slotId: string) => {
    if (selectedSlotIds.includes(slotId)) {
      setSelectedSlotIds(selectedSlotIds.filter(id => id !== slotId));
    } else {
      setSelectedSlotIds([...selectedSlotIds, slotId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !password) return;
    setLoading(true);

    const { data: newStudent, error } = await supabase.from('students').insert([
      { name, age: parseInt(age), level, guardian_name: guardianName, phone, password }
    ]).select().single();

    if (error) {
      setLoading(false);
      return alert("Erro ao salvar no banco: " + error.message);
    }
    
    // Aloca em TODOS os dias que foram marcados
    if (selectedSlotIds.length > 0 && newStudent) {
      for (const slotId of selectedSlotIds) {
        await supabase.from('class_slots').update({ student_id: newStudent.id }).eq('id', slotId);
      }
    }

    setLoading(false);
    setName(''); setAge(''); setLevel('orange'); setGuardianName(''); setPhone(''); setPassword(''); setSelectedSlotIds([]);
    fetchScheduleData(); 
    onSuccess();
    alert("Aluno matriculado com sucesso!");
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setLoading(true);
    
    const { error } = await supabase.from('students').update({
      name: editingStudent.name,
      age: editingStudent.age,
      level: editingStudent.level,
      guardian_name: editingStudent.guardian_name,
      phone: editingStudent.phone,
      password: editingStudent.password,
    }).eq('id', editingStudent.id);
    
    setLoading(false);
    if (error) {
      alert("Erro ao atualizar: " + error.message);
    } else {
      alert("Cadastro atualizado com sucesso!");
      setEditingStudent(null);
      fetchAllStudents();
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esse aluno? Todo o histórico de notas e avaliações dele também serão apagados!")) return;
    
    await supabase.from('evaluations').delete().eq('student_id', id);
    await supabase.from('students').delete().eq('id', id);
    
    fetchAllStudents();
    alert("Aluno removido do sistema!");
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
    if (mode === 'list') fetchAllStudents();
    onSuccess();
  };

  const filteredList = allStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 md:bg-transparent">
      
      <header className="h-14 md:h-16 flex justify-between items-center px-4 md:px-8 bg-white/50 border-b border-slate-200 backdrop-blur-sm shrink-0">
        <h1 className="text-base md:text-xl font-extrabold text-slate-800 tracking-tight">Gestão de Alunos</h1>
        
        <div className="flex p-1 bg-slate-200 rounded-lg overflow-x-auto custom-scrollbar">
          <button onClick={() => setMode('single')} className={cn("px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-all whitespace-nowrap", mode === 'single' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>Matricular Novo</button>
          <button onClick={() => setMode('bulk')} className={cn("px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-all whitespace-nowrap", mode === 'bulk' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>Em Lote</button>
          <button onClick={() => setMode('list')} className={cn("px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-all whitespace-nowrap flex items-center gap-2", mode === 'list' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500")}>
            <Users className="w-4 h-4" /> Gerenciar Alunos
          </button>
        </div>
      </header>
      
      <div className="flex-1 p-3 md:p-8 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          
          {mode === 'list' ? (
            <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto bg-white md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
              <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 shrink-0">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" placeholder="Buscar aluno por nome..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-black shadow-inner whitespace-nowrap text-sm">
                  {filteredList.length} Alunos Cadastrados
                </div>
              </div>

              <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-white sticky top-0 z-10 shadow-sm">
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4 border-b border-slate-100">Nome do Aluno</th>
                      <th className="p-4 border-b border-slate-100">Nível / Categoria</th>
                      <th className="p-4 border-b border-slate-100">Responsável</th>
                      <th className="p-4 border-b border-slate-100">WhatsApp</th>
                      <th className="p-4 border-b border-slate-100 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Nenhum aluno encontrado.</td></tr>
                    ) : (
                      filteredList.map(student => (
                        <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-slate-800">{student.name}</p>
                            <p className="text-xs font-medium text-slate-500">{student.age} anos</p>
                          </td>
                          <td className="p-4">
                            <span className={cn("px-2.5 py-1 rounded text-xs font-bold uppercase shadow-sm", levels[student.level as CapLevel]?.bgClass || 'bg-slate-500 text-white')}>
                              {levels[student.level as CapLevel]?.name || 'Outro'}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-600">{student.guardian_name || '-'}</td>
                          <td className="p-4 font-medium text-slate-500">{student.phone || '-'}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setEditingStudent(student)} className="p-2 bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteStudent(student.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors" title="Excluir">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

          ) : mode === 'single' ? (
            
            <motion.div key="single" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-3xl mx-auto bg-white md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden rounded-2xl">
              <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  
                  <div className="space-y-1 md:space-y-2 md:col-span-2">
                    <label className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Nome do Aluno *</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                  </div>
                  
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Idade *</label>
                    <input type="number" required min="1" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                  </div>
                  
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">Nível Inicial (Touca) *</label>
                    <select value={level} onChange={(e) => { setLevel(e.target.value as CapLevel); setSelectedSlotIds([]); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm md:text-base text-slate-700 appearance-none focus:ring-2 focus:ring-amber-500/20 outline-none transition-all">
                      {Object.entries(levels).map(([key, value]) => (<option key={key} value={key}>Touca {value.name}</option>))}
                    </select>
                  </div>

                  {/* NOVO CAMPO INTELIGENTE - MÚLTIPLA ESCOLHA DE HORÁRIOS */}
                  <div className="space-y-2 md:space-y-3 md:col-span-2 mt-2">
                    <label className="text-xs md:text-sm font-bold text-emerald-600 flex items-center gap-2 uppercase tracking-wider">
                      <CalendarCheck className="w-4 h-4" /> Marque os Dias da Semana (Vagas Livres)
                    </label>
                    
                    {classesWithEmptySlots.length === 0 ? (
                      <div className="p-4 border border-dashed border-amber-300 bg-amber-50 rounded-xl">
                        <p className="text-sm font-bold text-amber-800">⚠️ Nenhuma vaga livre encontrada na grade para esta cor.</p>
                        <p className="text-xs font-medium text-amber-700 mt-1">Crie turmas na "Grade de Horários", ou deixe o aluno apenas na Lista de Espera por enquanto.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {classesWithEmptySlots.map(c => {
                          const slot = emptySlotsForColor.find(s => s.class_id === c.id);
                          const isSelected = slot ? selectedSlotIds.includes(slot.id) : false;
                          
                          return (
                            <label key={c.id} className={cn("flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all shadow-sm hover:-translate-y-0.5", isSelected ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "border-slate-200 bg-white hover:bg-slate-50")}>
                              <div className={cn("w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0", isSelected ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300")}>
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <div className="flex flex-col">
                                <span className={cn("font-bold text-sm", isSelected ? "text-emerald-900" : "text-slate-800")}>
                                  {c.day_of_week} • {c.start_time.slice(0,5)}
                                </span>
                                <span className={cn("text-xs font-medium", isSelected ? "text-emerald-700" : "text-slate-500")}>
                                  Prof: {c.teacher_name}
                                </span>
                              </div>
                              <input 
                                type="checkbox" 
                                className="hidden"
                                checked={isSelected}
                                onChange={() => slot && toggleSlotSelection(slot.id)}
                              />
                            </label>
                          )
                        })}
                      </div>
                    )}
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
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-white sticky top-0 shadow-sm">
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-3">Aluno</th>
                          <th className="p-3">Touca</th>
                          <th className="p-3">Dia / Hora</th>
                          <th className="p-3">Observações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((r, i) => (
                          <tr key={i} className={cn('border-b border-slate-50', r.skip && 'opacity-40')}>
                            <td className="p-3">
                              <p className="font-bold text-slate-800">{r.name}</p>
                              <p className="text-xs text-slate-500">{r.age || '?'} anos{r.guardian ? ` · ${r.guardian}` : ''}</p>
                            </td>
                            <td className="p-3">
                              <span className={cn('px-2 py-1 rounded text-[10px] font-bold uppercase text-white shadow-sm', levels[r.level].bgClass)}>{levels[r.level].label}</span>
                            </td>
                            <td className="p-3 text-xs font-medium text-slate-600">
                              {r.days.length ? r.days.map(d => d.split('-')[0]).join(' / ') : '—'}
                              {r.time ? ` · ${r.time}` : ''}
                            </td>
                            <td className="p-3">
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>

          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingStudent(null)} />
            <motion.div initial={{scale:0.95, opacity: 0}} animate={{scale:1, opacity: 1}} exit={{scale:0.95, opacity: 0}} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Edit className="w-5 h-5 text-indigo-500" /> Editar Cadastro</h2>
                <button onClick={() => setEditingStudent(null)} className="p-2 bg-white hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500"/></button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="editForm" onSubmit={handleUpdateStudent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Aluno</label>
                      <input type="text" required value={editingStudent.name} onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Idade</label>
                      <input type="number" required value={editingStudent.age} onChange={(e) => setEditingStudent({...editingStudent, age: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nível / Categoria</label>
                      <select value={editingStudent.level} onChange={(e) => setEditingStudent({...editingStudent, level: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none">
                        {Object.entries(levels).map(([key, value]) => (<option key={key} value={key}>{value.name}</option>))}
                      </select>
                    </div>
                    
                    <div className="col-span-2 my-2"><hr className="border-slate-100"/></div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Responsável</label>
                      <input type="text" value={editingStudent.guardian_name || ''} onChange={(e) => setEditingStudent({...editingStudent, guardian_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp (Login)</label>
                      <input type="text" value={editingStudent.phone || ''} onChange={(e) => setEditingStudent({...editingStudent, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senha de Acesso</label>
                      <input type="text" required value={editingStudent.password || ''} onChange={(e) => setEditingStudent({...editingStudent, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                <button form="editForm" type="submit" disabled={loading} className="w-full px-8 py-4 bg-indigo-600 text-white rounded-xl font-black active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-md hover:bg-indigo-700">
                  <Save className="w-5 h-5" /> {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
