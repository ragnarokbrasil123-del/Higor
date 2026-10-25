import { capLevelOrder } from '@/types';
import type { DadosPainel, Tendencia } from './tipos';
import { num } from './formato';

/* ============================================================
   O cálculo do Painel, extraído do componente.

   É função PURA: entra o que foi carregado, sai o resumo. Não
   toca em React, estado nem rede — o componente só envolve a
   chamada num useMemo.

   A regra de ouro desta tela continua valendo aqui: NENHUM número
   é inventado. Tudo é contado a partir do que veio do banco, e o
   que não dá para contar fica de fora (a `tendencia` só existe
   quando há mês anterior com o que comparar).
   ============================================================ */

/** Índice = getDay() do JavaScript, por isso começa no domingo. */
export const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export function calcularResumo(dados: DadosPainel | null) {
  if (!dados) return null;
  const { alunos, avals, turmas, vagas, equipe, limpeza, manut } = dados;

  // --- turmas e alocação ---
  const ocupadas = vagas.filter(v => v.student_id);
  const comTurma = new Set(ocupadas.map(v => v.student_id as string));
  const turmasComAluno = new Set(ocupadas.map(v => v.class_id));
  const semTurma = alunos.filter(a => !comTurma.has(a.id));
  // wellhub e avulso não têm turma fixa por natureza; "fixo" sem turma é erro de cadastro
  const fixosSemTurma = semTurma.filter(a => (a.modalidade ?? 'fixo') === 'fixo');
  const turmasVazias = turmas.filter(t => !turmasComAluno.has(t.id));
  const ocupacao = vagas.length ? Math.round((ocupadas.length / vagas.length) * 100) : 0;

  // --- agenda de hoje ---
  const agora = new Date();
  const nomeHoje = DIAS[agora.getDay()];
  const turmasHoje = turmas.filter(t => t.day_of_week === nomeHoje);
  const idsHoje = new Set(turmasHoje.map(t => t.id));
  const alunosHoje = new Set(ocupadas.filter(v => idsHoje.has(v.class_id)).map(v => v.student_id)).size;

  // --- avaliações ---
  const avaliados = new Set(avals.map(a => a.student_id));
  const pendentes = alunos.filter(a => !avaliados.has(a.id)).length;
  const aprovadas = avals.filter(a => a.approved).length;
  const taxaAprovacao = avals.length ? Math.round((aprovadas / avals.length) * 100) : null;

  const chaveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const mesAtual = chaveMes(agora);
  const mesPassado = chaveMes(new Date(agora.getFullYear(), agora.getMonth() - 1, 1));
  const noMes = avals.filter(a => a.date?.slice(0, 7) === mesAtual).length;
  const noMesPassado = avals.filter(a => a.date?.slice(0, 7) === mesPassado).length;

  // tendência só quando existe com o que comparar — senão fica de fora
  let tendencia: Tendencia | undefined;
  if (noMes || noMesPassado) {
    const dif = noMes - noMesPassado;
    tendencia = {
      sentido: dif > 0 ? 'sobe' : dif < 0 ? 'desce' : 'igual',
      texto: dif === 0 ? 'igual ao mês passado' : `${dif > 0 ? '+' : ''}${num(dif)} vs. mês passado`,
    };
  }

  // últimos 6 meses, sempre reais (zerados enquanto não houver ficha salva)
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
    return {
      chave: chaveMes(d),
      rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      total: avals.filter(a => a.date?.slice(0, 7) === chaveMes(d)).length,
    };
  });

  // --- toucas (dado real, independe de avaliação) ---
  const porTouca = capLevelOrder
    .map(k => ({ chave: k, total: alunos.filter(a => a.level === k).length }))
    .filter(t => t.total > 0);
  const maiorTouca = Math.max(1, ...porTouca.map(t => t.total));

  // --- equipe e operação ---
  const profsSemLogin = equipe.filter(u => u.role === 'teacher' && !u.username && u.active !== false);
  const manutAberta = manut.filter(t => !t.completed);

  const nomePorId = new Map(alunos.map(a => [a.id, a.name]));
  const ultimasAvals = [...avals]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 5)
    .map(a => ({ ...a, nome: nomePorId.get(a.student_id) ?? 'Aluno removido' }));

  const ultimasTarefas = [
    ...limpeza.map(t => ({ ...t, tipo: 'limpeza' as const })),
    ...manut.map(t => ({ ...t, tipo: 'manutencao' as const })),
  ]
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 5);

  return {
    alunos, turmas, vagas, avals,
    totalAlunos: alunos.length, comTurma: comTurma.size, semTurma: semTurma.length,
    fixosSemTurma: fixosSemTurma.length, turmasVazias: turmasVazias.length,
    ocupadas: ocupadas.length, ocupacao, nomeHoje, turmasHoje: turmasHoje.length, alunosHoje,
    pendentes, aprovadas, taxaAprovacao, noMes, tendencia, meses,
    porTouca, maiorTouca, profsSemLogin: profsSemLogin.length,
    manutAberta: manutAberta.length, ultimasAvals, ultimasTarefas,
  };
}

export type ResumoPainel = ReturnType<typeof calcularResumo>;
