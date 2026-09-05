'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplets, Search, Check, Award, Trash2, MessageCircle, ArrowLeft, History,
  CheckCircle2, X, Clock, Users, ChevronRight, FileText, ListChecks, CalendarDays, Sparkles,
} from 'lucide-react';
import { Student, CapLevel, levels, capLevelOrder } from '@/types';
import { EVALUATION_CRITERIA } from '@/lib/evaluation-criteria';
import { gerarBoletimPDF } from '@/lib/boletim-pdf';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ClassRow { id: string; teacher_name: string; day_of_week: string; start_time: string; end_time: string }
interface SlotRow { id: string; class_id: string; cap_color: string; student_id: string | null }

const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const hhmm = (t: string) => String(t || '').slice(0, 5);
const hojeDia = () => { const d = new Date().getDay(); return DAYS[d === 0 ? 0 : d - 1] || DAYS[0]; };

/** Rótulo do trimestre de uma data: "2026-T3" */
function trimestre(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-T${Math.floor(dt.getMonth() / 3) + 1}`;
}
const TRIMESTRE_ATUAL = trimestre(new Date());
const draftKey = (id: string) => `olimpo_draft_aval_${id}`;

// ------------------------------------------------------------------
// Sugestão automática de observação, a partir do resultado da ficha
// ------------------------------------------------------------------
/** "1. Nado Crawl: Eficiência na respiração." -> "nado Crawl" */
function resumoCriterio(label: string) {
  let s = label.replace(/^\s*\d+\.\s*/, '').trim();
  const i = s.indexOf(':');
  if (i > 0 && i < 40) s = s.slice(0, i);
  s = s.replace(/\.$/, '').trim();
  if (s.length > 55) s = s.slice(0, 52).trimEnd() + '...';
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function listar(itens: string[]) {
  if (itens.length === 0) return '';
  if (itens.length === 1) return itens[0];
  return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
}

function gerarObservacao(
  nomeCompleto: string,
  touca: string,
  passou: number,
  total: number,
  aTreinar: string[],
  variacao: number
) {
  const nome = nomeCompleto.split(' ')[0];
  const curtos = [...new Set(aTreinar.map(resumoCriterio))].slice(0, 3);
  const foco = listar(curtos) || 'os fundamentos ainda em desenvolvimento';
  const pct = total ? passou / total : 0;

  let opcoes: string[];
  if (total > 0 && passou === total) {
    opcoes = [
      `Parabéns, ${nome}! Concluiu todos os ${total} fundamentos da touca ${touca} com segurança e já pode avançar para a próxima touca. Excelente trimestre!`,
      `${nome} completou os ${total} fundamentos da touca ${touca} neste trimestre. Evolução muito consistente nas aulas — parabéns pela dedicação!`,
      `Que trimestre, ${nome}! Todos os fundamentos da touca ${touca} foram alcançados. Seguimos juntos para o próximo desafio!`,
    ];
  } else if (pct >= 0.7) {
    opcoes = [
      `${nome} evoluiu bastante neste trimestre: ${passou} de ${total} fundamentos concluídos. Falta pouco! Vamos reforçar ${foco} nas próximas aulas.`,
      `Ótimo progresso, ${nome}! Já domina ${passou} dos ${total} fundamentos da touca ${touca}. Com mais um pouco de prática em ${foco}, a troca de touca vem.`,
      `${nome} está muito perto: ${passou} de ${total} fundamentos da touca ${touca} já firmes. O foco das próximas aulas é ${foco}.`,
    ];
  } else if (pct >= 0.4) {
    opcoes = [
      `${nome} avançou bem neste trimestre, com ${passou} de ${total} fundamentos concluídos. Vamos seguir trabalhando ${foco} com calma e constância.`,
      `Bom desenvolvimento de ${nome}: ${passou} dos ${total} fundamentos da touca ${touca} já estão firmes. A prioridade agora é ${foco}.`,
      `${nome} está no caminho certo — ${passou} de ${total} fundamentos concluídos. Seguimos praticando ${foco} nas próximas aulas.`,
    ];
  } else {
    opcoes = [
      `${nome} está construindo a base da touca ${touca}, com ${passou} de ${total} fundamentos concluídos. Vamos focar em ${foco} — a presença constante nas aulas faz toda a diferença!`,
      `Neste trimestre ${nome} deu os primeiros passos na touca ${touca} (${passou} de ${total} fundamentos). Seguimos trabalhando ${foco} no ritmo certo, com segurança.`,
      `${nome} está em adaptação na touca ${touca}: ${passou} de ${total} fundamentos concluídos. O trabalho das próximas aulas será ${foco}.`,
    ];
  }
  return opcoes[variacao % opcoes.length];
}

type Aluno = Student & { modalidade?: string | null };

/** Grupos da tela de alunos sem turma fixa. */
const GRUPOS_SEM_TURMA: { key: string; titulo: string; desc: string; cor: string; aviso?: boolean }[] = [
  { key: 'wellhub', titulo: 'Wellhub', desc: 'Agenda conforme a disponibilidade', cor: 'bg-indigo-500' },
  { key: 'avulso', titulo: 'Avulso', desc: 'Agenda conforme a disponibilidade', cor: 'bg-teal-600' },
  { key: 'fixo', titulo: 'Sem turma definida', desc: 'São alunos fixos que ficaram sem horário — vale alocar na Grade', cor: 'bg-amber-500', aviso: true },
];

interface SwimmingModuleProps {
  /**
   * 'turmas'    = avaliação por turma do dia
   * 'sem-turma' = Wellhub, avulsos e quem ficou sem horário
   * 'sabado'    = só as turmas de sábado
   */
  escopo?: 'turmas' | 'sem-turma' | 'sabado';
}

export function SwimmingModule({ escopo = 'turmas' }: SwimmingModuleProps) {
  const semTurmaMode = escopo === 'sem-turma';
  const sabadoMode = escopo === 'sabado';
  const [students, setStudents] = useState<Aluno[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [allowedIds, setAllowedIds] = useState<string[] | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<'home' | 'avaliando' | 'aluno'>('home');
  const [selectedDay, setSelectedDay] = useState<string>(hojeDia());
  const [search, setSearch] = useState('');
  const [filterProf, setFilterProf] = useState<string>('all');
  const [alunoId, setAlunoId] = useState<string | null>(null);

  // filtros da aba Avulsos & Wellhub
  const [filtroGrupo, setFiltroGrupo] = useState<string>('all');
  const [filtroTouca, setFiltroTouca] = useState<string>('all');
  const [soPendentes, setSoPendentes] = useState(false);

  // fila de avaliação em sequência
  const [fila, setFila] = useState<string[]>([]);
  const [filaIdx, setFilaIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [variacaoFrase, setVariacaoFrase] = useState(0);
  const [feito, setFeito] = useState<{ total: number; aprovados: number } | null>(null);
  const topoRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const page = async (t: string, cols: string) => {
      const out: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from(t).select(cols).range(from, from + 999);
        if (!data?.length) break;
        out.push(...data);
        if (data.length < 1000) break;
      }
      return out;
    };

    const sess = JSON.parse(localStorage.getItem('olimpo_session') || 'null');
    setCurrentUser(sess);

    const [std, evl, cls, slt] = await Promise.all([
      page('students', '*'),
      page('evaluations', '*'),
      page('classes', 'id, teacher_name, day_of_week, start_time, end_time'),
      page('class_slots', 'id, class_id, cap_color, student_id'),
    ]);

    setStudents((std as Aluno[]).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    setEvaluations((evl as any[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setClasses(cls as ClassRow[]);
    setSlots(slt as SlotRow[]);

    // trava do professor: só vê os alunos das turmas dele
    if (sess?.role === 'teacher') {
      const nome = sess.data?.name || sess.data?.username;
      const minhas = new Set((cls as ClassRow[]).filter(c => c.teacher_name === nome).map(c => c.id));
      const ids = (slt as SlotRow[]).filter(s => minhas.has(s.class_id) && s.student_id).map(s => s.student_id!);
      setAllowedIds([...new Set(ids)]);
    } else {
      setAllowedIds('all');
    }
    setLoading(false);

    // veio da Grade de Horários clicando num aluno
    const jump = localStorage.getItem('olympus_jump_eval');
    if (jump) {
      localStorage.removeItem('olympus_jump_eval');
      setAlunoId(jump);
      setView('aluno');
    }
  };

  // ---------------------------------------------------------------- derivados
  const isAdmin = currentUser?.role === 'admin';
  const meuNome = currentUser?.data?.name || currentUser?.data?.username || '';
  const podeVer = (id: string) => allowedIds === 'all' || allowedIds.includes(id);

  const alunoPorId = new Map(students.map(s => [s.id, s]));
  const meusAlunos = students.filter(s => podeVer(s.id));

  const ultimaAval = (sid: string) => evaluations.find(e => e.student_id === sid);
  const avaliadoAgora = (sid: string) =>
    evaluations.some(e => e.student_id === sid && trimestre(e.date) === TRIMESTRE_ATUAL);

  const alunosDaTurma = (classId: string) =>
    slots
      .filter(s => s.class_id === classId && s.student_id && podeVer(s.student_id))
      .map(s => alunoPorId.get(s.student_id!))
      .filter(Boolean) as Student[];

  // turmas visíveis (professor vê só as dele) + filtro de professor
  const minhasClasses = classes.filter(c => isAdmin || !meuNome || c.teacher_name === meuNome);
  const profsDisponiveis = [...new Set(minhasClasses.map(c => c.teacher_name))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const classesFiltradas = minhasClasses.filter(c => filterProf === 'all' || c.teacher_name === filterProf);

  // na aba de sábado o dia é fixo
  const diaAtivo = sabadoMode ? 'Sábado' : selectedDay;

  /** alunos que a turma mostra agora (respeita o "só quem falta avaliar") */
  const alunosVisiveis = (classId: string) => {
    const a = alunosDaTurma(classId);
    return soPendentes ? a.filter(s => !avaliadoAgora(s.id)) : a;
  };

  // turmas sem ninguém para mostrar ficam de fora desta tela
  const comAluno = (c: ClassRow) => alunosVisiveis(c.id).length > 0;
  const classesDoDia = classesFiltradas
    .filter(c => c.day_of_week === diaAtivo && comAluno(c))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  /**
   * No sábado os professores giram em escala, então quem dá a aula não é fixo:
   * agrupamos por HORÁRIO, juntando os alunos de todas as turmas daquele horário.
   * Nos outros dias cada turma é um bloco, com o professor.
   */
  const blocosDoDia: { chave: string; hora: string; professor?: string; alunos: Aluno[] }[] = sabadoMode
    ? [...new Set(classesFiltradas.filter(c => c.day_of_week === 'Sábado').map(c => hhmm(c.start_time)))]
        .sort()
        .map(hora => {
          const ids = classesFiltradas.filter(c => c.day_of_week === 'Sábado' && hhmm(c.start_time) === hora).map(c => c.id);
          const vistos = new Set<string>();
          const alunos = ids.flatMap(id => alunosVisiveis(id)).filter(a => !vistos.has(a.id) && vistos.add(a.id));
          return { chave: hora, hora, alunos };
        })
        .filter(b => b.alunos.length > 0)
    : classesDoDia.map(c => ({
        chave: c.id,
        hora: hhmm(c.start_time),
        professor: c.teacher_name,
        alunos: alunosVisiveis(c.id),
      }));

  // alunos sem nenhuma vaga ocupada na grade
  const idsComTurma = new Set(slots.filter(s => s.student_id).map(s => s.student_id!));
  const semTurma = meusAlunos.filter(s => !idsComTurma.has(s.id));

  // filtros da aba Avulsos & Wellhub (aplicados de forma independente para os contadores)
  const passaTouca = (s: Aluno) => filtroTouca === 'all' || s.level === filtroTouca;
  const passaPendente = (s: Aluno) => !soPendentes || !avaliadoAgora(s.id);
  const passaGrupo = (s: Aluno) => filtroGrupo === 'all' || (s.modalidade || 'fixo') === filtroGrupo;

  const semTurmaFiltrado = semTurma.filter(s => passaGrupo(s) && passaTouca(s) && passaPendente(s));
  const toucasPresentes = capLevelOrder.filter(k =>
    semTurma.some(s => s.level === k && passaGrupo(s) && passaPendente(s))
  );

  // o contador do topo respeita o escopo da aba e o filtro de professor
  const alunosDeClasses = (ids: Set<string>) =>
    ([...new Set(slots.filter(s => s.student_id && ids.has(s.class_id)).map(s => s.student_id!))]
      .map(id => alunoPorId.get(id))
      .filter(Boolean) as Aluno[]);

  const idsFiltro = new Set(classesFiltradas.map(c => c.id));
  const idsSabado = new Set(classesFiltradas.filter(c => c.day_of_week === 'Sábado').map(c => c.id));

  const alunosNoEscopo = semTurmaMode
    ? semTurmaFiltrado
    : sabadoMode
      ? alunosDeClasses(idsSabado)
      : filterProf === 'all'
        ? meusAlunos
        : alunosDeClasses(idsFiltro);
  const totalAvaliados = alunosNoEscopo.filter(s => avaliadoAgora(s.id)).length;

  // a busca procura dentro do escopo da aba
  const escopoAtual = semTurmaMode ? semTurmaFiltrado : sabadoMode ? alunosNoEscopo : meusAlunos;

  const buscando = search.trim().length > 0;
  const resultadoBusca = buscando
    ? escopoAtual.filter(s => s.name.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  // ---------------------------------------------------------------- avaliação
  const abrirFila = (ids: string[], comeco = 0) => {
    if (!ids.length) return;
    setFila(ids);
    setFilaIdx(comeco);
    carregarAluno(ids[comeco]);
    setFeito(null);
    setView('avaliando');
  };

  const carregarAluno = (sid: string) => {
    const aluno = alunoPorId.get(sid);
    if (!aluno) return;
    const rascunho = localStorage.getItem(draftKey(sid));
    if (rascunho) {
      try {
        const r = JSON.parse(rascunho);
        setScores(r.scores || {});
        setNotes(r.notes || '');
        return;
      } catch { /* ignora rascunho corrompido */ }
    }
    const inicial: Record<string, string> = {};
    (EVALUATION_CRITERIA[aluno.level as CapLevel] || []).forEach(c => { inicial[c.id] = 'pending'; });
    setScores(inicial);
    setNotes('');
  };

  const alunoAtual = fila[filaIdx] ? alunoPorId.get(fila[filaIdx]) : null;
  const criterios = alunoAtual ? EVALUATION_CRITERIA[alunoAtual.level as CapLevel] || [] : [];
  const marcados = criterios.filter(c => scores[c.id] && scores[c.id] !== 'pending').length;
  const passou = criterios.filter(c => scores[c.id] === 'passed').length;

  // rascunho automático
  useEffect(() => {
    if (view !== 'avaliando' || !alunoAtual) return;
    localStorage.setItem(draftKey(alunoAtual.id), JSON.stringify({ scores, notes }));
  }, [scores, notes, view, alunoAtual?.id]);

  const marcarTodos = (valor: 'passed' | 'pending') => {
    const novo: Record<string, string> = {};
    criterios.forEach(c => { novo[c.id] = valor; });
    setScores(novo);
  };

  const salvarEAvancar = async (pular = false) => {
    if (!alunoAtual) return;

    if (!pular) {
      if (marcados === 0) return alert('Marque pelo menos um critério, ou use "Pular".');
      setSalvando(true);
      const aprovado = passou === criterios.length && criterios.length > 0;
      const { error } = await supabase.from('evaluations').insert([{
        student_id: alunoAtual.id,
        date: new Date().toISOString(),
        level: alunoAtual.level,
        scores,
        notes,
        approved: aprovado,
      }]);
      if (error) { setSalvando(false); return alert('Erro ao salvar: ' + error.message); }

      if (aprovado) {
        const i = capLevelOrder.indexOf(alunoAtual.level);
        if (i >= 0 && i < capLevelOrder.length - 1) {
          await supabase.from('students').update({ level: capLevelOrder[i + 1] }).eq('id', alunoAtual.id);
        }
      }
      // avisa o responsável pelo app (o telefone é resolvido no servidor)
      fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: alunoAtual.id }),
      }).catch(() => { /* aviso é acessório: nunca trava o salvamento */ });

      localStorage.removeItem(draftKey(alunoAtual.id));
      setSalvando(false);
    }

    const prox = filaIdx + 1;
    if (prox < fila.length) {
      setFilaIdx(prox);
      carregarAluno(fila[prox]);
      topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const dados = await recarregarAvaliacoes();
      const aprovados = fila.filter(id => dados.some((e: any) => e.student_id === id && e.approved && trimestre(e.date) === TRIMESTRE_ATUAL)).length;
      setFeito({ total: fila.length, aprovados });
    }
  };

  const recarregarAvaliacoes = async () => {
    const { data: evl } = await supabase.from('evaluations').select('*');
    const { data: std } = await supabase.from('students').select('*');
    if (evl) setEvaluations((evl as any[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    if (std) setStudents((std as Student[]).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    return evl || [];
  };

  const apagarAvaliacao = async (id: string) => {
    if (!confirm('Apagar permanentemente esta avaliação do histórico?')) return;
    await supabase.from('evaluations').delete().eq('id', id);
    recarregarAvaliacoes();
  };

  // ================================================================ selo
  const Selo = ({ sid }: { sid: string }) => {
    const ok = avaliadoAgora(sid);
    const ult = ultimaAval(sid);
    return ok ? (
      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded whitespace-nowrap">
        ✓ {new Date(ult!.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
      </span>
    ) : (
      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap">pendente</span>
    );
  };

  // ================================================================ RENDER
  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50"><p className="text-slate-400 font-bold animate-pulse">Carregando avaliações...</p></div>;
  }

  // ---------------------------------------------------- MODO AVALIANDO
  if (view === 'avaliando') {
    if (feito) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Turma avaliada!</h2>
          <p className="text-slate-500 font-medium mt-2">
            {feito.total} aluno(s) concluído(s){feito.aprovados > 0 && <> · <b className="text-emerald-600">{feito.aprovados} trocaram de touca 🏅</b></>}
          </p>
          <button onClick={() => { setView('home'); setFila([]); setFeito(null); }} className="mt-8 px-8 py-4 bg-slate-900 text-white font-black rounded-2xl active:scale-95 transition-transform">
            Voltar para as turmas
          </button>
        </div>
      );
    }

    if (!alunoAtual) return null;
    const info = levels[alunoAtual.level as CapLevel];

    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto custom-scrollbar" ref={topoRef}>
        {/* cabeçalho fixo */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-3xl mx-auto p-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { if (confirm('Sair da avaliação? O que você marcou fica salvo como rascunho.')) { setView('home'); setFila([]); } }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black shrink-0', info?.bgClass)}>
                {alunoAtual.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-slate-800 leading-tight truncate">{alunoAtual.name}</h2>
                <p className="text-xs font-bold text-slate-500">Touca {info?.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-black text-slate-800">Aluno {filaIdx + 1} de {fila.length}</p>
                <p className="text-[11px] font-bold text-slate-400">{marcados} de {criterios.length} marcados</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${criterios.length ? (marcados / criterios.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto w-full p-4 space-y-4 pb-32">
          <div className="flex gap-2">
            <button onClick={() => marcarTodos('passed')} className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Check className="w-4 h-4" strokeWidth={3} /> Marcar todos como Passou
            </button>
            <button onClick={() => marcarTodos('pending')} className="px-5 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-sm active:scale-95 transition-transform">
              Limpar
            </button>
          </div>

          {criterios.map(crit => {
            const st = scores[crit.id] || 'pending';
            return (
              <div key={crit.id} className={cn('bg-white rounded-2xl border p-4 transition-colors',
                st === 'passed' ? 'border-emerald-300 bg-emerald-50/40' : st === 'failed' ? 'border-red-200 bg-red-50/30' : 'border-slate-200')}>
                <p className="text-sm font-bold text-slate-700 leading-snug mb-3">{crit.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setScores({ ...scores, [crit.id]: 'passed' })} className={cn('py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2',
                    st === 'passed' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50')}>
                    <Check className="w-4 h-4" strokeWidth={3} /> Passou
                  </button>
                  <button onClick={() => setScores({ ...scores, [crit.id]: 'failed' })} className={cn('py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2',
                    st === 'failed' ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-red-50')}>
                    <X className="w-4 h-4" strokeWidth={3} /> Treinar
                  </button>
                </div>
              </div>
            );
          })}

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Observações para os pais
              </label>
              <button
                type="button"
                disabled={marcados === 0}
                onClick={() => {
                  const aTreinar = criterios.filter(c => scores[c.id] === 'failed').map(c => c.label);
                  setNotes(gerarObservacao(alunoAtual.name, info?.label || '', passou, criterios.length, aTreinar, variacaoFrase));
                  setVariacaoFrase(v => v + 1);
                }}
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-black flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5" /> {notes ? 'Gerar outra' : 'Gerar sugestão'}
              </button>
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Escreva, ou toque em “Gerar sugestão” para criar a partir do resultado." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[110px] resize-y" />
            {marcados === 0 && (
              <p className="text-[11px] font-bold text-slate-400 mt-2">Marque os critérios acima para liberar a sugestão.</p>
            )}
          </div>
        </div>

        {/* rodapé fixo */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
          <div className="max-w-3xl mx-auto flex gap-2">
            <button onClick={() => salvarEAvancar(true)} className="px-5 py-4 bg-white border border-slate-200 text-slate-500 font-bold rounded-xl text-sm active:scale-95 transition-transform">
              Pular
            </button>
            <button onClick={() => salvarEAvancar(false)} disabled={salvando} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
              {salvando ? 'Salvando...' : filaIdx + 1 < fila.length ? <>Salvar e próximo <ChevronRight className="w-5 h-5" /></> : <>Salvar e finalizar <CheckCircle2 className="w-5 h-5" /></>}
            </button>
          </div>
          {passou === criterios.length && criterios.length > 0 && (
            <p className="max-w-3xl mx-auto text-center text-[11px] font-bold text-emerald-600 mt-2">
              🏅 Passou em tudo — ao salvar, o aluno troca de touca automaticamente.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------- FICHA DO ALUNO
  if (view === 'aluno' && alunoId) {
    const aluno = alunoPorId.get(alunoId);
    if (!aluno) { setView('home'); return null; }
    const info = levels[aluno.level as CapLevel];
    const hist = evaluations.filter(e => e.student_id === aluno.id);

    return (
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-slate-50">
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
          <button onClick={() => setView('home')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0', info?.bgClass)}>
              {aluno.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-slate-800 truncate">{aluno.name}</h1>
              <p className="text-sm font-bold text-slate-500">Touca {info?.name}</p>
              <div className="mt-1"><Selo sid={aluno.id} /></div>
            </div>
          </div>

          <button onClick={() => abrirFila([aluno.id])} className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-lg shadow-amber-500/30 font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform">
            <Award className="w-6 h-6" /> Fazer avaliação
          </button>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-black text-slate-800 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <History className="w-5 h-5 text-indigo-500" /> Histórico
            </h3>
            {hist.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhuma avaliação registrada.</p>
            ) : (
              <div className="space-y-4">
                {hist.map(ev => (
                  <div key={ev.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="font-black text-slate-800">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                        <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white', levels[ev.level as CapLevel]?.bgClass)}>
                          Touca {levels[ev.level as CapLevel]?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('px-3 py-1.5 rounded-lg text-xs font-black', ev.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                          {ev.approved ? 'APROVADO' : 'EM TREINAMENTO'}
                        </span>
                        <button onClick={() => gerarBoletimPDF(ev, aluno.name)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform">
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                        {isAdmin && (
                          <button onClick={() => apagarAvaliacao(ev.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                    {ev.notes && <p className="text-sm italic text-slate-600 bg-white border border-slate-100 rounded-xl p-3 mb-3">"{ev.notes}"</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {(EVALUATION_CRITERIA[ev.level as CapLevel] || []).map(c => {
                        const st = ev.scores?.[c.id] || 'pending';
                        return (
                          <div key={c.id} className="flex items-start gap-2 text-xs">
                            <div className={cn('w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black',
                              st === 'passed' ? 'bg-emerald-100 text-emerald-600' : st === 'failed' ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400')}>
                              {st === 'passed' ? '✔' : st === 'failed' ? '✖' : '–'}
                            </div>
                            <span className={st === 'passed' ? 'text-slate-700' : 'text-slate-500'}>{c.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------- HOME (turmas do dia)
  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-5">

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Droplets className="w-7 h-7 text-amber-500" /> {semTurmaMode ? 'Avulsos & Wellhub' : sabadoMode ? 'Avaliação de Sábado' : 'Avaliação'}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {semTurmaMode
                ? <>Alunos sem horário fixo na grade · trimestre {TRIMESTRE_ATUAL}</>
                : <>{sabadoMode ? 'Agrupado por horário' : filterProf !== 'all' ? filterProf : isAdmin ? 'Todas as turmas' : `Turmas de ${meuNome || 'você'}`} · trimestre {TRIMESTRE_ATUAL}</>}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
            <p className="text-2xl font-black text-slate-800 leading-none">
              {totalAvaliados}<span className="text-slate-300"> / {alunosNoEscopo.length}</span>
            </p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">alunos avaliados</p>
          </div>
        </header>

        {/* busca + filtro de professor */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar aluno pelo nome..."
              className="w-full pl-9 pr-9 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-4 h-4" /></button>}
          </div>
          {!semTurmaMode && !sabadoMode && profsDisponiveis.length > 1 && (
            <select value={filterProf} onChange={e => setFilterProf(e.target.value)}
              className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm md:max-w-[300px]">
              <option value="all">Todos os professores ({profsDisponiveis.length})</option>
              {profsDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>

        {!semTurmaMode && filterProf !== 'all' && (
          <button onClick={() => setFilterProf('all')} className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
            Filtrando por {filterProf.split(' ')[0]} <X className="w-3.5 h-3.5" />
          </button>
        )}

        {buscando ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-50">
            {resultadoBusca.length === 0 ? (
              <p className="p-8 text-center text-slate-400 font-medium text-sm">Nenhum aluno encontrado.</p>
            ) : resultadoBusca.map(s => (
              <button key={s.id} onClick={() => { setAlunoId(s.id); setView('aluno'); }} className="w-full flex items-center gap-3 p-3.5 hover:bg-slate-50 transition-colors text-left">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0', levels[s.level as CapLevel]?.bgClass)}>{s.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{s.name}</p>
                  <p className="text-xs text-slate-500">Touca {levels[s.level as CapLevel]?.label}</p>
                </div>
                <Selo sid={s.id} />
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        ) : semTurmaMode ? (
          /* ---------- Avulsos, Wellhub e quem ficou sem horário ---------- */
          <div className="space-y-4">

            {/* filtros */}
            <div className="space-y-2.5">
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                {[{ key: 'all', titulo: 'Todos' }, ...GRUPOS_SEM_TURMA].map(g => {
                  const n = g.key === 'all'
                    ? semTurma.filter(s => passaTouca(s) && passaPendente(s)).length
                    : semTurma.filter(s => (s.modalidade || 'fixo') === g.key && passaTouca(s) && passaPendente(s)).length;
                  if (g.key !== 'all' && n === 0 && filtroGrupo !== g.key) return null;
                  return (
                    <button key={g.key} onClick={() => setFiltroGrupo(g.key)} className={cn(
                      'px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border transition-all flex items-center gap-2',
                      filtroGrupo === g.key ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200')}>
                      {g.titulo}
                      <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded', filtroGrupo === g.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{n}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                <button onClick={() => setFiltroTouca('all')} className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border transition-all',
                  filtroTouca === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200')}>
                  Todas as toucas
                </button>
                {toucasPresentes.map(k => {
                  const n = semTurma.filter(s => s.level === k && passaGrupo(s) && passaPendente(s)).length;
                  return (
                    <button key={k} onClick={() => setFiltroTouca(k)} className={cn(
                      'px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border transition-all flex items-center gap-2',
                      filtroTouca === k ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200')}>
                      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', levels[k].bgClass)} />
                      {levels[k].label}
                      <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded', filtroTouca === k ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{n}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setSoPendentes(v => !v)}>
                  <button type="button" className={cn('w-9 h-5 rounded-full relative transition-colors shrink-0', soPendentes ? 'bg-amber-500' : 'bg-slate-300')}>
                    <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', soPendentes ? 'left-[18px]' : 'left-0.5')} />
                  </button>
                  <span className="text-xs font-bold text-slate-600">Só quem falta avaliar</span>
                </div>
                <div className="flex items-center gap-3">
                  {(filtroGrupo !== 'all' || filtroTouca !== 'all' || soPendentes) && (
                    <button onClick={() => { setFiltroGrupo('all'); setFiltroTouca('all'); setSoPendentes(false); }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
                      Limpar filtros <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <p className="text-xs font-bold text-slate-400">{semTurmaFiltrado.length} aluno(s)</p>
                </div>
              </div>
            </div>

            {semTurmaFiltrado.length === 0 && semTurma.length > 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
                <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700">Nada com esses filtros</h3>
                <p className="text-slate-400 text-sm mt-1">Toque em "Limpar filtros" para ver todos.</p>
              </div>
            )}

            {semTurma.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
                <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700">Todo mundo está alocado numa turma</h3>
                <p className="text-slate-400 text-sm mt-1">Nenhum aluno sem horário definido no momento.</p>
              </div>
            ) : GRUPOS_SEM_TURMA.map(g => {
              const doGrupo = semTurmaFiltrado.filter(s => (s.modalidade || 'fixo') === g.key);
              if (doGrupo.length === 0) return null;
              const pend = doGrupo.filter(s => !avaliadoAgora(s.id));
              return (
                <div key={g.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-50">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-black text-sm shrink-0">
                      <span className={cn('w-2.5 h-2.5 rounded-full', g.cor)} />
                      {g.titulo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[11px] font-bold truncate', g.aviso ? 'text-amber-700' : 'text-slate-500')}>{g.desc}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {capLevelOrder.filter(k => doGrupo.some(a => a.level === k)).map(t => (
                          <span key={t} className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white', levels[t].bgClass)}>
                            {levels[t].label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{doGrupo.length}</span>
                      {pend.length > 0 ? (
                        <button onClick={() => abrirFila(pend.map(a => a.id))} className="px-4 py-2.5 bg-amber-500 text-black font-black rounded-xl text-xs active:scale-95 transition-transform flex items-center gap-1.5">
                          <ListChecks className="w-4 h-4" /> Avaliar {pend.length}
                        </button>
                      ) : (
                        <span className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> completo
                        </span>
                      )}
                    </div>
                  </div>

                  {g.aviso && (
                    <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
                      <CalendarDays className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-medium text-amber-800">
                        Estes alunos são de turma fixa mas ficaram sem horário — o dia/hora da planilha não bateu com nenhum professor.
                        Dá pra alocar cada um na aba <b>Alunos</b> → <b>Abrir ficha</b>.
                      </p>
                    </div>
                  )}

                  <div className="divide-y divide-slate-50">
                    {doGrupo.map(a => (
                      <button key={a.id} onClick={() => { setAlunoId(a.id); setView('aluno'); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                        <div className={cn('w-2 h-2 rounded-full shrink-0', levels[a.level as CapLevel]?.bgClass)} />
                        <span className="flex-1 text-sm font-medium text-slate-700 truncate">{a.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
                          {levels[a.level as CapLevel]?.label}
                        </span>
                        <Selo sid={a.id} />
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* dias — na aba de sábado o dia é fixo, então não aparecem */}
            {!sabadoMode && (
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                {DAYS.map(d => {
                  const n = classesFiltradas.filter(c => c.day_of_week === d && comAluno(c)).length;
                  return (
                    <button key={d} onClick={() => setSelectedDay(d)} className={cn('px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border transition-all flex items-center gap-2',
                      selectedDay === d ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200')}>
                      {d.split('-')[0]}
                      <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded', selectedDay === d ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{n}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* só quem falta avaliar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setSoPendentes(v => !v)}>
                <button type="button" className={cn('w-9 h-5 rounded-full relative transition-colors shrink-0', soPendentes ? 'bg-amber-500' : 'bg-slate-300')}>
                  <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', soPendentes ? 'left-[18px]' : 'left-0.5')} />
                </button>
                <span className="text-xs font-bold text-slate-600">Só quem falta avaliar</span>
              </div>
              <p className="text-xs font-bold text-slate-400">
                {blocosDoDia.length} {sabadoMode ? 'horário(s)' : 'turma(s)'}
              </p>
            </div>

            {blocosDoDia.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
                <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700">
                  {soPendentes ? 'Nada pendente' : 'Ninguém com aula'} em {diaAtivo.split('-')[0]}
                  {!sabadoMode && filterProf !== 'all' && <> para {filterProf.split(' ')[0]}</>}
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  {soPendentes
                    ? 'Todo mundo já foi avaliado neste trimestre. Desligue o filtro para ver todos.'
                    : sabadoMode ? 'Busque o aluno pelo nome.' : 'Escolha outro dia, troque o professor ou busque o aluno pelo nome.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {blocosDoDia.map(bloco => {
                  const alunos = bloco.alunos;
                  const pend = alunos.filter(a => !avaliadoAgora(a.id));
                  const toucas = capLevelOrder.filter(k => alunos.some(a => a.level === k));
                  return (
                    <div key={bloco.chave} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-50">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-black text-sm shrink-0">
                          <Clock className="w-3.5 h-3.5" /> {bloco.hora}
                        </div>
                        <div className="flex-1 min-w-0">
                          {bloco.professor && isAdmin && <p className="text-[11px] font-bold text-slate-500 truncate">{bloco.professor}</p>}
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {toucas.map(t => (
                              <span key={t} className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white', levels[t].bgClass)}>
                                {levels[t].label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{alunos.length}</span>
                          {pend.length > 0 && (
                            <button onClick={() => abrirFila(pend.map(a => a.id))} className="px-4 py-2.5 bg-amber-500 text-black font-black rounded-xl text-xs active:scale-95 transition-transform flex items-center gap-1.5">
                              <ListChecks className="w-4 h-4" /> Avaliar {pend.length}
                            </button>
                          )}
                          {alunos.length > 0 && pend.length === 0 && (
                            <span className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> completa
                            </span>
                          )}
                        </div>
                      </div>

                      {alunos.length > 0 && (
                        <div className="divide-y divide-slate-50">
                          {alunos.map(a => (
                            <button key={a.id} onClick={() => { setAlunoId(a.id); setView('aluno'); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                              <div className={cn('w-2 h-2 rounded-full shrink-0', levels[a.level as CapLevel]?.bgClass)} />
                              <span className="flex-1 text-sm font-medium text-slate-700 truncate">{a.name}</span>
                              <Selo sid={a.id} />
                              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
