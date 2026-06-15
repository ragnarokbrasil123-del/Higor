'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Search, Check, Award, ChevronRight, Filter, Trash2 } from 'lucide-react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { jsPDF } from 'jspdf';
import { Student, CapLevel, EvalStatus, Evaluation, levels } from '@/types';
import { supabase } from '@/lib/supabase';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

// === MODELOS DE AVALIAÇÃO OFICIAIS DO CLUBE ===
const EVALUATION_CRITERIA: Record<CapLevel, { id: string; label: string }[]> = {
  yellow: [
    { id: 'y1', label: '1. Adaptação poli sensorial: Colocar o rosto na água, executa a respiração pela boca ou nariz ou os dois.' },
    { id: 'y2', label: '2. A criança deve ser capaz de flutuar com apoio de um adulto ou de um objeto flutuante.' },
    { id: 'y3', label: '3. Chutar com os pés enquanto está segurando na borda da piscina.' },
    { id: 'y4', label: '4. Realizar movimentos básicos de braços e pernas, como movimentos de remo e pedalada.' },
    { id: 'y5', label: '5. Flutuar sem apoio por 5 segundos.' },
    { id: 'y6', label: '6. Nadar 2 metros sem apoio.' },
    { id: 'y7', label: '7. Executar uma virada básica: transição de costas para bruços.' },
    { id: 'y8', label: '8. Flutuar de costas sem apoio.' },
    { id: 'y9', label: '9. Chutar com os pés sem apoio.' },
    { id: 'y10', label: '10. Explorar o meio aquático, resgatando objetos submersos com ou sem auxílio.' },
  ],
  orange: [
    { id: 'o1', label: '1. Flutuação: Capacidade de flutuar sem apoio por 10 segundos.' },
    { id: 'o2', label: '2. Movimentação: Coordenação de braços e pernas durante natação.' },
    { id: 'o3', label: '3. Respiração: Técnica de respiração correta durante a natação.' },
    { id: 'o4', label: '4. Deslocamento: Capacidade de se deslocar por 5 metros sem apoio.' },
    { id: 'o5', label: '5. Salta da borda e se desloca até a plataforma sem ajuda do professor.' },
    { id: 'o6', label: '6. Entrada: Capacidade de entrar na água de forma segura.' },
    { id: 'o7', label: '7. Natação com apoio: capacidade de nadar com apoio por 2 metros.' },
    { id: 'o8', label: '8. Virada: Capacidade de virar o corpo na água.' },
    { id: 'o9', label: '9. Mergulho: capacidade de mergulhar até o fundo da piscina.' },
    { id: 'o10', label: '10. Saída da água: Capacidade de sair da água de forma segura.' },
  ],
  red: [
    { id: 'r1', label: '1. Posição hidrodinâmica (deslizar na posição ventral).' },
    { id: 'r2', label: '2. Eficiência na movimentação de pernas (Crawl).' },
    { id: 'r3', label: '3. Eficiência na movimentação de braços (Crawl).' },
    { id: 'r4', label: '4. Eficiência na respiração unilateral (Crawl).' },
    { id: 'r5', label: '5. Atravessar a piscina com coordenação e eficiência com movimentos globais.' },
    { id: 'r6', label: '6. Saltar da borda.' },
    { id: 'r7', label: '7. Posição hidrodinâmica (deslizar na posição dorsal).' },
    { id: 'r8', label: '8. Eficiência na movimentação de pernas (Costas).' },
    { id: 'r9', label: '9. Eficiência na movimentação de braços (Costas).' },
    { id: 'r10', label: '10. Coordenação do nado costas.' },
    { id: 'r11', label: '11. Eficiência no braço do nado peito.' },
  ],
  green: [
    { id: 'g1', label: '1. Crawl e Costas: com técnica aperfeiçoada.' },
    { id: 'g2', label: '2. Respiração: crawl 2x1 e 3x1 / Costas Inspira pela boca e expira pelo nariz.' },
    { id: 'g3', label: '3. Saídas: Crawl e Costas com técnica e mantém o nado até a borda da piscina.' },
    { id: 'g4', label: '4. Salto: Executa a saída da borda ou do bloco e prossegue com o nado até a borda final da piscina.' },
    { id: 'g5', label: '5. Nado peito: pernas e braços (técnica rudimentar).' },
    { id: 'g6', label: '6. Nado peito: submerso 12,5 a 15 metros.' },
    { id: 'g7', label: '7. Nado peito: pernas e braços com Coordenação e propulsão (rudimentar).' },
    { id: 'g8', label: '8. Borboleta: Executa a perna do nado (rudimentar).' },
    { id: 'g9', label: '9. Crawl e Costas: 25 metros mantendo a técnica aperfeiçoada.' },
    { id: 'g10', label: '10. Peito: 12,5 metros, nado completo mantendo a técnica rudimentar.' },
  ],
  lightBlue: [
    { id: 'lb1', label: '1. Executa nado peito com saída Filipina.' },
    { id: 'lb2', label: '2. Executa braçada do nado borboleta com variações de pernas.' },
    { id: 'lb3', label: '3. Executa o nado borboleta rudimentar.' },
    { id: 'lb4', label: '4. 15 metros de ondulação dorsal.' },
    { id: 'lb5', label: '5. 15 metros nado peito com saída Filipina.' },
    { id: 'lb6', label: '6. 12,5 metros de borboleta rudimentar.' },
    { id: 'lb7', label: '7. Executa o medley rudimentar.' },
    { id: 'lb8', label: '8. Executa a virada olímpica rudimentar nado crawl.' },
    { id: 'lb9', label: '9. Sustentação com Palmateios na posição ventral.' },
    { id: 'lb10', label: '10. 15 metros de ondulação submersa frontal.' },
  ],
  darkBlue: [
    { id: 'db1', label: '1. Nado crawl e costas 100 metros, 50 metros nado peito.' },
    { id: 'db2', label: '2. Nado borboleta 25 metros.' },
    { id: 'db3', label: '3. Salta da plataforma na posição correta (sem exigência de perfeição).' },
    { id: 'db4', label: '4. Saída e viradas dos 4 nados.' },
    { id: 'db5', label: '5. Respiração técnica dos 4 nados.' },
    { id: 'db6', label: '6. Os 4 nados executados com técnicas aperfeiçoadas.' },
    { id: 'db7', label: '7. Executa o Medley (rudimentar).' },
    { id: 'db8', label: '8. Nadar 12,5 metros em apneia.' },
    { id: 'db9', label: '9. Preparado para nadar em piscina semi olímpica e olímpica.' },
    { id: 'db10', label: '10. Nadar 250 metros crawl em 7 minutos.' },
  ],
  black: []
};

export function SwimmingModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<CapLevel | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [draftEval, setDraftEval] = useState<Evaluation | null>(null);

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

  useEffect(() => {
    if (selectedStudentRaw) {
      const latestEval = selectedStudentRaw.evaluations?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      setDraftEval(latestEval || { 
        date: new Date().toISOString(), 
        results: {}, 
        general_status: 'pending', 
        notes: '' 
      });
    } else {
      setDraftEval(null);
    }
  }, [selectedId, selectedStudentRaw?.evaluations]); // Added dependency to refresh when eval changes

  const handleUpdateCriterion = (criterionId: string, status: EvalStatus) => {
    if (!draftEval) return;
    setDraftEval({
      ...draftEval,
      results: { ...(draftEval.results || {}), [criterionId]: status }
    });
  };

  const handleSaveEvaluation = async () => {
    if (!selectedStudentRaw || !draftEval) return;
    setSaving(true);
    
    if (draftEval.id) {
      // ATUALIZA SE JÁ EXISTIR (Evita duplicação)
      const { data } = await supabase.from('evaluations').update({
        results: draftEval.results,
        general_status: draftEval.general_status,
        notes: draftEval.notes
      }).eq('id', draftEval.id).select();

      if (data && data[0]) {
        setStudents(prev => prev.map(s => s.id === selectedStudentRaw.id 
          ? { ...s, evaluations: s.evaluations?.map(e => e.id === draftEval.id ? data[0] : e) || [] } 
          : s
        ));
        alert("Ficha atualizada com sucesso!");
      }
    } else {
      // CRIA NOVA
      const { data } = await supabase.from('evaluations').insert([{
        student_id: selectedStudentRaw.id,
        date: new Date().toISOString(),
        results: draftEval.results,
        general_status: draftEval.general_status,
        notes: draftEval.notes
      }]).select();

      if (data && data[0]) {
        setStudents(prev => prev.map(s => s.id === selectedStudentRaw.id 
          ? { ...s, evaluations: [data[0], ...(s.evaluations || [])] } 
          : s
        ));
        alert("Ficha salva com sucesso!");
      }
    }
    setSaving(false);
  };

  // === FUNÇÕES DE EXCLUSÃO (LIXEIRAS) ===
  const handleDeleteStudent = async () => {
    if (!selectedStudentRaw) return;
    if (!confirm("Tem certeza que deseja APAGAR ESTE ALUNO do sistema? Todo o histórico será perdido.")) return;
    
    // Deleta do banco
    await supabase.from('evaluations').delete().eq('student_id', selectedStudentRaw.id);
    await supabase.from('students').delete().eq('id', selectedStudentRaw.id);
    
    // Atualiza a tela
    setStudents(prev => prev.filter(s => s.id !== selectedStudentRaw.id));
    setSelectedId(null);
  };

  const handleDeleteEvaluation = async () => {
    if (!draftEval?.id || !selectedStudentRaw) return;
    if (!confirm("Tem certeza que deseja excluir esta ficha de avaliação?")) return;
    
    // Deleta do banco
    await supabase.from('evaluations').delete().eq('id', draftEval.id);
    
    // Atualiza a tela
    setStudents(prev => prev.map(s => {
      if (s.id === selectedStudentRaw.id) {
        return { ...s, evaluations: s.evaluations?.filter(e => e.id !== draftEval.id) || [] };
      }
      return s;
    }));
    alert("Avaliação excluída!");
  };
  // =====================================

  const handleDownloadReport = () => {
    if (!selectedStudentRaw || !draftEval) return;
    
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Ficha de Verificação Trimestral', 20, 20);
    doc.setFontSize(14);
    doc.text(`Aluno: ${selectedStudentRaw.name}`, 20, 40);
    doc.text(`Nível (Touca): ${levels[selectedStudentRaw.level].name}`, 20, 50);
    doc.text(`Data: ${new Date(draftEval.date).toLocaleDateString('pt-BR')}`, 20, 60);
    
    doc.setFontSize(12);
    let yPos = 80;
    
    const criteriaList = EVALUATION_CRITERIA[selectedStudentRaw.level] || [];
    
    criteriaList.forEach(c => {
      const status = draftEval.results[c.id];
      const statusText = status === 'yes' ? 'Sim' : status === 'no' ? 'Não' : 'N/A';
      
      const lines = doc.splitTextToSize(`${c.label} - R: [${statusText}]`, 170);
      doc.text(lines, 20, yPos);
      yPos += (lines.length * 8);
      
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
    });
    
    yPos += 10;
    doc.setFontSize(14);
    const genStatus = draftEval.general_status === 'approved' ? 'Aprovado' : draftEval.general_status === 'reproved' ? 'Reprovado' : 'Pendente';
    doc.text(`Avaliação Geral: ${genStatus}`, 20, yPos);
    
    if (draftEval.notes) {
      doc.setFontSize(12);
      const obsLines = doc.splitTextToSize(`OBS: ${draftEval.notes}`, 170);
      doc.text(obsLines, 20, yPos + 10);
    }
    
    doc.save(`Ficha_${selectedStudentRaw.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const EvaluationButton = ({ status, value, label, onClick, colorClass }: { status: EvalStatus | 'untested', value: EvalStatus, label: string, onClick: () => void, colorClass: string }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border",
        status === value 
          ? cn("border-transparent shadow-sm", colorClass)
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
          <button 
            onClick={handleDownloadReport}
            disabled={!draftEval}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              draftEval ? "bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer" : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            Exportar PDF
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
        
        {/* LISTA DE ALUNOS */}
        <div className="md:col-span-4 flex flex-col h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
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
                  <option key={key} value={key}>{value.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {loading ? <p className="text-center text-sm text-slate-400 py-4">Carregando...</p> : filteredStudents.map(student => (
              <motion.button
                key={student.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedId(student.id)}
                className={cn(
                  "w-full text-left p-3 flex items-center gap-4 transition-colors group rounded-2xl",
                  selectedStudentRaw?.id === student.id ? "bg-amber-50 border border-amber-100 ring-2 ring-amber-500/20" : "border border-transparent hover:bg-slate-50"
                )}
              >
                <div className={cn("w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-inner", levels[student.level].bgClass)}>
                  <Award className="w-5 h-5 text-white opacity-90" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{student.name}</p>
                  <p className="text-[11px] uppercase text-slate-500 truncate font-semibold">{levels[student.level].name}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* FICHA DE AVALIAÇÃO */}
        <div className="md:col-span-8 flex flex-col h-full bg-white/80 glass rounded-3xl shadow-xl border border-white overflow-hidden relative">
          <AnimatePresence mode="wait">
            {selectedStudentRaw && draftEval ? (
              <motion.div
                key={selectedStudentRaw.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full w-full absolute inset-0"
              >
                <div className="p-6 pb-4 flex items-center gap-6 border-b border-slate-100 shrink-0">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0", levels[selectedStudentRaw.level].bgClass)}>
                    {selectedStudentRaw.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800">{selectedStudentRaw.name}</h2>
                    <span className={cn("inline-block mt-1 px-2 py-0.5 text-white text-[10px] font-bold rounded uppercase tracking-wider", levels[selectedStudentRaw.level].bgClass)}>
                      Ficha: {levels[selectedStudentRaw.level].name}
                    </span>
                  </div>
                  
                  {/* === LIXEIRA DO ALUNO === */}
                  <button 
                    onClick={handleDeleteStudent}
                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100"
                    title="Excluir Aluno do Sistema"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  {/* ======================= */}

                </div>

                <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar bg-slate-50/30">
                  
                  {/* CRITÉRIOS DE AVALIAÇÃO DINÂMICOS */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span> Verificação de Habilidades
                    </h3>
                    
                    {EVALUATION_CRITERIA[selectedStudentRaw.level]?.length === 0 ? (
                      <p className="text-sm text-slate-500 p-4 bg-white rounded-xl border border-slate-200">Nenhum critério definido para esta touca ainda.</p>
                    ) : (
                      <div className="grid gap-3">
                        {EVALUATION_CRITERIA[selectedStudentRaw.level].map(criterion => (
                          <div key={criterion.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 transition-all hover:border-amber-200">
                            <span className="text-sm font-semibold text-slate-700 leading-snug">{criterion.label}</span>
                            <div className="flex items-center gap-2 max-w-xs">
                              <EvaluationButton
                                status={draftEval.results[criterion.id] || 'untested'}
                                value="yes"
                                label="Sim"
                                colorClass="bg-green-500 text-white"
                                onClick={() => handleUpdateCriterion(criterion.id, 'yes')}
                              />
                              <EvaluationButton
                                status={draftEval.results[criterion.id] || 'untested'}
                                value="no"
                                label="Não"
                                colorClass="bg-red-500 text-white"
                                onClick={() => handleUpdateCriterion(criterion.id, 'no')}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AVALIAÇÃO GERAL (Aprovado / Reprovado) */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span> Avaliação Geral
                    </h3>
                    <div className="flex gap-4 max-w-sm">
                      <button 
                        onClick={() => setDraftEval({ ...draftEval, general_status: 'approved' })}
                        className={cn("flex-1 py-3 rounded-xl text-sm font-bold border transition-all", draftEval.general_status === 'approved' ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}
                      >Aprovado</button>
                      <button 
                        onClick={() => setDraftEval({ ...draftEval, general_status: 'reproved' })}
                        className={cn("flex-1 py-3 rounded-xl text-sm font-bold border transition-all", draftEval.general_status === 'reproved' ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-500/30" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}
                      >Reprovado</button>
                    </div>
                  </div>

                  {/* OBSERVAÇÕES */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span> Observações do Professor
                    </h3>
                    <textarea 
                      value={draftEval.notes || ''}
                      onChange={(e) => setDraftEval({ ...draftEval, notes: e.target.value })}
                      className="w-full p-4 bg-white rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-400 outline-none h-24 transition-all" 
                      placeholder="Adicione observações adicionais aqui..."
                    ></textarea>
                  </div>
                </div>

                <div className="p-6 bg-white/50 border-t border-slate-100 flex gap-4 shrink-0">
                  
                  {/* === LIXEIRA DA FICHA === */}
                  {draftEval.id && (
                    <button 
                      onClick={handleDeleteEvaluation}
                      className="px-6 py-3 bg-white text-red-500 rounded-2xl font-bold text-sm hover:bg-red-50 transition-all border border-red-200 shadow-sm"
                    >
                      Excluir Ficha
                    </button>
                  )}
                  {/* ======================== */}

                  <button 
                    onClick={handleSaveEvaluation}
                    disabled={saving}
                    className="flex-1 py-3 bg-black text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-slate-900 transition-all active:scale-95 border border-slate-800 disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : (draftEval.id ? "Atualizar Ficha Salva" : "Salvar Nova Ficha")}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                <div className="w-20 h-20 rounded-full bg-slate-100 border border-white flex items-center justify-center mb-4 shadow-sm">
                  <Droplets className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500 text-center max-w-sm">
                  Selecione um aluno na lista à esquerda para carregar a ficha de verificação.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
