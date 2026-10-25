'use client';

import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { LogOut, Droplets, Award, Calendar, Check, X as XIcon, FileText, Clock, User, BellRing, BellOff } from 'lucide-react';
import { levels, Student, CapLevel } from '@/types';
import { EVALUATION_CRITERIA } from '@/lib/evaluation-criteria';
import { gerarBoletimPDF } from '@/lib/boletim-pdf';
import { ativarAvisos, jaInscrito, suportaAvisos } from '@/lib/push';
import { InstallPrompt } from '@/components/install-prompt';
import { CaminhoTouca } from '@/components/caminho-touca';
import { periodoTrimestre } from '@/lib/trimestre';
import { supabase } from '@/lib/supabase';
import { recarregarFilhos } from '@/lib/login-responsavel';
import { ConsentimentoPortal } from '@/components/consentimento-portal';
import { avisoPronto, VERSAO_AVISO } from '@/lib/aviso-privacidade';
import { rotuloProfessor } from '@/lib/professor';
import { cn } from '@/lib/utils';
import { BadgeTouca, EmptyState, JornadaToucas, avisar } from '@/components/ui';

/** As duas toucas escuras pedem texto branco na inicial do aluno. */
const TOUCA_ESCURA: CapLevel[] = ['darkBlue', 'black'];

/** O que o login traz da linha de students (ver COLUNAS_PORTAL). */
type AlunoLogado = Student & {
  password?: string | null;
  consentimento_em?: string | null;
  consentimento_versao?: string | null;
};

interface ClientPortalProps {
  students: Student[];
  onLogout: () => void;
}

interface Aula {
  dia: string;
  inicio: string;
  fim: string;
  professor: string;
}

const hhmm = (t: string) => String(t || '').slice(0, 5);

export function ClientPortal({ students, onLogout }: ClientPortalProps) {
  /**
   * Os dados vinham SÓ da sessão gravada no login — uma fotografia congelada.
   * O professor lançava a avaliação e o pai continuava vendo a tela antiga,
   * porque recarregar a página relia a mesma fotografia do localStorage.
   * Agora o portal busca de novo ao abrir e toda vez que o app volta ao topo.
   */
  const [filhos, setFilhos] = useState<AlunoLogado[]>((students || []).filter(Boolean));
  const [atualizando, setAtualizando] = useState(false);
  const [idx, setIdx] = useState(0);
  const [aulas, setAulas] = useState<Record<string, Aula[]>>({});
  const [avisosOn, setAvisosOn] = useState<boolean | null>(null);
  const [ativando, setAtivando] = useState(false);
  /**
   * Destrava a tela na hora do aceite, sem esperar o `recarregar`.
   * Sem isto o pai toca em "Li e concordo" e continua vendo o aviso até
   * a rede responder — parece que o botão não funcionou.
   */
  const [aceitouAgora, setAceitouAgora] = useState(false);
  /**
   * No iPhone o push só funciona com o app na Tela de Início. Aberto no
   * Safari comum, o botão "Ativar avisos" só levaria a um erro — então
   * mostramos a instrução de instalar em vez do botão.
   */
  const [iosSemInstalar, setIosSemInstalar] = useState(false);

  useEffect(() => {
    jaInscrito().then(setAvisosOn);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const instalado = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIosSemInstalar(ios && !instalado);
  }, []);

  /** Rebusca a ficha dos filhos — mesma regra de casamento que o login. */
  const recarregar = React.useCallback(async () => {
    const base = ((students || []).filter(Boolean) as AlunoLogado[])[0];
    const tel = String(base?.phone || '').replace(/\D/g, '');
    if (!tel || !base?.password) return;

    setAtualizando(true);
    const data = await recarregarFilhos(tel, base.password);
    setAtualizando(false);

    if (data?.length) {
      setFilhos(data as AlunoLogado[]);
      // mantém a sessão em dia, senão o próximo abrir volta ao dado velho
      localStorage.setItem('olimpo_session', JSON.stringify({ role: 'client', data }));
    }
  }, [students]);

  useEffect(() => { recarregar(); }, [recarregar]);

  // o pai abre o app instalado e ele volta do segundo plano: rebusca
  useEffect(() => {
    const aoVoltar = () => { if (document.visibilityState === 'visible') recarregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [recarregar]);

  const periodo = periodoTrimestre();

  const ligarAvisos = async () => {
    setAtivando(true);
    try {
      await ativarAvisos(filhos[0]?.phone || '');
      setAvisosOn(true);
      avisar('Pronto! Você será avisado assim que sair uma nova avaliação. 🔔');
    } catch (e: any) {
      avisar(e.message || 'Não consegui ativar os avisos.');
    } finally {
      setAtivando(false);
    }
  };

  const student = filhos[Math.min(idx, filhos.length - 1)];

  // busca dia/horário/professor de cada filho
  useEffect(() => {
    (async () => {
      const ids = filhos.map(f => f.id);
      if (!ids.length) return;
      const { data: slots } = await supabase.from('class_slots').select('class_id, student_id').in('student_id', ids);
      if (!slots?.length) return;
      const classIds = [...new Set(slots.map(s => s.class_id))];
      const { data: cls } = await supabase
        .from('classes')
        .select('id, teacher_name, day_of_week, start_time, end_time')
        .in('id', classIds);
      if (!cls) return;
      const porId = new Map(cls.map(c => [c.id, c]));
      const mapa: Record<string, Aula[]> = {};
      slots.forEach(s => {
        const c = porId.get(s.class_id);
        if (!c || !s.student_id) return;
        (mapa[s.student_id] ||= []).push({
          dia: c.day_of_week, inicio: hhmm(c.start_time), fim: hhmm(c.end_time), professor: rotuloProfessor(c.teacher_name),
        });
      });
      const ORDEM = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      Object.values(mapa).forEach(a => a.sort((x, y) => ORDEM.indexOf(x.dia) - ORDEM.indexOf(y.dia) || x.inicio.localeCompare(y.inicio)));
      setAulas(mapa);
    })();
  }, [filhos.length]);

  if (!student) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface-sunken p-6 text-center">
        <p className="text-ink-muted font-bold">Nenhum aluno encontrado nesta conta.</p>
        <button onClick={onLogout} className="mt-6 px-6 py-3 bg-surface-raised text-white rounded-xl font-bold">Sair</button>
      </div>
    );
  }

  /**
   * Aceite do aviso de privacidade (LGPD Art. 14, §1º).
   *
   * Compara a VERSÃO, e não só a presença da data: quando o texto do
   * aviso muda, quem aceitou o texto antigo precisa ver o novo — um
   * consentimento é para o que a pessoa leu, não para sempre.
   *
   * Vale por família: basta um filho pendente para a tela aparecer, e
   * o aceite grava em todos de uma vez.
   *
   * `undefined` x `null` importa aqui, e não é preciosismo:
   *   - `undefined` = a coluna não veio na resposta, ou seja, o SQL de
   *     consentimento ainda não rodou. Mostrar a tela seria uma cilada:
   *     o pai tocaria em "Li e concordo", o UPDATE falharia por coluna
   *     inexistente e ele ficaria presto na tela, sem ver o filho.
   *   - `null` = a coluna existe e ninguém consentiu ainda. Aí sim.
   */
  const colunasDeConsentimentoExistem = filhos.some(f => f.consentimento_em !== undefined);

  const faltaConsentir =
    // sem razão social e CNPJ preenchidos, o aviso não identifica o
    // controlador e não deve ser mostrado a ninguém (ver avisoPronto)
    avisoPronto() &&
    colunasDeConsentimentoExistem &&
    filhos.some(f => !f.consentimento_em || f.consentimento_versao !== VERSAO_AVISO);

  if (faltaConsentir && !aceitouAgora) {
    return (
      <ConsentimentoPortal
        filhos={filhos}
        aoAceitar={() => { setAceitouAgora(true); recarregar(); }}
      />
    );
  }

  const nivel = levels[student.level] || levels.orange;
  const avaliacoes = [...(student.evaluations || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const minhasAulas = aulas[student.id] || [];

  return (
    <div className="fixed inset-0 flex flex-col bg-canvas overflow-y-auto overflow-x-clip">
      {/* Cabeçalho */}
      <div className="bg-black pt-[max(3rem,calc(env(safe-area-inset-top)+1.5rem))] pb-6 px-5 sm:px-6 shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex justify-between items-start relative z-10">
          <Image src="/logo.png" alt="Clube Olimpo" width={44} height={44} className="h-11 w-11 object-contain" />
          <button onClick={onLogout} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 backdrop-blur-md">
            Sair <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Seletor de filhos */}
        {filhos.length > 1 && (
          <div className="mt-6 flex gap-2 overflow-x-auto relative z-10 pb-1">
            {filhos.map((f, i) => (
              <button key={f.id} onClick={() => setIdx(i)} className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border transition-all',
                i === idx ? 'bg-surface text-surface-raised border-white' : 'bg-white/10 text-white border-white/20'
              )}>
                {f.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-4 relative z-10">
          <div className={cn(
            'w-20 h-20 rounded-panel flex items-center justify-center font-titulo font-bold text-3xl shadow-overlay border-2 border-white/20',
            nivel.bgClass,
            TOUCA_ESCURA.includes(student.level as CapLevel) ? 'text-white' : 'text-[#0b1b2b]'
          )}>
            {student.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="font-titulo text-xl sm:text-2xl font-semibold text-white tracking-tight leading-tight break-words">{student.name}</h1>
            {/* "Dossiê do Aluno" era frio para quem é mãe ou pai lendo
                o resultado do filho. A touca diz mais e é o que a
                pessoa veio ver. */}
            <div className="mt-1.5">
              <BadgeTouca nivel={student.level as CapLevel} completo />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 sm:px-6 md:p-8 pb-[max(2rem,env(safe-area-inset-bottom))] max-w-3xl mx-auto w-full -mt-4 relative z-20 space-y-6">

        {atualizando && (
          <p className="text-xs font-bold text-ink-subtle text-center animate-pulse">Buscando novidades...</p>
        )}

        {/* Avisos no celular */}
        {suportaAvisos() && avisosOn === false && (
          <div className="bg-warning-soft border border-brand-line rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-11 h-11 bg-brand-bright rounded-2xl flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6 text-brand-ink" />
            </div>
            <div className="flex-1">
              <p className="font-black text-brand-deep text-sm">Quer ser avisado quando sair a avaliação?</p>
              <p className="text-xs font-medium text-brand-deep mt-0.5">
                {iosSemInstalar
                  ? 'No iPhone, primeiro adicione o app à Tela de Início: toque em Compartilhar, na barra de baixo, e escolha "Adicionar à Tela de Início". Depois volte aqui.'
                  : 'Ative os avisos e o celular te avisa sozinho — não precisa ficar conferindo.'}
              </p>
            </div>
            {!iosSemInstalar && (
              <button onClick={ligarAvisos} disabled={ativando} className="px-5 py-3 bg-black text-white rounded-xl font-bold text-sm shrink-0 active:scale-95 transition-transform disabled:opacity-50">
                {ativando ? 'Ativando...' : 'Ativar avisos'}
              </button>
            )}
          </div>
        )}
        {avisosOn === true && (
          <div className="flex items-center gap-2 text-xs font-bold text-success-ink bg-success-soft border border-success-soft rounded-xl px-3 py-2 w-fit">
            <BellRing className="w-3.5 h-3.5" /> Avisos ativados neste aparelho
          </div>
        )}

        {/* Nível */}
        <div className="bg-surface rounded-panel p-6 shadow-overlay border border-line flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-ink-subtle uppercase tracking-wider mb-1">Nível Atual</p>
            <div className="flex items-center gap-2">
              <Award className={cn('w-6 h-6', nivel.colorClass)} />
              <p className="text-xl font-extrabold text-ink">Touca {nivel.name}</p>
            </div>
          </div>
          {student.age ? (
            <div className="text-right">
              <p className="text-xs font-bold text-ink-subtle uppercase tracking-wider mb-1">Idade</p>
              <p className="text-xl font-extrabold text-ink">{student.age} anos</p>
            </div>
          ) : null}
        </div>

        {/*
          A jornada das sete toucas, antes dos critérios.

          A pergunta que o responsável faz primeiro é "em que ponto
          meu filho está?", e uma lista de critérios não responde
          isso — responde "o que falta". A linha mostra o percurso
          inteiro: de onde veio, onde está, o que vem depois.
        */}
        <div className="bg-surface rounded-panel border border-line shadow-raised p-4 sm:p-5">
          <h2 className="font-titulo text-base font-semibold text-ink mb-3">O caminho até aqui</h2>
          <JornadaToucas atual={student.level as CapLevel} />
        </div>

        {/* O que falta para trocar de touca — vale mesmo sem nenhuma avaliação */}
        <CaminhoTouca nome={student.name} nivel={student.level as CapLevel} avaliacoes={avaliacoes} />

        {/* Aulas */}
        {minhasAulas.length > 0 && (
          <div className="bg-surface rounded-panel p-6 shadow-raised border border-line">
            <h2 className="text-sm font-black text-ink-subtle uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Aulas da semana
            </h2>
            <div className="space-y-2">
              {minhasAulas.map((a, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 bg-surface-sunken border border-line rounded-2xl p-3">
                  <span className="px-3 py-1.5 bg-surface-raised text-white rounded-lg text-sm font-black shrink-0">
                    {a.inicio} às {a.fim}
                  </span>
                  <span className="font-bold text-ink text-sm">{a.dia}</span>
                  <span className="text-xs font-medium text-ink-muted flex items-center gap-1 ml-auto">
                    <User className="w-3 h-3" /> {a.professor}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avaliações */}
        <div>
          <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand" /> Histórico de Avaliações
          </h2>

          {avaliacoes.length === 0 ? (
            <EmptyState
              icon={<Droplets className="w-12 h-12" />}
              title="A primeira avaliação ainda não saiu"
              description={`A avaliação deste trimestre (${periodo.inicio} a ${periodo.fim}) sai até o fim de ${periodo.fim}. Quando o professor lançar, aparece aqui e você recebe um aviso no celular.`}
            />
          ) : (
            <div className="space-y-4">
              {avaliacoes.map(ev => {
                const evLevel = levels[ev.level as CapLevel];
                const criterios = EVALUATION_CRITERIA[ev.level as CapLevel] || [];
                const scores = ev.scores || {};
                const passou = criterios.filter(c => scores[c.id] === 'passed').length;

                return (
                  <div key={ev.id} className="bg-surface rounded-card p-5 shadow-raised border border-line">
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                      <div>
                        <p className="font-extrabold text-ink text-lg leading-tight">
                          {new Date(ev.date).toLocaleDateString('pt-BR')}
                        </p>
                        {evLevel && (
                          <BadgeTouca nivel={ev.level as CapLevel} completo className="mt-1" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('px-3 py-1 text-xs font-bold rounded-lg uppercase', ev.approved ? 'bg-success-soft text-success-ink' : 'bg-brand-wash text-warning-ink')}>
                          {ev.approved ? 'Aprovado' : 'Em treinamento'}
                        </span>
                        <button onClick={() => gerarBoletimPDF(ev, student.name)} className="px-3 py-1.5 bg-surface-raised-soft text-white rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform">
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </div>

                    {/* Recado do professor primeiro — é o que o pai quer ler */}
                    {ev.notes && (
                      <div className="mb-4 p-4 bg-brand-soft rounded-2xl border border-brand-line">
                        <p className="text-xs font-bold text-brand uppercase tracking-wider mb-1">Recado do Professor</p>
                        <p className="text-sm text-ink leading-relaxed">{ev.notes}</p>
                      </div>
                    )}

                    {criterios.length > 0 && (
                      <>
                        <p className="text-xs font-bold text-ink-muted mb-2">
                          {passou} de {criterios.length} fundamentos concluídos
                        </p>
                        <div className="h-2 bg-surface-sunken rounded-full overflow-hidden mb-3">
                          <div className="h-full bg-success transition-all" style={{ width: `${criterios.length ? (passou / criterios.length) * 100 : 0}%` }} />
                        </div>
                        <div className="space-y-1.5">
                          {criterios.map(crit => {
                            const st = scores[crit.id] || 'pending';
                            return (
                              <div key={crit.id} className="flex items-start gap-2 text-sm">
                                <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                                  st === 'passed' ? 'bg-success-soft text-success' : st === 'failed' ? 'bg-danger-soft text-danger' : 'bg-surface-sunken text-ink-subtle')}>
                                  {st === 'passed' ? <Check className="w-3 h-3" strokeWidth={3} /> : st === 'failed' ? <XIcon className="w-3 h-3" strokeWidth={3} /> : <span className="text-micro font-bold">–</span>}
                                </div>
                                <span className={cn('leading-snug', st === 'passed' ? 'text-ink' : 'text-ink-muted')}>{crit.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {ev.approved && (
                      <div className="mt-4 p-3 bg-success rounded-xl text-white text-center shadow-lg shadow-success/20">
                        <p className="text-sm font-bold">Parabéns! {student.name.split(' ')[0]} foi aprovado(a) para trocar de touca! 🏅</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Convite para instalar o app na tela do celular */}
      <InstallPrompt />
    </div>
  );
}
