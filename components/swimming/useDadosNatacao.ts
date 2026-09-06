'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Student } from '@/types';
import type { Aluno, ClassRow, SlotRow } from './constantes';

/**
 * Carga inicial da Avaliação de Natação e a trava de permissão do professor.
 *
 * Movido do SwimmingModule sem alterar consulta, ordenação ou sequência de
 * chamadas — inclusive o `recarregarAvaliacoes`, que continua sem paginação
 * exatamente como estava.
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
      aoReceberAlunoDeOutraAba(jump);
    }
  };

  useEffect(() => { fetchData(); }, []);

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

  return {
    students, evaluations, classes, slots, allowedIds, currentUser, loading,
    recarregarAvaliacoes, apagarAvaliacao,
  };
}
