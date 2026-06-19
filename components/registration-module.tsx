'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Save, Lock, UploadCloud, FileSpreadsheet, Download, CheckCircle2, CalendarCheck, Search, Edit, Trash2, X, Users } from 'lucide-react';
import { CapLevel, levels } from '@/types';
import { supabase } from '@/lib/supabase';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

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
  const [file, setFile] = useState<File | null>(null);
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

  const getCapColorForLevel = (lvl: CapLevel) => {
    const map: any = {
      'yellow': 'Amarela', 'orange': 'Laranja', 'red': 'Vermelha', 'green': 'Verde',
      'lightBlue': 'Azul', 'darkBlue': 'Azul', 'black': 'Preta', 'silver': 'Prata'
    };
    return map[lvl] || 'Laranja';
  };

  const capColorNeeded = getCapColorForLevel(level);
  const emptySlotsForColor = availableSlots.filter(s => s.cap_color === capColorNeeded);
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

  const parseLevel = (ptLevel: string): CapLevel => {
    const map: any = {
      'amarela': 'yellow', 'laranja': 'orange', 'vermelha': 'red', 'verde': 'green',
      'azul claro': 'lightBlue', 'azul escuro': 'darkBlue', 'preta': 'black', 'prata': 'silver'
    };
    return map[ptLevel.toLowerCase().trim()] || 'orange'; 
  };

  const handleBulkUpload = async () => { /* ... */ };
  const downloadTemplate = () => { /* ... */ };

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

            <motion.div key="bulk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl mx-auto space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h2 className="font-bold text-amber-900 flex items-center gap-2 mb-2"><FileSpreadsheet className="w-5 h-5" /> Importação de Planilha Excel (CSV)</h2>
                <p className="text-sm text-amber-800 mb-4">Migrando de outro sistema? Suba a sua lista de alunos de uma vez só!</p>
              </div>
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:border-amber-500 hover:bg-amber-50/50 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <UploadCloud className="w-16 h-16 text-slate-300 group-hover:text-amber-500 transition-colors mb-4" />
                <p className="font-bold text-slate-800 text-lg mb-1">Clique para selecionar seu .CSV</p>
              </div>
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
