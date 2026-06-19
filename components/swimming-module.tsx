'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Search, Check, Award, ChevronRight, Filter, Trash2, MessageCircle, Edit, ArrowLeft, PlusCircle, History, Lock, CheckCircle2 } from 'lucide-react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { jsPDF } from 'jspdf';
import { Student, CapLevel, EvalStatus, Evaluation, levels } from '@/types';
import { supabase } from '@/lib/supabase';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

// === MODELOS DE AVALIAÇÃO OFICIAIS ===
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

type ViewMode = 'profile' | 'evaluation' | 'edit_student';

export function SwimmingModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<CapLevel | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('profile');
  const [draftEval, setDraftEval] = useState<Evaluation | null>(null);
  const [editData, setEditData] = useState<Partial<Student>>({});

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*, evaluations(*)');
    if (data) setStudents(data.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || s.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const selectedStudentRaw = students.find(s => s.id === selectedId) || null;

  // LÓGICA DA REGRA DOS 80% (AUTO-APROVAÇÃO)
  const currentCriteriaList = selectedStudentRaw && EVALUATION_CRITERIA[selectedStudentRaw.level] ? EVALUATION_CRITERIA[selectedStudentRaw.level] : [];
  const totalCriteria = currentCriteriaList.length;
  const yesCount = draftEval ? currentCriteriaList.filter(c => draftEval.results[c.id] === 'yes').length : 0;
  const requiredYes = Math.ceil(totalCriteria * 0.8);
  const isApproved = totalCriteria > 0 && yesCount >= requiredYes;
  const missingYes = Math.max(0, requiredYes - yesCount);

  useEffect(() => { if (selectedStudentRaw) setViewMode('profile'); }, [selectedId]);

  const handleSaveStudent = async () => {
    if (!selectedStudentRaw) return;
    setSaving(true);
    const { data, error } = await supabase.from('students').update({
      name: editData.name, age: editData.age, level: editData.level, phone: editData.phone, guardian_name: editData.guardian_name
    }).eq('id', selectedStudentRaw.id).select('*, evaluations(*)');

    if (error) alert("Erro ao salvar dados: " + error.message);
    else if (data && data[0]) {
      setStudents(prev => prev.map(s => s.id === selectedStudentRaw.id ? data[0] : s));
      alert("Dados atualizados!");
      setViewMode('profile');
    }
    setSaving(false);
  };

  const handleUpdateCriterion = (criterionId: string, status: EvalStatus) => {
    if (!draftEval) return;
    setDraftEval({ ...draftEval, results: { ...(draftEval.results || {}), [criterionId]: status } });
  };

  const handleSaveEvaluation = async () => {
    if (!selectedStudentRaw || !draftEval) return;
    setSaving(true);
    
    // O SISTEMA DEFINE O STATUS ANTES DE SALVAR (Regra de 80%)
    const autoStatus = isApproved ? 'approved' : 'reproved';

    if (draftEval.id) {
      const { data, error } = await supabase.from('evaluations').update({ results: draftEval.results, general_status: autoStatus, notes: draftEval.notes }).eq('id', draftEval.id).select();
      if (error) alert("Erro: " + error.message);
      else if (data && data[0]) {
        setStudents(prev => prev.map(s => s.id === selectedStudentRaw.id ? { ...s, evaluations: s.evaluations?.map(e => e.id === draftEval.id ? data[0] : e) || [] } : s));
        alert("Ficha atualizada!");
        setViewMode('profile');
      }
    } else {
      const { data, error } = await supabase.from('evaluations').insert([{ student_id: selectedStudentRaw.id, date: new Date().toISOString(), results: draftEval.results, general_status: autoStatus, notes: draftEval.notes }]).select();
      if (error) {
        if (error.message.includes("results")) alert("Rode aquele SQL antigo que passei!"); else alert("Erro: " + error.message);
      } else if (data && data[0]) {
        setStudents(prev => prev.map(s => s.id === selectedStudentRaw.id ? { ...s, evaluations: [data[0], ...(s.evaluations || [])] } : s));
        alert("Ficha salva!");
        setViewMode('profile');
      }
    }
    setSaving(false);
  };

  const handleWhatsApp = (ev: Evaluation) => {
    if (!selectedStudentRaw || !selectedStudentRaw.phone) return alert("Cadastre um telefone primeiro!");
    let phoneNum = selectedStudentRaw.phone.replace(/\D/g, '');
    if (!phoneNum.startsWith('55')) phoneNum = '55' + phoneNum;
    let message = ev.general_status === 'approved' 
      ? `Olá! Aqui é do Clube Olimpo. Temos excelentes notícias: O(a) aluno(a) *${selectedStudentRaw.name}* foi *APROVADO(A)* na avaliação trimestral! Ele(a) já está apto(a) para trocar de nível. O certificado oficial impresso e a nova touca serão entregues na próxima aula. Parabéns pela evolução!`
      : `Olá! Aqui é do Clube Olimpo. A avaliação trimestral do(a) *${selectedStudentRaw.name}* está pronta! Vou enviar o arquivo PDF da ficha técnica logo abaixo para acompanharem a evolução dele(a) nas piscinas. Qualquer dúvida, o professor está à disposição!`;
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudentRaw || !confirm("Apagar aluno e histórico?")) return;
    await supabase.from('evaluations').delete().eq('student_id', selectedStudentRaw.id);
    await supabase.from('students').delete().eq('id', selectedStudentRaw.id);
    setStudents(prev => prev.filter(s => s.id !== selectedStudentRaw.id));
    setSelectedId(null);
  };

  const handleDeleteEvaluation = async () => {
    if (!draftEval?.id || !selectedStudentRaw || !confirm("Excluir esta ficha?")) return;
    await supabase.from('evaluations').delete().eq('id', draftEval.id);
    setStudents(prev => prev.map(s => s.id === selectedStudentRaw.id ? { ...s, evaluations: s.evaluations?.filter(e => e.id !== draftEval.id) || [] } : s));
    alert("Ficha excluída!");
    setViewMode('profile');
  };

  // ==========================================
  // NOVO GERADOR DE PDF PREMIUM
  // ==========================================
  const handleDownloadReport = (ev: Evaluation) => {
    if (!selectedStudentRaw) return;
    const doc = new jsPDF();
    
    const primary = [15, 23, 42]; // slate-900
    const accent = [245, 158, 11]; // amber-500
    
    // Cabeçalho Premium
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Linha Dourada
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 40, 210, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("CLUBE OLIMPO", 20, 22);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text("Relatório Oficial de Avaliação Técnica", 20, 30);

    // Box de Informações do Aluno
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(20, 50, 170, 35, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Aluno(a): ${selectedStudentRaw.name}`, 25, 60);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Idade: ${selectedStudentRaw.age} anos`, 25, 68);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Nível Atual: ${levels[selectedStudentRaw.level].name}`, 25, 76);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${new Date(ev.date).toLocaleDateString('pt-BR')}`, 140, 76);

    // Título da Seção
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Critérios Avaliados", 20, 100);

    let yPos = 110;
    const criteriaList = EVALUATION_CRITERIA[selectedStudentRaw.level] || [];
    
    criteriaList.forEach((c, index) => {
      if (yPos > 260) { doc.addPage(); yPos = 20; }
      
      // Linhas Zebradas
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(20, yPos - 5, 170, 8, 'F');
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      
      const lines = doc.splitTextToSize(c.label, 130);
      const status = ev.results[c.id];
      let statusText = '';
      let statusColor = [100, 100, 100];
      
      if (status === 'yes') {
        statusText = 'ATINGIDO';
        statusColor = [16, 185, 129];
      } else if (status === 'no') {
        statusText = 'EM DESENV.';
        statusColor = [239, 68, 68];
      } else {
        statusText = 'N/A';
      }

      doc.text(lines, 22, yPos);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(statusText, 160, yPos);
      
      yPos += (lines.length * 5) + 3;
    });

    // Resultado Final
    yPos += 10;
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    const isApp = ev.general_status === 'approved';
    const genStatus = isApp ? 'APROVADO PARA TROCA DE TOUCA' : ev.general_status === 'reproved' ? 'EM DESENVOLVIMENTO' : 'PENDENTE';
    const finalColor = isApp ? [16, 185, 129] : [245, 158, 11];
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Resultado Geral:", 20, yPos);
    
    doc.setTextColor(finalColor[0], finalColor[1], finalColor[2]);
    doc.text(genStatus, 70, yPos);
    
    if (ev.notes) { 
      yPos += 15;
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Observações do Professor:", 20, yPos);
      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(doc.splitTextToSize(ev.notes, 170), 20, yPos); 
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Documento Oficial - Clube Olimpo", 105, 285, { align: "center" });

    doc.save(`Olimpo_Ficha_${selectedStudentRaw.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const EvaluationButton = ({ status, value, label, onClick, colorClass }: { status: EvalStatus | 'untested', value: EvalStatus, label: string, onClick: () => void, colorClass: string }) => (
    <button onClick={onClick} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all border", status === value ? cn("border-transparent shadow-md", colorClass) : "border-slate-200 text-slate-500 hover:bg-slate-50 bg-white")}>
      {label}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 md:bg-transparent">
      
      <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-8 bg-white/50 border-b border-slate-200 backdrop-blur-sm shrink-0">
        <h1 className="text-base md:text-xl font-extrabold text-slate-800 tracking-tight">Avaliação Natação</h1>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 md:gap-6 overflow-hidden md:p-8">
        
        {/* === LISTA DE ALUNOS === */}
        <div className={cn("md:col-span-4 flex flex-col h-full bg-white md:rounded-3xl shadow-sm border-r md:border border-slate-200 overflow-hidden shrink-0", selectedStudentRaw ? "hidden md:flex" : "flex")}>
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <h2 className="font-bold text-sm text-slate-700">Selecione o Aluno</h2>
            <span className="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold text-slate-600">{filteredStudents.length} Ativos</span>
          </div>

          <div className="px-3 pt-3 shrink-0 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar aluno..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm text-slate-700" />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as CapLevel | 'all')}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm appearance-none text-slate-700">
                <option value="all">Todos os Níveis</option>
                {Object.entries(levels).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 mt-1">
            {loading ? <p className="text-center text-xs text-slate-400 py-4">Carregando...</p> : filteredStudents.map(student => (
              <motion.button key={student.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedId(student.id)}
                className={cn("w-full text-left p-3 flex items-center gap-3 transition-colors rounded-xl mb-1", selectedStudentRaw?.id === student.id ? "bg-amber-50 border border-amber-100" : "border border-transparent hover:bg-slate-50")}>
                <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-inner", levels[student.level].bgClass)}>
                  <Award className="w-4 h-4 md:w-5 md:h-5 text-white opacity-90" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{student.name}</p>
                  <p className="text-[10px] uppercase text-slate-500 truncate font-bold">{levels[student.level].name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 md:hidden" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* === PAINEL DIREITO === */}
        <div className={cn("md:col-span-8 flex flex-col h-full bg-white/80 md:glass md:rounded-3xl shadow-xl md:border border-white overflow-hidden relative", !selectedStudentRaw ? "hidden md:flex" : "flex")}>
          <AnimatePresence mode="wait">
            {selectedStudentRaw ? (
              viewMode === 'profile' ? (
                // === DOSSIÊ ===
                <motion.div key="profile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col h-full w-full absolute inset-0">
                  <div className="p-4 md:p-8 border-b border-slate-100 shrink-0 bg-white">
                    <button onClick={() => setSelectedId(null)} className="md:hidden flex items-center gap-1 px-3 py-2 bg-slate-100 rounded-lg mb-3">
                      <ArrowLeft className="w-4 h-4 text-slate-600" /> <span className="text-xs font-bold text-slate-600">Voltar para Lista</span>
                    </button>

                    <div className="flex justify-between items-start gap-2">
                      <div className="flex gap-3 items-center min-w-0">
                        <div className={cn("w-12 h-12 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-white font-bold text-xl md:text-3xl shadow-lg shrink-0", levels[selectedStudentRaw.level].bgClass)}>
                          {selectedStudentRaw.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg md:text-2xl font-extrabold text-slate-800 truncate">{selectedStudentRaw.name}</h2>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className={cn("px-2 py-0.5 text-white text-[9px] md:text-xs font-bold rounded uppercase", levels[selectedStudentRaw.level].bgClass)}>{levels[selectedStudentRaw.level].name}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] md:text-xs font-bold rounded">Id: {selectedStudentRaw.age}a</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => { setEditData(selectedStudentRaw); setViewMode('edit_student'); }} className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Edit className="w-4 h-4" /></button>
                        <button onClick={handleDeleteStudent} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-3 md:p-6 overflow-y-auto bg-slate-50/50">
                    <button onClick={() => { setDraftEval({ date: new Date().toISOString(), results: {}, general_status: 'pending' }); setViewMode('evaluation'); }}
                        className="w-full mb-4 px-4 py-3 bg-black text-white font-bold text-sm rounded-xl shadow-md flex justify-center items-center gap-2 active:scale-95 transition-transform">
                        <PlusCircle className="w-4 h-4" /> Criar Nova Ficha Trimestral
                    </button>

                    {(!selectedStudentRaw.evaluations || selectedStudentRaw.evaluations.length === 0) ? (
                      <div className="text-center py-8"><p className="text-xs text-slate-400 font-medium">Nenhuma ficha no dossiê.</p></div>
                    ) : (
                      <div className="space-y-3">
                        {selectedStudentRaw.evaluations.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ev => (
                          <div key={ev.id} className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-extrabold text-slate-800 text-sm">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                                <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded uppercase", ev.general_status === 'approved' ? "bg-emerald-100 text-emerald-700" : ev.general_status === 'reproved' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")}>
                                  {ev.general_status === 'approved' ? 'Aprovado' : ev.general_status === 'reproved' ? 'Reprovado' : 'Pendente'}
                                </span>
                              </div>
                              <button onClick={() => { setDraftEval(ev); setViewMode('evaluation'); }} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-xs font-bold shadow-sm">Abrir</button>
                            </div>
                            <div className="flex gap-2 pt-3 border-t border-slate-100">
                              <button onClick={() => handleWhatsApp(ev)} className="flex-1 flex justify-center items-center p-2 text-emerald-600 bg-emerald-50 rounded-lg text-[11px] font-bold gap-1"><MessageCircle className="w-3.5 h-3.5"/> WhatsApp</button>
                              <button onClick={() => handleDownloadReport(ev)} className="flex-1 flex justify-center items-center p-2 text-slate-600 bg-slate-100 rounded-lg text-[11px] font-bold gap-1"><Droplets className="w-3.5 h-3.5"/> Baixar PDF</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>

              ) : viewMode === 'edit_student' ? (
                // === EDITAR ALUNO ===
                <motion.div key="edit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col h-full w-full absolute inset-0">
                  <div className="p-4 border-b border-slate-100 shrink-0 bg-white flex items-center gap-3">
                    <button onClick={() => setViewMode('profile')} className="p-2 bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-600" /></button>
                    <h2 className="text-base font-bold text-slate-800">Editar Aluno</h2>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block">Nome Completo</label><input type="text" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-3 border rounded-lg text-sm" /></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-500 mb-1 block">Idade</label><input type="number" value={editData.age || ''} onChange={e => setEditData({...editData, age: parseInt(e.target.value)})} className="w-full p-3 border rounded-lg text-sm" /></div><div><label className="text-xs font-bold text-slate-500 mb-1 block">Nível</label><select value={editData.level || 'yellow'} onChange={e => setEditData({...editData, level: e.target.value as CapLevel})} className="w-full p-3 border rounded-lg text-sm bg-white"><option value="yellow">Amarela</option><option value="orange">Laranja</option><option value="red">Vermelha</option><option value="green">Verde</option><option value="lightBlue">Azul Claro</option><option value="darkBlue">Azul Escuro</option><option value="black">Preta</option></select></div></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block">WhatsApp</label><input type="text" value={editData.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full p-3 border rounded-lg text-sm" /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block">Responsável</label><input type="text" value={editData.guardian_name || ''} onChange={e => setEditData({...editData, guardian_name: e.target.value})} className="w-full p-3 border rounded-lg text-sm" /></div>
                  </div>
                  <div className="p-4 bg-white border-t flex gap-3 shrink-0">
                    <button onClick={handleSaveStudent} disabled={saving} className="w-full py-3 bg-amber-500 text-black rounded-xl font-bold shadow-md active:scale-95 transition-transform">{saving ? "Salvando..." : "Salvar Alterações"}</button>
                  </div>
                </motion.div>

              ) : (
                // === PREENCHER FICHA COM 80% AUTO-APROVAÇÃO ===
                <motion.div key="eval" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col h-full w-full absolute inset-0">
                  <div className="p-4 border-b border-slate-100 shrink-0 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setViewMode('profile')} className="p-2 bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-600" /></button>
                      <div><h2 className="text-sm font-bold text-slate-800">Ficha Técnica</h2><p className="text-[10px] text-slate-500">{new Date(draftEval?.date || '').toLocaleDateString('pt-BR')}</p></div>
                    </div>
                    {draftEval?.id && <button onClick={handleDeleteEvaluation} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4"/></button>}
                  </div>
                  <div className="flex-1 p-3 space-y-5 overflow-y-auto custom-scrollbar bg-slate-50/50">
                    
                    {/* PLACAR DOS 80% */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Regra de Aprovação (80%)</p>
                          <p className="text-lg font-extrabold text-slate-800">{yesCount} <span className="text-sm font-medium text-slate-400">/ {totalCriteria} metas atingidas</span></p>
                        </div>
                        <div className={cn("px-3 py-1 rounded-full text-xs font-bold border", isApproved ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200")}>
                          Mínimo: {requiredYes}
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div className={cn("h-full transition-colors", isApproved ? "bg-emerald-500" : "bg-amber-500")} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (yesCount / totalCriteria) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {currentCriteriaList.length === 0 ? <p className="text-xs text-slate-500 p-3 bg-white rounded-lg border">Sem critérios para este nível.</p> : (
                        <div className="grid gap-2">
                          {currentCriteriaList.map(criterion => (
                            <div key={criterion.id} className="p-3 bg-white rounded-xl border shadow-sm flex flex-col gap-2">
                              <span className="text-xs font-semibold text-slate-700 leading-tight">{criterion.label}</span>
                              <div className="flex gap-2 mt-1"><EvaluationButton status={draftEval!.results[criterion.id] || 'untested'} value="yes" label="Sim" colorClass="bg-green-500 text-white" onClick={() => handleUpdateCriterion(criterion.id, 'yes')} /><EvaluationButton status={draftEval!.results[criterion.id] || 'untested'} value="no" label="Não" colorClass="bg-red-500 text-white" onClick={() => handleUpdateCriterion(criterion.id, 'no')} /></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* RESULTADO GERAL AUTOMÁTICO */}
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-bold text-slate-500 uppercase">Resultado Geral</h3>
                      <div className={cn("p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-colors", isApproved ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200")}>
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1" />
                            <p className="font-bold text-emerald-700 text-lg">Aprovado Automático!</p>
                            <p className="text-xs text-emerald-600 font-medium">Aluno atingiu os 80% e está apto.</p>
                          </>
                        ) : (
                          <>
                            <Lock className="w-8 h-8 text-slate-400 mb-1" />
                            <p className="font-bold text-slate-600 text-lg">Bloqueado</p>
                            <p className="text-xs text-slate-500 font-medium">Faltam {missingYes} metas para aprovação.</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2"><h3 className="text-[11px] font-bold text-slate-500 uppercase">Anotações do Professor</h3><textarea value={draftEval!.notes || ''} onChange={(e) => setDraftEval({ ...draftEval!, notes: e.target.value })} className="w-full p-3 bg-white rounded-xl border text-xs h-20 outline-none focus:ring-2 focus:ring-amber-500/20" placeholder="Observações extras para os pais lerem..."></textarea></div>
                  </div>
                  <div className="p-4 bg-white border-t flex gap-3 shrink-0">
                    <button onClick={handleSaveEvaluation} disabled={saving} className="w-full py-3.5 bg-black text-white rounded-xl font-bold active:scale-95 transition-transform">{saving ? "Salvando..." : isApproved ? "Salvar Ficha Aprovada" : "Salvar Ficha Reprovada"}</button>
                  </div>
                </motion.div>
              )
            ) : (
              <div className="h-full hidden md:flex flex-col items-center justify-center text-slate-400 p-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 border flex items-center justify-center mb-3"><Droplets className="w-6 h-6 text-slate-300" /></div>
                <p className="text-xs font-medium text-slate-500">Selecione o aluno.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
