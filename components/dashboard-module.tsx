'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList,
  GraduationCap, LayoutDashboard, TrendingDown, TrendingUp, Users, Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { capLevelOrder, levels, type CapLevel } from '@/types';
import { Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader, PageShell } from '@/components/ui';
import { cn } from '@/lib/utils';

/* ============================================================
   Painel — visão geral da escola.

   Regra de ouro desta tela: NENHUM número é inventado. Tudo que
   aparece aqui é contado a partir das tabelas. Quando não há dado
   suficiente (hoje: avaliações), a área mostra um estado vazio
   honesto em vez de um gráfico de enfeite.
   ============================================================ */

type Aluno = { id: string; name: string; level: CapLevel; modalidade: string | null };
type Aval = { id: string; student_id: string; date: string; level: CapLevel; approved: boolean };
type Turma = { id: string; day_of_week: string; start_time: string; teacher_name: string };
type Vaga = { class_id: string; student_id: string | null };
type Equipe = { name: string; username: string | null; role: string; active: boolean | null };
type Tarefa = { id: string; title: string; completed: boolean; date: string; created_at: string };

/** O PostgREST devolve no máximo 1000 linhas por vez — class_slots tem 1303. */
async function buscarTudo<T>(tabela: string, colunas: string): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select(colunas).range(de, de + 999);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    const lote = (data ?? []) as unknown as T[];
    if (!lote.length) break;
    linhas.push(...lote);
    if (lote.length < 1000) break;
  }
  return linhas;
}

const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

/** 'AAAA-MM-DD' vira Date no meio do dia, para o fuso não jogar para a véspera. */
const dataLocal = (s: string) => new Date(s.length <= 10 ? `${s}T12:00:00` : s);
const diaCurto = (s: string) => dataLocal(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
const num = (n: number) => n.toLocaleString('pt-BR');

const irPara = (aba: string) => window.dispatchEvent(new CustomEvent('jumpToTab', { detail: aba }));

/* ------------------------------------------------------------------ */

interface CartaoProps {
  icone: LucideIcon;
  titulo: string;
  valor: string;
  contexto: string;
  /** Só aparece quando existe base de comparação real. */
  tendencia?: { texto: string; sentido: 'sobe' | 'desce' | 'igual' };
  destaque?: 'neutro' | 'atencao';
}

function Cartao({ icone: Icone, titulo, valor, contexto, tendencia, destaque = 'neutro' }: CartaoProps) {
  const Seta = tendencia?.sentido === 'desce' ? TrendingDown : TrendingUp;
  return (
    <Card className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-ink-subtle">
        <Icone className={cn('w-4 h-4 shrink-0', destaque === 'atencao' && 'text-warning')} />
        <span className="text-mini font-bold uppercase tracking-wider truncate">{titulo}</span>
      </div>

      <p
        className={cn(
          'text-2xl md:text-3xl font-black leading-none tabular-nums',
          destaque === 'atencao' ? 'text-warning-ink' : 'text-ink'
        )}
      >
        {valor}
      </p>

      <p className="text-xs text-ink-muted font-medium leading-snug">{contexto}</p>

      {tendencia && (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-mini font-bold mt-0.5',
            tendencia.sentido === 'sobe' && 'text-success-ink',
            tendencia.sentido === 'desce' && 'text-danger-ink',
            tendencia.sentido === 'igual' && 'text-ink-subtle'
          )}
        >
          {tendencia.sentido !== 'igual' && <Seta className="w-3 h-3 shrink-0" />}
          {tendencia.texto}
        </span>
      )}
    </Card>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-mini font-black text-ink-subtle uppercase tracking-wider">{titulo}</h2>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function DashboardModule() {
  const [dados, setDados] = useState<{
    alunos: Aluno[]; avals: Aval[]; turmas: Turma[]; vagas: Vaga[];
    equipe: Equipe[]; limpeza: Tarefa[]; manut: Tarefa[];
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [alunos, avals, turmas, vagas, equipe, limpeza, manut] = await Promise.all([
          buscarTudo<Aluno>('students', 'id,name,level,modalidade'),
          buscarTudo<Aval>('evaluations', 'id,student_id,date,level,approved'),
          buscarTudo<Turma>('classes', 'id,day_of_week,start_time,teacher_name'),
          buscarTudo<Vaga>('class_slots', 'class_id,student_id'),
          buscarTudo<Equipe>('app_users', 'name,username,role,active'),
          buscarTudo<Tarefa>('cleaning_tasks', 'id,title,completed,date,created_at'),
          buscarTudo<Tarefa>('maintenance_tasks', 'id,title,completed,date,created_at'),
        ]);
        if (vivo) setDados({ alunos, avals, turmas, vagas, equipe, limpeza, manut });
      } catch (e: any) {
        if (vivo) setErro(e?.message ?? 'Falha ao carregar os dados.');
      }
    })();
    return () => { vivo = false; };
  }, []);

  const resumo = useMemo(() => {
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
    let tendencia: CartaoProps['tendencia'];
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
  }, [dados]);

  if (erro) {
    return (
      <PageShell>
        <ErrorState
          title="Não deu para carregar o painel"
          description={erro}
          action={<Button onClick={() => location.reload()}>Tentar de novo</Button>}
        />
      </PageShell>
    );
  }

  if (!resumo) {
    return (
      <PageShell>
        <Loading label="Somando os números da escola..." full />
      </PageShell>
    );
  }

  /* ----- 2. o que precisa de atenção ----- */
  const alertas: {
    icone: LucideIcon; titulo: string; detalhe: string; tom: 'danger' | 'warning' | 'info';
    aba: string; acao: string;
  }[] = [];

  if (resumo.fixosSemTurma > 0) {
    alertas.push({
      icone: Users, tom: 'danger',
      titulo: `${num(resumo.fixosSemTurma)} ${resumo.fixosSemTurma === 1 ? 'aluno fixo' : 'alunos fixos'} sem turma`,
      detalhe: 'Mensalistas que não aparecem em nenhuma aula da grade — provável falha no cadastro.',
      aba: 'students', acao: 'Ver alunos',
    });
  }
  if (resumo.turmasVazias > 0) {
    alertas.push({
      icone: CalendarDays, tom: 'warning',
      titulo: `${num(resumo.turmasVazias)} ${resumo.turmasVazias === 1 ? 'turma' : 'turmas'} sem nenhum aluno`,
      detalhe: 'Horários abertos na grade que continuam vazios.',
      aba: 'schedule', acao: 'Abrir grade',
    });
  }
  if (resumo.profsSemLogin > 0) {
    alertas.push({
      icone: GraduationCap, tom: 'warning',
      titulo: `${num(resumo.profsSemLogin)} ${resumo.profsSemLogin === 1 ? 'professor' : 'professores'} sem acesso`,
      detalhe: 'Sem usuário e senha eles não conseguem lançar avaliação pelo celular.',
      aba: 'professors', acao: 'Criar acessos',
    });
  }
  if (resumo.manutAberta > 0) {
    alertas.push({
      icone: Wrench, tom: 'info',
      titulo: `${num(resumo.manutAberta)} ${resumo.manutAberta === 1 ? 'chamado' : 'chamados'} de manutenção em aberto`,
      detalhe: 'Tarefas registradas que ainda não foram concluídas.',
      aba: 'maintenance', acao: 'Ver chamados',
    });
  }

  const hojeExtenso = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const tetoMes = Math.max(1, ...resumo.meses.map(x => x.total));

  return (
    <PageShell>
      <PageHeader
        icon={LayoutDashboard}
        title="Painel"
        description={
          <span className="capitalize">
            {hojeExtenso}
            <span className="normal-case">
              {resumo.turmasHoje > 0
                ? ` · ${num(resumo.turmasHoje)} ${resumo.turmasHoje === 1 ? 'turma' : 'turmas'} hoje · ${num(resumo.alunosHoje)} ${resumo.alunosHoje === 1 ? 'aluno' : 'alunos'} em aula`
                : ' · sem aulas na grade hoje'}
            </span>
          </span>
        }
      />

      {/* ---------- 1. RESUMO GERAL ---------- */}
      <Secao titulo="Resumo geral">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Cartao
            icone={Users}
            titulo="Alunos"
            valor={num(resumo.totalAlunos)}
            contexto={`${num(resumo.comTurma)} em turma · ${num(resumo.semTurma)} sem turma`}
          />
          <Cartao
            icone={ClipboardList}
            titulo="Avaliações pendentes"
            valor={num(resumo.pendentes)}
            contexto={
              resumo.pendentes === resumo.totalAlunos
                ? 'Nenhum aluno avaliado até agora'
                : `de ${num(resumo.totalAlunos)} alunos no total`
            }
            destaque={resumo.pendentes > 0 ? 'atencao' : 'neutro'}
          />
          <Cartao
            icone={ClipboardCheck}
            titulo="Avaliações concluídas"
            valor={num(resumo.avals.length)}
            contexto={
              resumo.avals.length === 0
                ? 'Nenhuma ficha salva ainda'
                : `${num(resumo.noMes)} neste mês · ${resumo.taxaAprovacao}% de aprovação`
            }
            tendencia={resumo.tendencia}
          />
          <Cartao
            icone={CalendarDays}
            titulo="Ocupação das turmas"
            valor={`${resumo.ocupacao}%`}
            contexto={`${num(resumo.ocupadas)} de ${num(resumo.vagas.length)} vagas · ${num(resumo.turmas.length)} turmas`}
          />
        </div>
      </Secao>

      {/* ---------- 2. PRECISA DE ATENÇÃO ---------- */}
      <Secao titulo="Precisa de atenção">
        {alertas.length === 0 ? (
          <Card className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-ink text-sm">Nenhuma pendência</p>
              <p className="text-xs text-ink-muted">Cadastro, grade e equipe estão sem inconsistências.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {alertas.map(a => {
              const Icone = a.icone;
              return (
                <Card key={a.titulo} className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span
                    className={cn(
                      'w-9 h-9 rounded-control flex items-center justify-center shrink-0',
                      a.tom === 'danger' && 'bg-danger-soft text-danger-ink',
                      a.tom === 'warning' && 'bg-warning-soft text-warning-ink',
                      a.tom === 'info' && 'bg-info-soft text-info-ink'
                    )}
                  >
                    <Icone className="w-4 h-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink text-sm text-balance">{a.titulo}</p>
                    <p className="text-xs text-ink-muted mt-0.5 leading-snug">{a.detalhe}</p>
                  </div>

                  <Button variant="secondary" size="sm" onClick={() => irPara(a.aba)} className="sm:shrink-0">
                    {a.acao}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </Secao>

      {/* ---------- 3. EVOLUÇÃO ---------- */}
      <Secao titulo="Evolução">
        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
          <Card as="panel">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h3 className="font-bold text-ink text-sm">Avaliações por mês</h3>
              {resumo.avals.length > 0 && <Badge tone="success">{resumo.taxaAprovacao}% aprovados</Badge>}
            </div>

            {resumo.avals.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="w-10 h-10" />}
                title="Ainda não há avaliações registradas"
                description="O gráfico começa a ser desenhado assim que a primeira ficha for salva. Nada aqui é preenchido com dado de exemplo."
                action={<Button onClick={() => irPara('swimming')}>Avaliar agora</Button>}
              />
            ) : (
              <div className="flex items-end justify-between gap-2 h-40">
                {resumo.meses.map(m => (
                  <div key={m.chave} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <span className="text-mini font-black text-ink tabular-nums">{m.total || ''}</span>
                    <div
                      className={cn('w-full rounded-t-md transition-all', m.total ? 'bg-brand' : 'bg-line')}
                      style={{ height: `${Math.max(4, (m.total / tetoMes) * 100)}%` }}
                    />
                    <span className="text-mini font-bold text-ink-subtle uppercase truncate w-full text-center">
                      {m.rotulo}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card as="panel">
            <h3 className="font-bold text-ink text-sm mb-4">Alunos por touca</h3>
            <div className="space-y-2.5">
              {resumo.porTouca.map(t => (
                <div key={t.chave} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-ink-muted w-20 shrink-0 truncate">
                    {levels[t.chave].label}
                  </span>
                  <div className="flex-1 h-2.5 bg-surface-sunken rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', levels[t.chave].bgClass)}
                      style={{ width: `${(t.total / resumo.maiorTouca) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-ink tabular-nums w-9 text-right shrink-0">
                    {num(t.total)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Secao>

      {/* ---------- 4. ATIVIDADES RECENTES ---------- */}
      <Secao titulo="Atividades recentes">
        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
          <Card as="panel" flush>
            <h3 className="font-bold text-ink text-sm px-4 md:px-5 pt-4 md:pt-5 pb-3">Últimas avaliações</h3>
            {resumo.ultimasAvals.length === 0 ? (
              <p className="text-sm text-ink-subtle px-4 md:px-5 pb-5">Nenhuma avaliação lançada até agora.</p>
            ) : (
              <ul className="divide-y divide-line">
                {resumo.ultimasAvals.map(a => (
                  <li key={a.id} className="flex items-center gap-3 px-4 md:px-5 py-3">
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', levels[a.level]?.bgClass ?? 'bg-line')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink truncate">{a.nome}</p>
                      <p className="text-xs text-ink-subtle">
                        {levels[a.level]?.label ?? a.level} · {diaCurto(a.date)}
                      </p>
                    </div>
                    <Badge tone={a.approved ? 'success' : 'warning'}>{a.approved ? 'Passou' : 'Treinar'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card as="panel" flush>
            <h3 className="font-bold text-ink text-sm px-4 md:px-5 pt-4 md:pt-5 pb-3">Limpeza e manutenção</h3>
            {resumo.ultimasTarefas.length === 0 ? (
              <p className="text-sm text-ink-subtle px-4 md:px-5 pb-5">Nenhuma tarefa registrada até agora.</p>
            ) : (
              <ul className="divide-y divide-line">
                {resumo.ultimasTarefas.map(t => (
                  <li key={`${t.tipo}-${t.id}`} className="flex items-center gap-3 px-4 md:px-5 py-3">
                    {t.tipo === 'limpeza' ? (
                      <ClipboardList className="w-4 h-4 text-ink-subtle shrink-0" />
                    ) : (
                      <Wrench className="w-4 h-4 text-ink-subtle shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink truncate">{t.title}</p>
                      <p className="text-xs text-ink-subtle">
                        {t.tipo === 'limpeza' ? 'Limpeza' : 'Manutenção'}
                        {t.date ? ` · ${diaCurto(t.date)}` : ''}
                      </p>
                    </div>
                    <Badge tone={t.completed ? 'success' : 'neutral'}>{t.completed ? 'Feita' : 'Aberta'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </Secao>

      <p className="flex items-center gap-1.5 text-mini text-ink-subtle font-medium pb-2">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        Todos os números vêm direto do banco. Áreas sem dado suficiente ficam vazias de propósito.
      </p>
    </PageShell>
  );
}
