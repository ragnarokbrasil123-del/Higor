'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { capLevelOrder, levels, type CapLevel } from '@/types';
import { EVALUATION_CRITERIA } from '@/lib/evaluation-criteria';
import { TRIMESTRE_ATUAL, draftKey, trimestre, type Aluno } from './constantes';
import { gerarObservacao } from './observacao';

interface Opcoes {
  /** A tela atual do módulo — o rascunho só é gravado enquanto está avaliando. */
  view: 'home' | 'avaliando' | 'aluno';
  alunoPorId: Map<string, Aluno>;
  recarregarAvaliacoes: () => Promise<any[]>;
  /** Chamado por abrir(): quem decide a tela é o módulo. */
  aoIniciar: () => void;
  /** Chamado por encerrar() e sair(). */
  aoSair: () => void;
}

/**
 * Fila de avaliação em sequência: marcação dos critérios, rascunho
 * automático, navegação entre alunos e o salvamento.
 *
 * Movido do SwimmingModule preservando a regra de aprovação e a promoção
 * de touca exatamente como estavam.
 */
export function useFilaAvaliacao({ view, alunoPorId, recarregarAvaliacoes, aoIniciar, aoSair }: Opcoes) {
  const [fila, setFila] = useState<string[]>([]);
  const [filaIdx, setFilaIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [variacaoFrase, setVariacaoFrase] = useState(0);
  const [feito, setFeito] = useState<{ total: number; aprovados: number } | null>(null);
  /** Banner rápido logo após salvar: quem foi salvo e se trocou de touca. */
  const [ultimoSalvo, setUltimoSalvo] = useState<{ nome: string; novaTouca?: string } | null>(null);
  const [sairAberto, setSairAberto] = useState(false);
  /** Ids ja salvos nesta fila — alimenta as bolinhas de progresso. */
  const [salvosNaFila, setSalvosNaFila] = useState<Set<string>>(new Set());
  const [puladosNaFila, setPuladosNaFila] = useState<Set<string>>(new Set());
  const topoRef = useRef<HTMLDivElement>(null);

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

  const abrir = (ids: string[], comeco = 0) => {
    if (!ids.length) return;
    setFila(ids);
    setFilaIdx(comeco);
    setSalvosNaFila(new Set());
    setPuladosNaFila(new Set());
    carregarAluno(ids[comeco]);
    setFeito(null);
    aoIniciar();
  };

  const alunoAtual = fila[filaIdx] ? alunoPorId.get(fila[filaIdx]) : null;
  /** true quando ha marcacao guardada e ainda nao salva no banco. */
  const temRascunho =
    !!alunoAtual &&
    !salvosNaFila.has(alunoAtual.id) &&
    typeof window !== 'undefined' &&
    !!localStorage.getItem(draftKey(alunoAtual.id));
  const criterios = alunoAtual ? EVALUATION_CRITERIA[alunoAtual.level as CapLevel] || [] : [];
  const marcados = criterios.filter(c => scores[c.id] && scores[c.id] !== 'pending').length;
  const passou = criterios.filter(c => scores[c.id] === 'passed').length;

  // o aviso de "salvo" some sozinho
  useEffect(() => {
    if (!ultimoSalvo) return;
    const t = setTimeout(() => setUltimoSalvo(null), 3500);
    return () => clearTimeout(t);
  }, [ultimoSalvo]);

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

  const marcarCriterio = (id: string, valor: 'passed' | 'failed') => setScores({ ...scores, [id]: valor });

  /** Monta a observação a partir do que já está marcado. */
  const gerarSugestao = () => {
    if (!alunoAtual) return;
    const info = levels[alunoAtual.level as CapLevel];
    const aTreinar = criterios.filter(c => scores[c.id] === 'failed').map(c => c.label);
    setNotes(gerarObservacao(alunoAtual.name, info?.label || '', passou, criterios.length, aTreinar, variacaoFrase));
    setVariacaoFrase(v => v + 1);
  };

  /** Vai direto para um aluno da fila (pelas bolinhas). */
  const irParaAluno = (i: number) => {
    if (i === filaIdx || !fila[i]) return;
    setFilaIdx(i);
    carregarAluno(fila[i]);
    topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** Volta um aluno na fila. O que estava marcado ja foi para o rascunho. */
  const voltarAluno = () => {
    if (filaIdx === 0) return;
    const ant = filaIdx - 1;
    setFilaIdx(ant);
    carregarAluno(fila[ant]);
    topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

      // A regra de promoção não muda: passou em todos -> sobe uma touca.
      let novaTouca: string | undefined;
      if (aprovado) {
        const i = capLevelOrder.indexOf(alunoAtual.level);
        if (i >= 0 && i < capLevelOrder.length - 1) {
          const proxima = capLevelOrder[i + 1];
          await supabase.from('students').update({ level: proxima }).eq('id', alunoAtual.id);
          novaTouca = levels[proxima].label;
        }
      }
      setUltimoSalvo({ nome: alunoAtual.name.split(' ')[0], novaTouca });
      setSalvosNaFila(prev => new Set(prev).add(alunoAtual.id));
      setPuladosNaFila(prev => { const n = new Set(prev); n.delete(alunoAtual.id); return n; });
      // avisa o responsável pelo app (o telefone é resolvido no servidor)
      fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: alunoAtual.id }),
      }).catch(() => { /* aviso é acessório: nunca trava o salvamento */ });

      localStorage.removeItem(draftKey(alunoAtual.id));
      setSalvando(false);
    }

    if (pular) setPuladosNaFila(prev => new Set(prev).add(alunoAtual.id));

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

  /** Botão "Voltar para as turmas" da tela de conclusão. */
  const encerrar = () => { aoSair(); setFila([]); setFeito(null); };

  /** Confirmação do diálogo "Sair da avaliação?" — o rascunho fica guardado. */
  const sair = () => { setSairAberto(false); aoSair(); setFila([]); };

  return {
    fila, filaIdx, scores, notes, setNotes, salvando, feito, ultimoSalvo,
    sairAberto, setSairAberto, salvosNaFila, puladosNaFila, topoRef,
    alunoAtual, temRascunho, criterios, marcados, passou,
    abrir, marcarTodos, marcarCriterio, gerarSugestao, irParaAluno, voltarAluno,
    salvarEAvancar, encerrar, sair,
  };
}
