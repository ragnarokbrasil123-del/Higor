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
    { id: 'y2', label: '2. A criança deve ser capaz de flutuar com apoio de um adulto ou de um material de flutuação, mantendo o corpo na horizontal.' },
    { id: 'y3', label: '3. Realizar bolinhas na água.' },
    { id: 'y4', label: '4. Mergulhar a cabeça na água por alguns segundos.' },
    { id: 'y5', label: '5. Deslocamento de 3 a 5 metros com apoio.' }
  ],
  orange: [
    { id: 'o1', label: '1. Controle da respiração, a criança deve ser capaz de realizar de 5 a 10 respirações submerso.' },
    { id: 'o2', label: '2. Deslocamento na água com apoio.' },
    { id: 'o3', label: '3. Flutuação de decúbito dorsal (Barriga pra cima) sem o auxílio do macarrão.' },
    { id: 'o4', label: '4. Flutuação de decúbito ventral (Barriga pra baixo) sem o auxílio do macarrão.' },
    { id: 'o5', label: '5. Batimento de pernas.' },
    { id: 'o6', label: '6. Propulsão de braços (Cachorrinho).' },
    { id: 'o7', label: '7. Salto da borda com e sem auxílio.' },
    { id: 'o8', label: '8. Sobrevivência (Cair na água e retornar à borda).' }
  ],
  red: [
    { id: 'r1', label: '1. Posição de deslize: a criança deve ser capaz de deslizar na água com o corpo alinhado e o rosto submerso.' },
    { id: 'r2', label: '2. Nado Crawl sem respiração lateral.' },
    { id: 'r3', label: '3. Nado costas: a criança deve ser capaz de nadar de costas de forma mais eficiente, com braçadas e pernadas coordenadas.' },
    { id: 'r4', label: '4. Salto de borda com retorno à parede.' },
    { id: 'r5', label: '5. Sustentação na água vertical de 10 a 20s.' },
    { id: 'r6', label: '6. Deslize (A criança deve ser capaz de deslizar submersa até acabar o fôlego).' },
    { id: 'r7', label: '7. Nado submerso: conseguir nadar submerso.' },
    { id: 'r8', label: '8. Virada Simples.' }
  ],
  green: [
    { id: 'g1', label: '1. Nado Crawl com respiração lateral (No mínimo 12,5m).' },
    { id: 'g2', label: '2. Nado de costas.' },
    { id: 'g3', label: '3. Introdução ao nado Peito (pernada de peito de borda e com a prancha).' },
    { id: 'g4', label: '4. Sustentação vertical 30 a 60s.' },
    { id: 'g5', label: '5. Introdução nado submerso.' },
    { id: 'g6', label: '6. Virada simples crawl e costas.' },
    { id: 'g7', label: '7. Mergulho de borda (de joelho).' }
  ],
  lightBlue: [
    { id: 'lb1', label: '1. Aperfeiçoamento do Nado Crawl e costas.' },
    { id: 'lb2', label: '2. Nado peito: A criança deve ser capaz de executar o nado peito (Mínimo 12,5m).' },
    { id: 'lb3', label: '3. Virada simples do Peito.' },
    { id: 'lb4', label: '4. Virada Olímpica do Crawl e Costas.' },
    { id: 'lb5', label: '5. Mergulho da borda na posição em pé.' },
    { id: 'lb6', label: '6. Ondulação: introdução da ondulação do nado borboleta com a prancha.' },
    { id: 'lb7', label: '7. Sustentação de 60s a 2 minutos.' }
  ],
  darkBlue: [
    { id: 'db1', label: '1. Nado Borboleta: A criança deve ser capaz de executar o nado borboleta (Mínimo de 12,5m).' },
    { id: 'db2', label: '2. Aperfeiçoamento do Nado Peito.' },
    { id: 'db3', label: '3. Resistência Nado Crawl e Costas (Mínimo de 50 metros cada nado).' },
    { id: 'db4', label: '4. Virada olímpica em todos os nados.' },
    { id: 'db5', label: '5. Mergulho do Bloco.' }
  ],
  black: [
    { id: 'bk1', label: '1. Melhora de Tempo (Crawl, Costas, Peito e Borboleta).' },
    { id: 'bk2', label: '2. Nado Medley: Executar o Nado Medley completo de forma correta (Mínimo de 100m).' },
    { id: 'bk3', label: '3. Sobrevivência Avançada com roupas.' },
    { id: 'bk4', label: '4. Resgate Básico.' },
    { id: 'bk5', label: '5. Nado submerso contínuo (Mínimo de 25m).' }
  ],
  silver: [
    { id: 'sv1', label: '1. Execução excelente e competitiva de todos os estilos (Crawl, Costas, Peito, Borboleta).' },
    { id: 'sv2', label: '2. Resistência aeróbica extrema (Capacidade de nadar longas distâncias sem perder a técnica).' },
    { id: 'sv3', label: '3. Técnicas avançadas de viradas e chegadas (Viradas olímpicas fluidas e eficientes).' },
    { id: 'sv4', label: '4. Mergulho competitivo impecável do bloco de partida.' }
  ]
};

export function SwimmingModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<CapLevel | 'all'>('all');
  
  // Controle de Visualização do Professor
  const [allowedStudentIds, setAllowedStudentIds] = useState<string[] | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados do Formulário de Avaliação
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalScores, setEvalScores] = useState<Record<string, EvalStatus>>({});
  const [evalNotes, setEvalNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // MÁGICA DO TELETRANSPORTE (Recebe o clique da Grade de Horários)
    const jumpId = localStorage.getItem('olympus_jump_eval');
    if (jumpId) {
      setTimeout(() => {
        setSelectedStudentId(jumpId);
        localStorage.removeItem('olympus_jump_eval');
      }, 100);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Pega o usuário logado
    const userStr = localStorage.getItem('olimpo_session');
    let sessionUser = null;
    let isTeacher = false;
    let teacherName = '';

    if (userStr) {
      const sess = JSON.parse(userStr);
      sessionUser = sess;
      setCurrentUser(sess);
      if (sess.role === 'teacher') {
        isTeacher = true;
        teacherName = sess.data.name || sess.data.username || sess.data.full_name;
      }
    }

    // 2. Busca todos os alunos e avaliações do banco
    const { data: stdData } = await supabase.from('students').select('*').order('name');
    const { data: evlData } = await supabase.from('evaluations').select('*').order('date', { ascending: false });

    // 3. Aplica a Trava de Professor (Se não for Admin, só vê os seus)
    if (isTeacher && teacherName) {
      // Pega as turmas desse professor
      const { data: myClasses } = await supabase.from('classes').select('id').eq('teacher_name', teacherName);
      if (myClasses && myClasses.length > 0) {
        const classIds = myClasses.map(c => c.id);
        // Pega os alunos vinculados nessas turmas
        const { data: mySlots } = await supabase.from('class_slots').select('student_id').in('class_id', classIds);
        
        if (mySlots) {
          const myStudentIds = mySlots.map(s => s.student_id).filter(Boolean) as string[];
          setAllowedStudentIds(myStudentIds);
        } else {
          setAllowedStudentIds([]); // Professor não tem nenhum aluno ainda
        }
      } else {
        setAllowedStudentIds([]); // Professor não tem nenhuma turma
      }
    } else {
      setAllowedStudentIds('all'); // Admin ou outro perfil vê todos
    }

    if (stdData) setStudents(stdData);
    if (evlData) setEvaluations(evlData);
    setLoading(false);
  };

  const getFilteredStudents = () => {
    return students.filter(s => {
      // Regra 1: Tem que estar na lista de permissões do Professor
      if (allowedStudentIds !== 'all' && !allowedStudentIds.includes(s.id)) return false;
      // Regra 2: Pesquisa por nome
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // Regra 3: Filtro de Touca
      if (filterLevel !== 'all' && s.level !== filterLevel) return false;
      
      return true;
    });
  };

  const startEvaluation = (student: Student) => {
    setIsEvaluating(true);
    const initialScores: Record<string, EvalStatus> = {};
    EVALUATION_CRITERIA[student.level as CapLevel]?.forEach(crit => {
      initialScores[crit.id] = 'pending';
    });
    setEvalScores(initialScores);
    setEvalNotes('');
  };

  const saveEvaluation = async (student: Student) => {
    const passedCount = Object.values(evalScores).filter(s => s === 'passed').length;
    const totalCount = Object.keys(evalScores).length;
    const isApproved = passedCount === totalCount && totalCount > 0;

    const newEval = {
      student_id: student.id,
      date: new Date().toISOString(),
      level: student.level,
      scores: evalScores,
      notes: evalNotes,
      approved: isApproved
    };

    const { error: evalError } = await supabase.from('evaluations').insert([newEval]);
    if (evalError) return alert("Erro ao salvar avaliação: " + evalError.message);

    if (isApproved) {
      const levelKeys = Object.keys(levels);
      const currentIndex = levelKeys.indexOf(student.level);
      if (currentIndex < levelKeys.length - 1) {
        const nextLevel = levelKeys[currentIndex + 1];
        await supabase.from('students').update({ level: nextLevel }).eq('id', student.id);
        alert(`🎉 AVALIAÇÃO CONCLUÍDA! O aluno passou para a Touca ${levels[nextLevel as CapLevel].name}!`);
      } else {
        alert('🎉 AVALIAÇÃO CONCLUÍDA! Aluno aprovado (Nível Máximo atingido)!');
      }
    } else {
      alert('Avaliação salva. O aluno precisa continuar praticando alguns fundamentos.');
    }

    setIsEvaluating(false);
    fetchData(); // Recarrega tudo
  };

  const deleteEvaluation = async (id: string) => {
    if (!confirm("Apagar permanentemente esta avaliação do histórico?")) return;
    await supabase.from('evaluations').delete().eq('id', id);
    fetchData();
  };

  // === GERAÇÃO DO BOLETIM PDF COM O NOVO DESIGN ===
  const exportPDF = (evaluation: Evaluation, student: Student) => {
    const doc = new jsPDF();
    const isApproved = evaluation.approved;
    
    // Fundo
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 297, 'F');
    
    // Cabeçalho Lindo
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("CLUBE OLIMPO", 105, 20, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Boletim de Avaliação Trimestral - Natação", 105, 30, { align: "center" });

    // Informações do Aluno
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Aluno: ${student.name}`, 20, 55);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Nível Avaliado: Touca ${levels[evaluation.level as CapLevel]?.name}`, 20, 65);
    doc.text(`Data: ${new Date(evaluation.date).toLocaleDateString('pt-BR')}`, 20, 72);

    // Título das Notas
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Critérios Avaliados:", 20, 90);
    
    // Desenhar Tabela Manual para ficar mais chique
    let y = 100;
    const criteriaList = EVALUATION_CRITERIA[evaluation.level as CapLevel] || [];
    
    criteriaList.forEach((crit) => {
      const status = evaluation.scores[crit.id] || 'pending';
      const statusText = status === 'passed' ? 'Aprovado' : status === 'failed' ? 'Praticar' : 'Pendente';
      
      // Quebra linha se o critério for grande
      const splitText = doc.splitTextToSize(crit.label, 130);
      
      // Retângulo do Critério
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.rect(20, y - 5, 170, (splitText.length * 6) + 6, 'FD');
      
      // Texto
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(splitText, 25, y);
      
      // Badge de Status
      doc.setFont("helvetica", "bold");
      if (status === 'passed') {
        doc.setTextColor(22, 163, 74); // Verde
        doc.text("APROVADO", 160, y);
      } else if (status === 'failed') {
        doc.setTextColor(220, 38, 38); // Vermelho
        doc.text("PRATICAR", 160, y);
      } else {
        doc.setTextColor(148, 163, 184); // Cinza
        doc.text("PENDENTE", 160, y);
      }
      
      y += (splitText.length * 6) + 10;
    });

    // Observações
    if (evaluation.notes) {
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Observações do Professor:", 20, y);
      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const splitNotes = doc.splitTextToSize(evaluation.notes, 170);
      doc.text(splitNotes, 20, y);
      y += (splitNotes.length * 6);
    }

    // Resultado Final - Grandão
    y = Math.max(y + 15, 250);
    doc.setDrawColor(isApproved ? 34 : 220, isApproved ? 197 : 38, isApproved ? 94 : 38);
    doc.setFillColor(isApproved ? 240 : 254, isApproved ? 253 : 226, isApproved ? 244 : 226);
    doc.rect(20, y, 170, 25, 'FD');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    if (isApproved) {
      doc.setTextColor(21, 128, 61);
      doc.text("PARABÉNS! ALUNO APROVADO!", 105, y + 16, { align: "center" });
    } else {
      doc.setTextColor(185, 28, 28);
      doc.text("CONTINUAR PRATICANDO NO PRÓXIMO TRIMESTRE", 105, y + 16, { align: "center" });
    }

    doc.save(`Boletim_${student.name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`);
  };

  const filteredStudents = getFilteredStudents();
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden">
      
      {/* === COLUNA DA ESQUERDA: LISTA DE ALUNOS === */}
      <div className={cn("w-full md:w-96 md:border-r border-slate-200 bg-white flex flex-col transition-all duration-300 absolute md:relative z-10 h-full", selectedStudentId ? "-translate-x-full md:translate-x-0" : "translate-x-0")}>
        <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm shrink-0">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
            <Droplets className="w-5 h-5 text-amber-500" /> Seus Alunos
          </h2>
          {currentUser && currentUser.role !== 'admin' && (
            <p className="text-xs text-slate-500 mt-1 font-medium">Turmas de: {currentUser.data.name || currentUser.data.username}</p>
          )}
          
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Buscar aluno..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <button onClick={() => setFilterLevel('all')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border", filterLevel === 'all' ? "bg-slate-800 text-white border-slate-800 shadow-md" : "bg-white text-slate-600 border-slate-200")}>Todos</button>
              {Object.entries(levels).map(([key, value]) => (
                <button key={key} onClick={() => setFilterLevel(key as CapLevel)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border", filterLevel === key ? `${value.bgClass} border-transparent shadow-md` : "bg-white text-slate-600 border-slate-200")}>
                  {value.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
             <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Buscando alunos na piscina...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium text-sm">Nenhum aluno encontrado na sua grade.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredStudents.map(student => (
                <button key={student.id} onClick={() => setSelectedStudentId(student.id)} className={cn("w-full flex items-center justify-between p-3 rounded-xl transition-all border", selectedStudentId === student.id ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200")}>
                  <div className="flex items-center gap-3 text-left">
                    <div className={cn("w-10 h-10 rounded-full shadow-inner flex items-center justify-center text-white font-bold shrink-0", levels[student.level as CapLevel]?.bgClass || "bg-slate-500")}>
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className={cn("font-bold text-sm", selectedStudentId === student.id ? "text-amber-900" : "text-slate-800")}>{student.name}</h3>
                      <p className="text-xs font-medium text-slate-500">{student.age} anos • Touca {levels[student.level as CapLevel]?.name}</p>
                    </div>
                  </div>
                  <ChevronRight className={cn("w-5 h-5", selectedStudentId === student.id ? "text-amber-500" : "text-slate-300")} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* === COLUNA DA DIREITA: FICHA DE AVALIAÇÃO === */}
      <div className={cn("flex-1 bg-slate-50 flex flex-col h-full transition-transform duration-300 absolute md:relative z-20 w-full", selectedStudentId ? "translate-x-0" : "translate-x-full md:translate-x-0")}>
        
        {selectedStudent ? (
          <div className="flex-1 flex flex-col h-full">
            <div className="p-4 md:p-6 bg-white border-b border-slate-200 flex items-center gap-4 shrink-0 shadow-sm z-10 relative">
              <button onClick={() => setSelectedStudentId(null)} className="md:hidden p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"><ArrowLeft className="w-5 h-5" /></button>
              <div className={cn("w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center text-white font-black text-xl shrink-0", levels[selectedStudent.level as CapLevel]?.bgClass || "bg-slate-500")}>
                {selectedStudent.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 truncate">{selectedStudent.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={cn("px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm text-white", levels[selectedStudent.level as CapLevel]?.bgClass || "bg-slate-500")}>
                    Touca {levels[selectedStudent.level as CapLevel]?.name}
                  </span>
                  <span className="text-slate-400 text-xs font-bold px-2 py-0.5 bg-slate-100 rounded-md">{selectedStudent.age} anos</span>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`https://wa.me/55${selectedStudent.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="p-3 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white rounded-xl transition-colors shadow-sm hidden sm:flex items-center gap-2 font-bold text-sm">
                  <MessageCircle className="w-5 h-5" /> Falar com os Pais
                </a>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-slate-50/50">
              <div className="max-w-4xl mx-auto">
                
                {isEvaluating ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-8">
                    <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-black">Nova Avaliação Trimestral</h3>
                        <p className="text-slate-400 text-sm mt-1">Avaliando os critérios da Touca {levels[selectedStudent.level as CapLevel]?.name}</p>
                      </div>
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <Award className="w-6 h-6 text-amber-400" />
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="space-y-3 mb-8">
                        {EVALUATION_CRITERIA[selectedStudent.level as CapLevel]?.map((crit) => (
                          <div key={crit.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-amber-200 hover:bg-amber-50/30 transition-colors">
                            <span className="text-sm font-bold text-slate-700 leading-relaxed md:w-2/3">{crit.label}</span>
                            <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 md:w-auto shrink-0">
                              <button onClick={() => setEvalScores({...evalScores, [crit.id]: 'passed'})} className={cn("flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all", evalScores[crit.id] === 'passed' ? "bg-green-500 text-white shadow-md scale-105" : "text-slate-400 hover:bg-slate-50")}>✔ Passou</button>
                              <button onClick={() => setEvalScores({...evalScores, [crit.id]: 'failed'})} className={cn("flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all", evalScores[crit.id] === 'failed' ? "bg-red-500 text-white shadow-md scale-105" : "text-slate-400 hover:bg-slate-50")}>✖ Treinar</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mb-8">
                        <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-2"><MessageCircle className="w-4 h-4 text-slate-400" /> Observações Finais</label>
                        <textarea value={evalNotes} onChange={e => setEvalNotes(e.target.value)} placeholder="Destaque as qualidades e o que precisa melhorar..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all min-h-[120px] resize-none" />
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => setIsEvaluating(false)} className="px-6 py-4 bg-white text-slate-600 font-black rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button onClick={() => saveEvaluation(selectedStudent)} className="flex-1 bg-black text-white font-black py-4 rounded-xl shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-lg">
                          <CheckCircle2 className="w-5 h-5" /> Salvar Boletim
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="mb-8 flex justify-center">
                    <button onClick={() => startEvaluation(selectedStudent)} className="w-full md:w-auto px-8 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl shadow-xl shadow-amber-500/30 hover:scale-[1.02] active:scale-95 transition-all font-black text-lg flex items-center justify-center gap-3 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-white/20 w-full translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      <Award className="w-6 h-6" /> Fazer Avaliação do Trimestre
                    </button>
                  </div>
                )}

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                    <History className="w-5 h-5 text-indigo-500" /> Histórico de Boletins
                  </h3>
                  
                  <div className="space-y-6">
                    {evaluations.filter(e => e.student_id === selectedStudent.id).map(evaluation => (
                      <div key={evaluation.id} className="relative bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-shadow group">
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <div className={cn("w-4 h-4 rounded-full shadow-sm", levels[evaluation.level as CapLevel]?.bgClass.split(' ')[0])}></div>
                              <span className="font-black text-slate-800 text-lg uppercase">Touca {levels[evaluation.level as CapLevel]?.name}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-500">{new Date(evaluation.date).toLocaleDateString('pt-BR')} às {new Date(evaluation.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <div className={cn("px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shadow-sm", evaluation.approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                               {evaluation.approved ? <><Award className="w-4 h-4" /> APROVADO</> : "EM TREINAMENTO"}
                             </div>
                             <button onClick={() => exportPDF(evaluation, selectedStudent)} className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl shadow-sm hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-2 text-sm">
                               Gerar PDF
                             </button>
                             {currentUser?.role === 'admin' && (
                               <button onClick={() => deleteEvaluation(evaluation.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                 <Trash2 className="w-5 h-5" />
                               </button>
                             )}
                          </div>
                        </div>

                        {evaluation.notes && (
                          <div className="bg-white p-4 rounded-xl border border-slate-100 mb-4 shadow-sm">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Observações</span>
                            <p className="text-sm font-medium text-slate-700 italic">"{evaluation.notes}"</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                           {EVALUATION_CRITERIA[evaluation.level as CapLevel]?.map(crit => {
                             const status = evaluation.scores[crit.id] || 'pending';
                             return (
                               <div key={crit.id} className="flex items-center gap-3 p-2 text-sm">
                                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 border", status === 'passed' ? "bg-green-100 border-green-200 text-green-600" : status === 'failed' ? "bg-red-100 border-red-200 text-red-600" : "bg-slate-100 border-slate-200 text-slate-400")}>
                                    {status === 'passed' ? '✔' : status === 'failed' ? '✖' : '-'}
                                  </div>
                                  <span className={cn("font-medium", status === 'passed' ? "text-slate-800" : "text-slate-500")}>{crit.label}</span>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    ))}
                    
                    {evaluations.filter(e => e.student_id === selectedStudent.id).length === 0 && (
                      <div className="text-center py-12 px-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <History className="w-6 h-6 text-slate-300" />
                        </div>
                        <h4 className="text-slate-500 font-bold">Nenhum boletim encontrado</h4>
                        <p className="text-slate-400 text-sm mt-1">Faça a primeira avaliação deste aluno.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
             <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6">
               <Droplets className="w-10 h-10 text-amber-300" />
             </div>
             <h2 className="text-2xl font-black text-slate-800 mb-2">Central de Avaliações</h2>
             <p className="text-slate-500 font-medium max-w-md">Selecione um aluno na lista ao lado ou clique no nome dele direto na Grade de Horários para gerar o boletim trimestral.</p>
          </div>
        )}
      </div>

    </div>
  );
}
