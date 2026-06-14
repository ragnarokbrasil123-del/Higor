'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Search, Check, Award, ChevronRight, Filter } from 'lucide-react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { jsPDF } from 'jspdf';
import { Student, CapLevel, EvaluationStatus, Evaluation, levels } from '@/types';
import { supabase } from '@/lib/supabase';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

export function SwimmingModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<CapLevel | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*, evaluations(*)');
    if (data) setStudents(data);
    setLoading(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || s.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const selectedStudentRaw = students.find(s => s.id === selectedId) || null;
  const latestEval = selectedStudentRaw?.evaluations?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  
  const selectedStudent = selectedStudentRaw ? {
    ...selectedStudentRaw,
    evalDetails: latestEval || ({ 
      breathing: 'untested', 
      floating: 'untested', 
      technique: 'untested', 
      speed: 'untested',
      date: new Date().toISOString()
    } as Evaluation)
  } : null;

  const handleUpdateEvaluation = async (criterion: keyof Evaluation, status: EvaluationStatus) => {
    if (!selectedStudentRaw || !selectedStudent) return;
    
    const updatedEval = {
      ...selectedStudent.evalDetails,
      [criterion]: status
    };

    setStudents(prev => prev.map(s => {
      if (s.id === selectedStudentRaw.id) {
         return { ...s, evaluations: [{ ...updatedEval, date: new Date().toISOString() }, ...(s.evaluations || [])] };
      }
      return s;
    }));

    await supabase.from('evaluations').insert([{
      student_id: selectedStudentRaw.id,
      breathing: updatedEval.breathing,
      floating: updatedEval.floating,
      technique: updatedEval.technique,
      speed: updatedEval.speed,
    }]);
  };

  const handleDownloadReport = () => {
    if (!selectedStudent) return;
    
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Relatório de Avaliação Trimestral', 20, 20);
    doc.setFontSize(14);
    doc.text(`Aluno: ${selectedStudent.name}`, 20, 40);
    doc.text(`Idade: ${selectedStudent.age} anos`, 20, 50);
    doc.text(`Nível (Touca): ${levels[selectedStudent.level].name}`, 20, 60);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 70);
    doc.setFontSize(16);
    doc.text('Critérios Técnicos:', 20, 90);
    doc.setFontSize(12);
    
    const statusMap = { achieved: 'Atingido', developing: 'Em Desenvolvimento', untested: 'Não Testado' };
    let yPos = 100;
    
    const criteria = [
      { key: 'breathing', label: 'Respiração e Controle' },
      { key: 'floating', label: 'Flutuação e Sustentação' },
      { key: 'technique', label: 'Técnica de Nado' },
      { key: 'speed', label: 'Velocidade e Resistência' },
    ] as const;
    
    criteria.forEach(c => {
      const status = selectedStudent.evalDetails[c.key as keyof Evaluation];
      doc.text(`${c.label}: ${statusMap[status as EvaluationStatus]}`, 25, yPos);
      yPos += 10;
    });
    
    doc.save(`avaliacao_${selectedStudent.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const EvaluationButton = ({ 
    status, 
    value, 
    label, 
    onClick, 
    colorClass 
  }: { 
    status: EvaluationStatus, 
    value: EvaluationStatus, 
    label: string, 
    onClick: () => void,
    colorClass: string
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border",
        status === value 
          ? cn("border-transparent shadow-sm text-white", colorClass)
          : "border-slate-200 text-slate-500 hover:bg-slate-50 bg-white"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      
      <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white/50 border-b border-slate-200 backdrop-blur-sm shrink-0">
        <h1 className="text-xl font-bold text-slate-800">Módulo de Avaliação Trimestral</h1>
        <div className="hidden sm:flex items-center gap-4">
          <span className="text-sm text-slate-500 font-medium tracking-wide">Avaliações Trimestrais</span>
          <button 
            onClick={handleDownloadReport}
            disabled={!selectedStudent}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              selectedStudent 
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            Exportar PDF
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
        
        <div className="md:col-span-5 flex flex-col h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
          
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-700">Lista de Alunos</h2>
            <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">{filteredStudents.length} Ativos</span>
          </div>

          <div className="px-4 pt-4 shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar aluno..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-slate-700"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as CapLevel | 'all')}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm appearance-none text-slate-700"
              >
                <option value="all">Todos os Níveis</option>
                {Object.entries(levels).map(([key, value]) => (
                  <option key={key} value={key}>Touca {value.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {loading ? <p className="text-center text-sm text-slate-400 py-4">Carregando alunos do banco...</p> : filteredStudents.map(student => (
              <motion.button
                key={student.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedId(student.id)}
                className={cn(
                  "w-full text-left p-3 flex items-center gap-4 transition-colors group rounded-2xl",
                  selectedStudent?.id === student.id 
                    ? "bg-amber-50 border border-amber-100 ring-2 ring-amber-500/20 shadow-sm"
                    : "border border-transparent hover:bg-slate-50 cursor-pointer"
                )}
              >
                <div className={cn("w-10 h-10 rounded-full flex-shrink-0 shadow-inner border-2 border-white flex items-center justify-center", levels[student.level].bgClass)}>
                  <Award className="w-5 h-5 text-white opacity-80" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", selectedStudent?.id === student.id ? "font-bold text-slate-800" : "text-slate-800 group-hover:text-amber-600")}>
                    {student.name}
                  </p>
                  <p className={cn("text-[11px] uppercase truncate", selectedStudent?.id === student.id ? "text-slate-500 font-medium" : "text-slate-400")}>
                    Touca {levels[student.level].name} • {student.age} anos
                  </p>
                </div>
                {selectedStudent?.id === student.id && (
                  <Check className="w-5 h-5 text-amber-500 shrink-0" />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="md:col-span-7 flex flex-col h-full bg-white/80 glass rounded-3xl shadow-xl border border-white overflow-hidden relative">
          <AnimatePresence mode="wait">
            {selectedStudent ? (
              <motion.div
                key={selectedStudent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transform: 'scale(0.95)' }}
                className="flex flex-col h-full w-full absolute inset-0"
              >
                <div className="p-6 sm:p-8 pb-4 flex items-center gap-4 sm:gap-6 border-b border-slate-100/50 shrink-0">
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0", levels[selectedStudent.level].bgClass)}>
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">{selectedStudent.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={cn("px-2 py-0.5 text-white text-[10px] font-bold rounded uppercase tracking-wider", levels[selectedStudent.level].bgClass)}>
                        Touca {levels[selectedStudent.level].name}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">
                        {selectedStudent.age} Anos
                      </span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block shrink-0">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Data Atualização</p>
                    <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1 h-3 bg-amber-500 rounded-full"></span> Critérios Técnicos
                    </h3>
                    
                    <div className="grid gap-3">
                      {([
                        { key: 'breathing', label: 'Respiração e Controle' },
                        { key: 'floating', label: 'Flutuação e Sustentação' },
                        { key: 'technique', label: 'Técnica de Nado' },
                        { key: 'speed', label: 'Velocidade e Resistência' },
                      ] as const).map(criterion => (
                        <div key={criterion.key} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-amber-200">
                          <span className="text-sm font-semibold text-slate-700">{criterion.label}</span>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <EvaluationButton
                              status={selectedStudent.evalDetails[criterion.key as keyof Evaluation] as EvaluationStatus}
                              value="achieved"
                              label="Atingido"
                              colorClass="bg-emerald-500 text-white"
                              onClick={() => handleUpdateEvaluation(criterion.key as keyof Evaluation, 'achieved')}
                            />
                            <EvaluationButton
                              status={selectedStudent.evalDetails[criterion.key as keyof Evaluation] as EvaluationStatus}
                              value="developing"
                              label="Em Desenv."
                              colorClass="bg-orange-400 text-white"
                              onClick={() => handleUpdateEvaluation(criterion.key as keyof Evaluation, 'developing')}
                            />
                            <EvaluationButton
                              status={selectedStudent.evalDetails[criterion.key as keyof Evaluation] as EvaluationStatus}
                              value="untested"
                              label="N/A"
                              colorClass="bg-slate-200 text-slate-500"
                              onClick={() => handleUpdateEvaluation(criterion.key as keyof Evaluation, 'untested')}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1 h-3 bg-amber-500 rounded-full"></span> Observações do Professor
                    </h3>
                    <textarea 
                      className="w-full p-4 bg-white rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-400 outline-none h-24 transition-all" 
                      placeholder="Adicione observações sobre o desempenho..."
                    ></textarea>
                  </div>
                </div>

                <div className="p-6 bg-white/50 border-t border-slate-100 flex gap-4 shrink-0">
                  <button 
                    onClick={() => setSelectedId(null)}
                    className="flex-1 py-3 bg-black text-white rounded-2xl font-bold text-sm shadow-lg shadow-black/20 hover:bg-slate-900 transition-all active:scale-95 border border-slate-800"
                  >
                    Salvar Avaliação
                  </button>
                  <button className="px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all hidden sm:block">
                    Cancelar
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-slate-400 p-8"
              >
                <div className="w-20 h-20 rounded-full bg-slate-100 border border-white flex items-center justify-center mb-4 shadow-sm">
                  <Droplets className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500 text-center max-w-sm">
                  Selecione um aluno na lista à esquerda para visualizar e preencher a avaliação trimestral.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
