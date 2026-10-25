'use client';

import { lerAvaliacoesCompletas, lerTurmas, lerVagas } from '@/lib/dados';
import { useEffect, useState } from 'react';
import { lerAlunos } from '@/lib/alunos';
import { apagarAvaliacao as removerAvaliacao } from '@/lib/avaliacoes';
import type { Aluno, ClassRow, SlotRow } from './constantes';
import { lecionaEm } from '@/lib/professor';

/**
 * Carga inicial da Avaliação de Natação e a trava de permissão do professor.
 *
 * Os alunos vêm do escopo `avaliacao` (`lib/alunos-colunas.ts`): só id,
 * nome, touca, situação e modalidade. Antes era `select('*')` — a tela
 * nunca mostrou telefone, endereço nem as observações de saúde, mas o `*`
 * trazia tudo isso para o navegador DO PROFESSOR, visível na aba Rede do
 * DevTools. A regra da casa é que o professor não tem o contato dos pais;
 * não basta não desenhar na tela, o dado não pode descer até ali. Agora é
 * o servidor que decide, não o componente.
 */
export function useDadosNatacao(aoReceberAlunoDeOutraAba: (id: string) => void) {
  const [students, setStudents] = useState<Aluno[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [allowedIds, setAllowedIds] = useState<string[] | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);

    const sess = JSON.parse(localStorage.getItem('olimpo_session') || 'null');
    setCurrentUser(sess);

    const [std, evl, cls, slt] = await Promise.all([
      lerAlunos('avaliacao'),
      lerAvaliacoesCompletas(),
      lerTurmas(),
      lerVagas(),
    ]);

    // matricula cancelada some da avaliacao. Sem isto, como cancelar libera a
    // vaga, o aluno cairia em 'Avulsos & Wellhub' como se precisasse de turma.
    setStudents((std as Aluno[]).filter(a => (a as any).ativo !== false).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    setEvaluations((evl as any[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setClasses(cls as ClassRow[]);
    setSlots(slt as SlotRow[]);

    // trava do professor: vê os alunos das turmas dele e, além deles, quem não
    // tem turma nenhuma (avulso, wellhub) — esses aparecem em qualquer aula e
    // qualquer professor pode avaliar quando o aluno vier.
    if (sess?.role === 'teacher') {
      const nome = sess.data?.name || sess.data?.username;
      // no sabado teacher_name e a dupla "A / B" — lecionaEm reconhece os dois
      const minhas = new Set((cls as ClassRow[]).filter(c => lecionaEm(c.teacher_name, nome)).map(c => c.id));
      const ids = (slt as SlotRow[]).filter(s => minhas.has(s.class_id) && s.student_id).map(s => s.student_id!);
      const comTurma = new Set((slt as SlotRow[]).filter(s => s.student_id).map(s => s.student_id!));
      const semTurma = (std as Aluno[]).filter(a => !comTurma.has(a.id)).map(a => a.id);
      setAllowedIds([...new Set([...ids, ...semTurma])]);
    } else {
      setAllowedIds('all');
    }
    setLoading(false);

    // veio da Grade de Horários clicando num aluno
    const jump = localStorage.getItem('olympus_jump_eval');
    if (jump) {
      localStorage.removeItem('olympus_jump_eval');
      aoReceberAlunoDeOutraAba(jump);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /**
   * Relê depois de salvar uma avaliação.
   *
   * Agora pagina. Antes não paginava: `evaluations` está em zero hoje, mas
   * são ~429 alunos × 4 trimestres por ano — passa de 1000 linhas no
   * primeiro ano de uso, e o corte do PostgREST não dá erro, só devolve
   * menos. O histórico começaria a sumir da tela sem ninguém notar.
   */
  const recarregarAvaliacoes = async () => {
    const [evl, std] = await Promise.all([
      lerAvaliacoesCompletas(),
      lerAlunos('avaliacao'),
    ]);
    setEvaluations(evl.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setStudents((std as Aluno[]).filter(a => (a as any).ativo !== false).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    return evl;
  };

  const apagarAvaliacao = async (id: string) => {
    if (!confirm('Apagar permanentemente esta avaliação do histórico?')) return;
    try {
      // a rota registra no audit_log DE QUEM era a avaliação antes de
      // apagar: senão apagar a avaliação apagaria o rastro de quem errou
      await removerAvaliacao(id);
    } catch (e: any) {
      return alert('Erro ao apagar: ' + (e?.message || ''));
    }
    recarregarAvaliacoes();
  };

  return {
    students, evaluations, classes, slots, allowedIds, currentUser, loading,
    recarregarAvaliacoes, apagarAvaliacao,
  };
}
