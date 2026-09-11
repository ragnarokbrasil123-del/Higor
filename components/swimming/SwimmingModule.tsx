'use client';

import React, { useState } from 'react';
import { Droplets, Search, X } from 'lucide-react';
import type { Student } from '@/types';
import { FilterBar, Input, Loading, PageHeader, PageShell, Select } from '@/components/ui';

import { FichaAluno } from './FichaAluno';
import { LinhaAluno } from './LinhaAluno';
import { PainelSemTurma } from './PainelSemTurma';
import { PainelTurmas } from './PainelTurmas';
import { SeloAvaliacao } from './SeloAvaliacao';
import { TelaAvaliacao } from './TelaAvaliacao';
import { TRIMESTRE_ATUAL, hhmm, hojeDia, trimestre, type Aluno, type Bloco, type ClassRow, type Escopo } from './constantes';
import { useDadosNatacao } from './useDadosNatacao';
import { useFilaAvaliacao } from './useFilaAvaliacao';
import { lecionaEm, professoresDe, rotuloProfessor } from '@/lib/professor';

interface SwimmingModuleProps {
  escopo?: Escopo;
}

/**
 * Avaliação de Natação — o orquestrador das três abas.
 *
 * Aqui ficam só os dados derivados (permissão, agrupamento, filtros e
 * contadores) e a escolha da tela. Cada tela é um componente à parte e
 * as duas máquinas de estado moram em useDadosNatacao e useFilaAvaliacao.
 */
export function SwimmingModule({ escopo = 'turmas' }: SwimmingModuleProps) {
  const semTurmaMode = escopo === 'sem-turma';
  const sabadoMode = escopo === 'sabado';
  const [view, setView] = useState<'home' | 'avaliando' | 'aluno'>('home');
  const [alunoId, setAlunoId] = useState<string | null>(null);

  // carga do banco + trava de permissão do professor
  const {
    students, evaluations, classes, slots, allowedIds, currentUser, loading,
    recarregarAvaliacoes, apagarAvaliacao,
  } = useDadosNatacao(id => { setAlunoId(id); setView('aluno'); });

  const [selectedDay, setSelectedDay] = useState<string>(hojeDia());
  const [search, setSearch] = useState('');
  const [filterProf, setFilterProf] = useState<string>('all');

  // filtros da aba Avulsos & Wellhub
  const [filtroGrupo, setFiltroGrupo] = useState<string>('all');
  const [filtroTouca, setFiltroTouca] = useState<string>('all');
  const [soPendentes, setSoPendentes] = useState(false);

  // ---------------------------------------------------------------- derivados
  const isAdmin = currentUser?.role === 'admin';
  const meuNome = currentUser?.data?.name || currentUser?.data?.username || '';
  const podeVer = (id: string) => allowedIds === 'all' || allowedIds.includes(id);

  const alunoPorId = new Map(students.map(s => [s.id, s]));
  const meusAlunos = students.filter(s => podeVer(s.id));

  // fila de avaliação em sequência (marcação, rascunho, salvar e avançar)
  const aval = useFilaAvaliacao({
    view,
    alunoPorId,
    recarregarAvaliacoes,
    aoIniciar: () => setView('avaliando'),
    aoSair: () => setView('home'),
  });
  const abrirFila = aval.abrir;

  const ultimaAval = (sid: string) => evaluations.find(e => e.student_id === sid);
  const avaliadoAgora = (sid: string) =>
    evaluations.some(e => e.student_id === sid && trimestre(e.date) === TRIMESTRE_ATUAL);

  const alunosDaTurma = (classId: string) =>
    slots
      .filter(s => s.class_id === classId && s.student_id && podeVer(s.student_id))
      .map(s => alunoPorId.get(s.student_id!))
      .filter(Boolean) as Student[];

  // turmas visíveis (professor vê só as dele) + filtro de professor.
  // No sábado teacher_name é a dupla "A / B": lecionaEm entende os dois.
  const minhasClasses = classes.filter(c => isAdmin || !meuNome || lecionaEm(c.teacher_name, meuNome));
  // o filtro lista pessoas, não postos — a dupla vira dois nomes
  const profsDisponiveis = [...new Set(minhasClasses.flatMap(c => professoresDe(c.teacher_name)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const classesFiltradas = minhasClasses.filter(c => filterProf === 'all' || lecionaEm(c.teacher_name, filterProf));

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
  const blocosDoDia: Bloco[] = sabadoMode
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
        professor: rotuloProfessor(c.teacher_name),
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

  const abrirAluno = (id: string) => { setAlunoId(id); setView('aluno'); };
  const selo = (sid: string) => <SeloAvaliacao avaliado={avaliadoAgora(sid)} ultima={ultimaAval(sid)} />;

  // ================================================================ RENDER
  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-canvas"><Loading label="Carregando avaliações..." /></div>;
  }

  // ---------------------------------------------------- MODO AVALIANDO
  if (view === 'avaliando') return <TelaAvaliacao aval={aval} alunoPorId={alunoPorId} />;

  // ---------------------------------------------------- FICHA DO ALUNO
  if (view === 'aluno' && alunoId) {
    const aluno = alunoPorId.get(alunoId);
    if (!aluno) { setView('home'); return null; }
    return (
      <FichaAluno
        aluno={aluno}
        historico={evaluations.filter(e => e.student_id === aluno.id)}
        isAdmin={isAdmin}
        selo={selo(aluno.id)}
        onVoltar={() => setView('home')}
        onAvaliar={() => abrirFila([aluno.id])}
        onApagar={apagarAvaliacao}
      />
    );
  }

  // ---------------------------------------------------- HOME (turmas do dia)
  return (
    <PageShell width="wide">
        <PageHeader
          icon={Droplets}
          title={semTurmaMode ? 'Avulsos & Wellhub' : sabadoMode ? 'Avaliação de sábado' : 'Avaliação'}
          description={
            semTurmaMode
              ? <>Alunos sem horário fixo na grade · trimestre {TRIMESTRE_ATUAL}</>
              : <>{sabadoMode ? 'Agrupado por horário' : filterProf !== 'all' ? filterProf : isAdmin ? 'Todas as turmas' : `Turmas de ${meuNome || 'você'}`} · trimestre {TRIMESTRE_ATUAL}</>
          }
          metric={{ value: totalAvaliados, of: alunosNoEscopo.length, label: 'alunos avaliados' }}
        />

        {/* busca + filtro de professor */}
        <FilterBar>
          <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar aluno pelo nome..." className="pl-9 pr-9 bg-surface shadow-raised" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"><X className="w-4 h-4" /></button>}
          </div>
          {!semTurmaMode && !sabadoMode && profsDisponiveis.length > 1 && (
            <Select value={filterProf} onChange={e => setFilterProf(e.target.value)} className="w-full md:w-auto bg-surface shadow-raised font-bold md:max-w-[300px]">
              <option value="all">Todos os professores ({profsDisponiveis.length})</option>
              {profsDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          )}
          </div>
        </FilterBar>

        {!semTurmaMode && filterProf !== 'all' && (
          <button onClick={() => setFilterProf('all')} className="inline-flex items-center gap-2 text-xs font-bold text-info bg-info-soft border border-indigo-200 rounded-lg px-3 py-1.5">
            Filtrando por {filterProf.split(' ')[0]} <X className="w-3.5 h-3.5" />
          </button>
        )}

        {buscando ? (
          <div className="bg-surface rounded-panel border border-line shadow-raised divide-y divide-slate-50">
            {resultadoBusca.length === 0 ? (
              <p className="p-8 text-center text-ink-subtle font-medium text-sm">Nenhum aluno encontrado.</p>
            ) : resultadoBusca.map(s => (
              <LinhaAluno
                key={s.id}
                aluno={s}
                variante="busca"
                selo={selo(s.id)}
                onClick={() => abrirAluno(s.id)}
              />
            ))}
          </div>
        ) : semTurmaMode ? (
          <PainelSemTurma
            semTurma={semTurma}
            semTurmaFiltrado={semTurmaFiltrado}
            filtros={{
              grupo: filtroGrupo, setGrupo: setFiltroGrupo,
              touca: filtroTouca, setTouca: setFiltroTouca,
              soPendentes, setSoPendentes,
            }}
            avaliadoAgora={avaliadoAgora}
            selo={selo}
            onAbrirAluno={abrirAluno}
            onAvaliarGrupo={abrirFila}
          />
        ) : (
          <PainelTurmas
            sabadoMode={sabadoMode}
            isAdmin={isAdmin}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            diaAtivo={diaAtivo}
            filterProf={filterProf}
            soPendentes={soPendentes}
            setSoPendentes={setSoPendentes}
            contarTurmasDoDia={d => classesFiltradas.filter(c => c.day_of_week === d && comAluno(c)).length}
            blocos={blocosDoDia}
            avaliadoAgora={avaliadoAgora}
            selo={selo}
            onAbrirAluno={abrirAluno}
            onAvaliarBloco={abrirFila}
          />
        )}
    </PageShell>
  );
}
