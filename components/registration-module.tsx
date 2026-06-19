'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Save, Lock, UploadCloud, FileSpreadsheet, Download, CheckCircle2, CalendarCheck } from 'lucide-react';
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
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  // Variáveis do Cadastro em Lote
  const [file, setFile] = useState<File | null>(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Busca vagas livres na inicialização
  useEffect(() => {
    fetchScheduleData();
  }, []);

  const fetchScheduleData = async () => {
    // Agora puxamos tudo e filtramos internamente para evitar que o banco de dados esconda as vagas vazias!
    const { data: clsData } = await supabase.from('classes').select('*').order('start_time');
    const { data: slotData } = await supabase.from('class_slots').select('*');
    
    if (clsData && slotData) {
      setClasses(clsData);
      // Pega APENAS as vagas que não tem aluno preenchido
      setAvailableSlots(slotData.filter(s => !s.student_id || s.student_id === ''));
    }
  };

  // Conversão de Nível para Cor da Touca (para bater com a Grade)
  const getCapColorForLevel = (lvl: CapLevel) => {
    const map: any = {
      'yellow': 'Amarela',
      'orange': 'Laranja',
      'red': 'Vermelha',
      'green': 'Verde',
      'lightBlue': 'Azul',
      'darkBlue': 'Azul',
      'black': 'Preta',
      'silver': 'Prata'
    };
    return map[lvl] || 'Laranja';
  };

  const capColorNeeded = getCapColorForLevel(level);
  const emptySlotsForColor = availableSlots.filter(s => s.cap_color === capColorNeeded);
  
  const classesWithEmptySlots = classes.filter(c => 
    emptySlotsForColor.some(s => s.class_id === c.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !password) return;
    setLoading(true);

    // 1. Salva o Aluno no Banco
    const { data: newStudent, error } = await supabase.from('students').insert([
      { name, age: parseInt(age), level, guardian_name: guardianName, phone, password }
    ]).select().single();

    if (error) {
      setLoading(false);
      alert("Erro ao salvar no banco: " + error.message);
      return;
    }
    
    // 2. Se escolheu um horário, rouba a vaga na Grade!
    if (selectedSlotId && newStudent) {
      await supabase.from('class_slots')
        .update({ student_id: newStudent.id })
        .eq('id', selectedSlotId);
    }

    setLoading(false);
    setName(''); setAge(''); setLevel('orange'); setGuardianName(''); setPhone(''); setPassword(''); setSelectedSlotId('');
    fetchScheduleData(); // Atualiza vagas
    onSuccess();
  };

  const parseLevel = (ptLevel: string): CapLevel => {
    const map: any = {
      'amarela': 'yellow', 'laranja': 'orange', 'vermelha': 'red', 'verde': 'green',
      'azul claro': 'lightBlue', 'azul escuro': 'darkBlue', 'preta': 'black', 'prata': 'silver'
    };
    return map[ptLevel.toLowerCase().trim()] || 'orange'; 
  };

  const handleBulkUpload = async () => {
    if (!file) return;
    setLoading(true);
    setBulkStatus('Lendo arquivo...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
        
        const startIndex = rows[0].toLowerCase().includes('nome') ? 1 : 0;
        const studentsToInsert = [];
        
        for (let i = startIndex; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.trim());
          if (cols.length >= 6) {
            studentsToInsert.push({
              name: cols[0],
              age: parseInt(cols[1]) || 0,
              level: parseLevel(cols[2]),
              guardian_name: cols[3],
              phone: cols[4],
              password: cols[5]
            });
          }
        }

        if (studentsToInsert.length === 0) {
          setBulkStatus('Nenhum aluno válido encontrado. Verifique o formato CSV.');
          setLoading(false);
          return;
        }

        setBulkStatus(`Salvando ${studentsToInsert.length} alunos no banco de dados...`);
        
        const { error } = await supabase.from('students').insert(studentsToInsert);
        
        if (error) {
          setBulkStatus('Erro ao importar: ' + error.message);
        } else {
          setBulkStatus(`Sucesso! ${studentsToInsert.length} alunos importados.`);
          setTimeout(() => {
            setFile(null);
            setBulkStatus('');
            onSuccess();
          }, 3000);
        }
      } catch (err) {
        setBulkStatus('Erro ao ler a planilha. Salve como CSV separado por vírgulas.');
      }
      setLoading(false);
    };
    
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const header = "Nome do Aluno, Idade, Nivel, Nome do Responsavel, WhatsApp, Senha\n";
    const example = "Joao Silva, 7, Azul Claro, Maria Silva, 11999999999, joao123\n";
    const blob = new Blob([header + example], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_olimpo.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 md:bg-transparent">
      <header className="h-14 md:h-16 flex justify-between items-center px-4 md:px-8 bg-white/50 border-b border-slate-200 backdrop-blur-sm shrink-0">
        <h1 className="text-base md:text-xl font-extrabold text-slate-800 tracking-tight">Cadastro</h1>
        
        <div className="flex p-1 bg-slate-200 rounded-lg">
          <button onClick={() => setMode('single')} className={cn("px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-all", mode === 'single' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>Único</button>
          <button onClick={() => setMode('bulk')} className={cn("px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-all", mode === 'bulk' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>Em Lote</button>
        </div>
      </header>
      
      <div className="flex-1 p-3 md:p-8 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {mode === 'single' ? (
            
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
                    <select value={level} onChange={(e) => { setLevel(e.target.value as CapLevel); setSelectedSlotId(''); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm md:text-base text-slate-700 appearance-none focus:ring-2 focus:ring-amber-500/20 outline-none transition-all">
                      {Object.entries(levels).map(([key, value]) => (<option key={key} value={key}>Touca {value.name}</option>))}
                    </select>
                  </div>

                  {/* NOVO CAMPO INTELIGENTE - GRADE DE HORÁRIOS */}
                  <div className="space-y-1 md:space-y-2 md:col-span-2">
                    <label className="text-xs md:text-sm font-bold text-emerald-600 flex items-center gap-2 uppercase tracking-wider">
                      <CalendarCheck className="w-4 h-4" /> Escolha o Horário (Com base nas vagas disponíveis)
                    </label>
                    <select value={selectedSlotId} onChange={(e) => setSelectedSlotId(e.target.value)} className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-200 rounded-xl font-bold text-sm md:text-base text-emerald-900 appearance-none focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all">
                      <option value="">Deixar sem turma por enquanto (Lista de Espera)</option>
                      {classesWithEmptySlots.map(c => {
                        // Pega uma vaga vazia dessa turma específica
                        const slot = emptySlotsForColor.find(s => s.class_id === c.id);
                        return (
                          <option key={c.id} value={slot?.id}>
                            ✅ {c.day_of_week} • {c.start_time.slice(0,5)} às {c.end_time.slice(0,5)} (Prof: {c.teacher_name})
                          </option>
                        )
                      })}
                    </select>
                    {classesWithEmptySlots.length === 0 && (
                      <p className="text-xs font-bold text-amber-600 mt-1">⚠️ Crie mais turmas na "Grade de Horários", pois não há vagas sobrando para essa cor de touca.</p>
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
                <p className="text-sm text-amber-800 mb-4">Migrando de outro sistema? Suba a sua lista de alunos de uma vez só! Salve sua planilha no formato <strong>.CSV (Separado por vírgulas)</strong> seguindo exatamente a ordem das colunas do nosso modelo.</p>
                <button type="button" onClick={downloadTemplate} className="px-4 py-2 bg-amber-500 text-black text-sm font-bold rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-2 shadow-sm w-fit">
                  <Download className="w-4 h-4" /> Baixar Modelo Vazio
                </button>
              </div>

              <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:border-amber-500 hover:bg-amber-50/50 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                
                {file ? (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                    <p className="font-bold text-slate-800 text-lg mb-1">Arquivo Selecionado</p>
                    <p className="text-slate-500 text-sm mb-6">{file.name}</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleBulkUpload(); }} disabled={loading} className="px-8 py-3 bg-black text-white font-bold rounded-xl w-full max-w-xs shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                      <UploadCloud className="w-5 h-5" /> {loading ? "Processando..." : "Importar Todos os Alunos"}
                    </button>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-16 h-16 text-slate-300 group-hover:text-amber-500 transition-colors mb-4" />
                    <p className="font-bold text-slate-800 text-lg mb-1">Clique para selecionar seu .CSV</p>
                    <p className="text-slate-400 text-sm">Ou toque aqui no celular</p>
                  </>
                )}
              </div>

              {bulkStatus && (
                <div className="p-4 bg-slate-800 text-white font-medium text-sm rounded-xl text-center shadow-lg border border-slate-700 animate-pulse">
                  {bulkStatus}
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
