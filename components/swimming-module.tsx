'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Search, Check, Award, ChevronRight, Filter, Trash2, MessageCircle, Edit, ArrowLeft, PlusCircle, History, Lock, CheckCircle2 } from 'lucide-react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { jsPDF } from 'jspdf';
import { Student, CapLevel, levels } from '@/types';
import { supabase } from '@/lib/supabase';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

// === MODELOS DE AVALIAÇÃO OFICIAIS 100% ATUALIZADOS ===
const EVALUATION_CRITERIA: Record<string, { id: string; label: string }[]> = {
  yellow: [
    { id: 'y1', label: '1. Adaptação poli sensorial: A colocar o rosto na água, executa a respiração pela boca ou nariz ou os dois.' },
    { id: 'y2', label: '2. A criança deve ser capaz de flutuar com apoio de um adulto ou de um objeto flutuante.' },
    { id: 'y3', label: '3. Chutar com os pés enquanto está segurando na borda da piscina.' },
    { id: 'y4', label: '4. A criança deve ser capaz de realizar movimentos básicos de braços e pernas, como movimentos de remo e pedalada.' },
    { id: 'y5', label: '5. Flutuar sem apoio por 5 segundos.' },
    { id: 'y6', label: '6. Nadar 2 metros sem apoio.' },
    { id: 'y7', label: '7. Executar uma virada básica: como a transição de costas para bruços.' },
    { id: 'y8', label: '8. Flutuar de costas sem apoio.' },
    { id: 'y9', label: '9. Chutar com os pés sem apoio.' },
    { id: 'y10', label: '10. Explorar o meio aquático, resgatando objetos submersos com ou sem auxílio.' }
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
    { id: 'o10', label: '10. Saída da água: Capacidade de sair da água de forma segura.' }
  ],
  red: [
    { id: 'r1', label: '1. Nado Crawl: Posição hidro dinâmica (deslizar na posição ventral).' },
    { id: 'r2', label: '2. Nado Crawl: Eficiência na movimentação de pernas.' },
    { id: 'r3', label: '3. Nado Crawl: Eficiência na movimentação de braços.' },
    { id: 'r4', label: '4. Nado Crawl: Eficiência na respiração unilateral.' },
    { id: 'r5', label: '5. Nado Crawl: Atravessar a piscina com coordenação e eficiência com movimentos globais.' },
    { id: 'r6', label: '6. Nado Crawl: Saltar da borda.' },
    { id: 'r7', label: '7. Nado Costas: Posição hidrodinâmica (deslizar na posição dorsal).' },
    { id: 'r8', label: '8. Nado Costas: Eficiência na movimentação de pernas.' },
    { id: 'r9', label: '9. Nado Costas: Eficiência na movimentação de braços.' },
    { id: 'r10', label: '10. Nado Costas: Coordenção do nado costas.' },
    { id: 'r11', label: '11. Iniciação Nado Peito: Eficiência no braço do nado peito.' }
  ],
  green: [
    { id: 'g1', label: '1. Crawl e Costas: com técnica aperfeiçoada.' },
    { id: 'g2', label: '2. Respiração: crawl 2x1 e 3x1 / Costas Inspira pela boca e expira pelo nariz.' },
    { id: 'g3', label: '3. Saídas: Crawl e Costas com técnica e mantém o nado até a borda da piscina.' },
    { id: 'g4', label: '4. Salto: Executa a saída da borda ou do bloco e pressegue com o nado até a borda final da piscina.' },
    { id: 'g5', label: '5. Nado peito: pernas e braços (tecnica rudimentar).' },
    { id: 'g6', label: '6. Nado peito: submerso 12,5 a 15 metros.' },
    { id: 'g7', label: '7. Nado peito: pernas e braços com Coordenação e propulsão (rudimentar).' },
    { id: 'g8', label: '8. Borboleta: Executa a perna do nado (rudimentar).' },
    { id: 'g9', label: '9. Crawl e Costas: 25 metros mantendo a técnica aperfeiçoada.' },
    { id: 'g10', label: '10. Peito: 12,5 metros, nado completo mantendo a técnica rudimentar.' }
  ],
  lightBlue: [
    { id: 'lb1', label: '1. Executa nado peito com saída Filipina.' },
    { id: 'lb2', label: '2. Executa braçada do nado borboleta com variações de pernas.' },
    { id: 'lb3', label: '3. Executa o nado borboleta rudimentar.' },
    { id: 'lb4', label: '4. 15 metros de ondulação dorsal.' },
    { id: 'lb5', label: '5. 15 metros nado peito com saída Filipina.' },
    { id: 'lb6', label: '6. 12,5 metros de borboleta rudimentar.' },
    { id: 'lb7', label: '7. Executa o medley rudimentar.' },
    { id: 'lb8', label: '8. Executa a virada olímpica rudmentar nado crawl.' },
    { id: 'lb9', label: '9. Sustentação com Palmateios na posição ventral.' },
    { id: 'lb10', label: '10. 15 metros de ondulação submersa frontal.' }
  ],
  darkBlue: [
    { id: 'db1', label: '1. Nado crawl e costas 100 metros, 50 metros nado peito.' },
    { id: 'db2', label: '2. Nado borboleta 25 metros.' },
    { id: 'db3', label: '3. Salta da plataforma na posição correta (sem exigencia de perfeição).' },
    { id: 'db4', label: '4. Saída e viradas dos 4 nados.' },
    { id: 'db5', label: '5. Respiração técnica dos 4 nados.' },
    { id: 'db6', label: '6. Os 4 nados executados com tecnicas aperfeiçoadas.' },
    { id: 'db7', label: '7. Executa o Medley (rudimentar).' },
    { id: 'db8', label: '8. Nadar 12,5 metros em apneia.' },
    { id: 'db9', label: '9. Preparado para nadar em piscina semi olímpica e olímpica.' },
    { id: 'db10', label: '10. Nadar 250 metros crawl em 7 minutos.' }
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
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<CapLevel | 'all'>('all');
  
  // Controle de Visualização do Professor
  const [allowedStudentIds, setAllowedStudentIds] = useState<string[] | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados do Formulário de Avaliação
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalScores, setEvalScores] = useState<Record<string, any>>({});
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
      const { data: myClasses } = await supabase.from('classes').select('id').eq('teacher_name', teacherName);
      if (myClasses && myClasses.length > 0) {
        const classIds = myClasses.map(c => c.id);
        const { data: mySlots } = await supabase.from('class_slots').select('student_id').in('class_id', classIds);
        
        if (mySlots) {
          const myStudentIds = mySlots.map(s => s.student_id).filter(Boolean) as string[];
          setAllowedStudentIds(myStudentIds);
        } else {
          setAllowedStudentIds([]); 
        }
      } else {
        setAllowedStudentIds([]); 
      }
    } else {
      setAllowedStudentIds('all'); 
    }

    if (stdData) setStudents(stdData);
    if (evlData) setEvaluations(evlData);
    setLoading(false);
  };

  const getFilteredStudents = () => {
    return students.filter(s => {
      if (allowedStudentIds !== 'all' && !allowedStudentIds.includes(s.id)) return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterLevel !== 'all' && s.level !== filterLevel) return false;
      return true;
    });
  };

  const startEvaluation = (student: Student) => {
    setIsEvaluating(true);
    const initialScores: Record<string, any> = {};
    EVALUATION_CRITERIA[student.level as string]?.forEach(crit => {
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
        alert(`🎉 AVALIAÇÃO CONCLUÍDA! O aluno passou para a Touca ${levels[nextLevel as CapLevel]?.name || 'Seguinte'}!`);
      } else {
        alert('🎉 AVALIAÇÃO CONCLUÍDA! Aluno aprovado (Nível Máximo atingido)!');
      }
    } else {
      alert('Avaliação salva. O aluno precisa continuar praticando alguns fundamentos.');
    }

    setIsEvaluating(false);
    fetchData(); 
  };

  const deleteEvaluation = async (id: string) => {
    if (!confirm("Apagar permanentemente esta avaliação do histórico?")) return;
    await supabase.from('evaluations').delete().eq('id', id);
    fetchData();
  };

  const exportPDF = (evaluation: any, student: Student) => {
    const doc = new jsPDF();
    const isApproved = evaluation.approved;
    
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("CLUBE OLIMPO", 105, 20, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Boletim de Avaliação Trimestral - Natação", 105, 30, { align: "center" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Aluno: ${student.name}`, 20, 55);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Nível Avaliado: Touca ${levels[evaluation.level as CapLevel]?.name || 'Avaliada'}`, 20, 65);
    doc.text(`Data: ${new Date(evaluation.date).toLocaleDateString('pt-BR')}`, 20, 72);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Critérios Avaliados:", 20, 90);
    
    let y = 100;
    const criteriaList = EVALUATION_CRITERIA[evaluation.level as string] || [];
    
    criteriaList.forEach((crit) => {
      const status = evaluation.scores[crit.id] || 'pending';
      const splitText = doc.splitTextToSize(crit.label, 130);
      
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.rect(20, y - 5, 170, (splitText.length * 6) + 6, 'FD');
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(splitText, 25, y);
      
      doc.setFont("helvetica", "bold");
      if (status === 'passed') {
        doc.setTextColor(22, 163, 74); 
        doc.text("APROVADO", 160, y);
      } else if (status === 'failed') {
        doc.setTextColor(220, 38, 38); 
        doc.text("PRATICAR", 160, y);
      } else {
        doc.setTextColor(148, 163, 184); 
        doc.text("PENDENTE", 160, y);
      }
      
      y += (splitText.length * 6) + 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    if (evaluation.notes) {
      y += 5;
      if (y > 270) { doc.addPage(); y = 20; }
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

    y = Math.max(y + 15, 250);
    if (y > 270) { doc.addPage(); y = 20; }
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
                    Touca {levels[selectedStudent.level as CapLevel]?.name || 'N/A'}
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
                        {EVALUATION_CRITERIA[selectedStudent.level as string]?.map((crit) => (
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
                           {EVALUATION_CRITERIA[evaluation.level as string]?.map(crit => {
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
