'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { LoginModule } from '@/components/login-module';
import { InstallPrompt } from '@/components/install-prompt';
import { Loading , avisar } from '@/components/ui';
import { Droplets, ClipboardList, UserPlus, GraduationCap, LogOut, Wrench, BellRing, AlertTriangle, X, CalendarDays, Users, Sparkles, CalendarClock, LayoutDashboard, ShieldCheck, Waves, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ativarAvisos } from '@/lib/push';
import { logoutServidor } from '@/lib/equipe';
import { ItemNav, MobileNav } from '@/components/ui';
import { LOGIN_PROFESSOR_LIBERADO, LOGIN_RESPONSAVEL_LIBERADO } from '@/lib/acesso';

/* ============================================================
   Cada aba é carregada SÓ quando aberta.

   Antes as 13 abas eram importadas no topo e entravam todas no
   pacote inicial: o professor que só avalia baixava Painel, Grade,
   Cadastro, Acessos, Hidro e Checklist junto. Medido com Lighthouse
   em 25/10: 415 KB de JavaScript, dos quais 146 KB nunca executados,
   e 1.230 ms de thread principal travada.

   `ssr: false` porque todas dependem do `localStorage` e do Supabase
   no navegador — renderizar no servidor não adiantaria nada.

   O `LoginModule` fica estático de propósito: é a primeira tela de
   quem não está logado, e adiar o carregamento dela só atrasaria o
   que a pessoa veio fazer.
   ============================================================ */

const carregando = () => (
  <div className="flex-1 flex items-center justify-center p-8">
    <Loading />
  </div>
);

const SwimmingModule = dynamic(
  () => import('@/components/swimming/SwimmingModule').then(m => m.SwimmingModule),
  { ssr: false, loading: carregando }
);
const ChecklistModule = dynamic(
  () => import('@/components/checklist-module').then(m => m.ChecklistModule),
  { ssr: false, loading: carregando }
);
const MaintenanceModule = dynamic(
  () => import('@/components/maintenance-module').then(m => m.MaintenanceModule),
  { ssr: false, loading: carregando }
);
const RegistrationModule = dynamic(
  () => import('@/components/registration-module').then(m => m.RegistrationModule),
  { ssr: false, loading: carregando }
);
const ClientPortal = dynamic(
  () => import('@/components/client-portal').then(m => m.ClientPortal),
  { ssr: false, loading: carregando }
);
const ProfessorsModule = dynamic(
  () => import('@/components/professors-module').then(m => m.ProfessorsModule),
  { ssr: false, loading: carregando }
);
const StudentsModule = dynamic(
  () => import('@/components/students-module').then(m => m.StudentsModule),
  { ssr: false, loading: carregando }
);
const ScheduleModule = dynamic(
  () => import('@/components/schedule-module').then(m => m.ScheduleModule),
  { ssr: false, loading: carregando }
);
const DashboardModule = dynamic(
  () => import('@/components/dashboard-module').then(m => m.DashboardModule),
  { ssr: false, loading: carregando }
);
const AccessModule = dynamic(
  () => import('@/components/access-module').then(m => m.AccessModule),
  { ssr: false, loading: carregando }
);
const MinhaSemana = dynamic(
  () => import('@/components/minha-semana').then(m => m.MinhaSemana),
  { ssr: false, loading: carregando }
);
const HidroModule = dynamic(
  () => import('@/components/hidro-module').then(m => m.HidroModule),
  { ssr: false, loading: carregando }
);

type Tab = 'dashboard' | 'acessos' | 'hidro' | 'swimming' | 'avulsos' | 'sabado' | 'cleaning' | 'maintenance' | 'registration' | 'students' | 'professors' | 'schedule';
type UserState = { role: 'admin' | 'teacher' | 'client'; data: any } | null;

// ==========================================
// CARTA NA MANGA: ALARME GLOBAL PARA O ADMIN
// ==========================================
function GlobalNotifier() {
  const [alert, setAlert] = useState<{title: string, message: string} | null>(null);

  /**
   * O navegador só deixa tocar som depois de a pessoa interagir com a
   * página — mas serve QUALQUER toque, não precisa de um botão dedicado.
   *
   * Antes havia um botão laranja "Ligar o Alarme Sonoro" fixo no rodapé.
   * Como o estado dele não era lembrado, voltava a cada recarga, e ainda
   * cobria a barra de abas. Agora o primeiro toque em qualquer lugar já
   * destrava, e a pessoa nem percebe.
   */
  useEffect(() => {
    const destravar = () => {
      try {
        const audio = new Audio('https://www.soundjay.com/buttons/button-09.mp3');
        audio.volume = 0;          // silencioso: serve só para liberar o áudio
        audio.play().catch(() => {});
      } catch { /* sem áudio neste aparelho: segue sem som */ }
    };
    window.addEventListener('pointerdown', destravar, { once: true });
    window.addEventListener('keydown', destravar, { once: true });
    return () => {
      window.removeEventListener('pointerdown', destravar);
      window.removeEventListener('keydown', destravar);
    };
  }, []);

  useEffect(() => {
    const playSound = () => {
      try {
        if ("vibrate" in navigator) {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }
        const audio = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');
        audio.volume = 1.0;
        audio.play().catch(() => {});
      } catch(e) {}
    };

    const handlePayload = (payload: any) => {
      const isInsert = payload.eventType === 'INSERT';
      const isPhotoUpdate = payload.eventType === 'UPDATE' && payload.new.photo_url && payload.old.photo_url !== payload.new.photo_url;
      
      if (isInsert) {
        playSound();
        setAlert({ title: "🚨 NOVO CHAMADO!", message: `Tarefa criada: ${payload.new.title}` });
      } else if (isPhotoUpdate) {
        playSound();
        setAlert({ title: "📸 NOVA FOTO ANEXADA!", message: `A foto foi enviada para: ${payload.new.title}` });
      }
    };

    const channelM = supabase.channel('global_m').on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_tasks' }, handlePayload).subscribe();
    const channelC = supabase.channel('global_c').on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_tasks' }, handlePayload).subscribe();

    return () => {
      supabase.removeChannel(channelM);
      supabase.removeChannel(channelC);
    };
  }, []);

  return (
    <>
      {alert && (
        <div
          className="fixed top-20 left-4 right-4 z-[99999] md:left-auto md:right-10 md:w-96 bg-danger text-white rounded-panel p-6 shadow-[0_20px_60px_rgba(220,38,38,0.8)] border-4 border-danger motion-safe:animate-[desce_.22s_ease-out]"
        >
          <button onClick={() => setAlert(null)} className="absolute top-4 right-4 p-2 bg-danger-ink/50 hover:bg-danger-ink rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-danger rounded-card animate-pulse">
              <AlertTriangle className="w-10 h-10 text-brand-bright" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-widest text-white leading-tight">{alert.title}</h2>
          </div>
          <p className="text-danger-soft font-bold ml-16 text-lg">{alert.message}</p>
          <button onClick={() => setAlert(null)} className="mt-6 w-full bg-white text-danger-ink font-black py-4 rounded-control hover:bg-danger-soft active:scale-95 transition-all text-lg shadow-lg">
            Ciente!
          </button>
        </div>
      )}
    </>
  );
}
// ==========================================

export default function Page() {
  const [user, setUser] = useState<UserState>(null);
  const [activeTab, setActiveTab] = useState<Tab>('swimming');
  const [isLoaded, setIsLoaded] = useState(false);
  /** Quantas trocas de aba já empilhadas no histórico do navegador nesta sessão de tela — controla se a seta de voltar aparece. */
  const [navDepth, setNavDepth] = useState(0);

  /** Troca de aba "oficial": só muda o estado — quem mexe no histórico é o efeito abaixo. */
  const irPara = (tab: Tab) => setActiveTab(tab);

  /**
   * Mantém o histórico do navegador em sincronia com a aba ativa, sempre que
   * ela mudar — mas SÓ como efeito (depois do render), nunca direto dentro
   * do clique. Mexer no histórico no meio de um evento de clique colidia com
   * o roteador interno do Next.js ("Cannot update a component while
   * rendering a different component"): o Next também escuta pushState/
   * popstate, e as duas coisas competindo no mesmo instante confundiam o
   * React. Aqui, sempre um passo depois, não tem mais conflito.
   *
   * A checagem contra `history.state` (em vez de um contador cru) faz o
   * efeito ser idempotente: se ele rodar duas vezes para a mesma troca —
   * o StrictMode do React faz isso de propósito em desenvolvimento — a
   * segunda vez já encontra o histórico atualizado e não empilha de novo.
   * Isso também cobre o "voltar": quando o popstate já trocou a aba, o
   * histórico do navegador já bate com `activeTab`, então nada é empilhado.
   */
  useEffect(() => {
    if (!isLoaded) return;
    const estado = window.history.state as { olimpoTab?: Tab; olimpoDepth?: number } | null;
    if (estado?.olimpoTab === activeTab) return;
    const novaProfundidade = (estado?.olimpoDepth ?? 0) + 1;
    window.history.pushState({ olimpoTab: activeTab, olimpoDepth: novaProfundidade }, '', window.location.pathname);
    setNavDepth(novaProfundidade);
  }, [activeTab, isLoaded]);

  useEffect(() => {
    let tabInicial: Tab = 'swimming';
    const savedUser = localStorage.getItem('olimpo_session');
    if (savedUser) {
      const sessao = JSON.parse(savedUser);
      // sessão de um papel hoje bloqueado não vale mais: derruba na abertura,
      // senão quem já tinha entrado antes da trava continuaria dentro
      const bloqueado =
        (sessao?.role === 'teacher' && !LOGIN_PROFESSOR_LIBERADO) ||
        (sessao?.role === 'client' && !LOGIN_RESPONSAVEL_LIBERADO);

      if (bloqueado) {
        localStorage.removeItem('olimpo_session');
      } else {
        setUser(sessao);
        // admin abre no Painel; professor continua caindo direto na Avaliação
        if (sessao?.role === 'admin') tabInicial = 'dashboard';
      }
    }
    setActiveTab(tabInicial);
    // base do histórico: é para aqui que o botão de voltar do celular cai
    // quando não sobra mais nenhuma troca de aba nossa para desfazer.
    window.history.replaceState({ olimpoTab: tabInicial, olimpoDepth: 0 }, '', window.location.pathname);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('PWA Error', err));
    }

    // MÁGICA DE TELETRANSPORTE: Permite que outros módulos troquem a aba
    const handleJump = (e: any) => irPara(e.detail);
    window.addEventListener('jumpToTab', handleJump);

    // botão/gesto de voltar do celular (ou do navegador): lê a aba que
    // ficou guardada naquela entrada do histórico e volta para ela.
    const handlePopState = (e: PopStateEvent) => {
      const tab = e.state?.olimpoTab as Tab | undefined;
      const depth = (e.state?.olimpoDepth as number | undefined) ?? 0;
      if (tab) setActiveTab(tab);
      setNavDepth(depth);
    };
    window.addEventListener('popstate', handlePopState);

    setIsLoaded(true);

    return () => {
      window.removeEventListener('jumpToTab', handleJump);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  if (!isLoaded) return null;

  if (!user) {
    return <LoginModule onLogin={(role, data) => {
      const session = { role, data };
      localStorage.setItem('olimpo_session', JSON.stringify(session));
      setUser(session);
      if (role === 'admin') irPara('dashboard');
    }} />;
  }

  if (user.role === 'client') {
    return <ClientPortal
      students={Array.isArray(user.data) ? user.data : [user.data]}
      onLogout={() => {
        localStorage.removeItem('olimpo_session');
        logoutServidor();
        setUser(null);
      }}
    />;
  }

  const isAdmin = user.role === 'admin';
  // o admin master e quem convida e corta acesso dos outros
  const isMaster = isAdmin && user.data?.is_master === true;
  const isTeacher = user.role === 'teacher';
  const isStaff = isAdmin || isTeacher; 

  /**
   * Sair de verdade.
   *
   * Limpar o `localStorage` só esvazia a INTERFACE. Quem autoriza as
   * rotas é o cookie de sessão, que é HttpOnly — o JavaScript da página
   * não consegue apagá-lo, só o servidor. Sem a chamada abaixo, "sair"
   * deixaria a sessão viva por 30 dias: no aparelho da recepção, a
   * pessoa seguinte continuaria autorizada a ler a ficha dos alunos.
   */
  const handleLogout = () => {
    localStorage.removeItem('olimpo_session');
    logoutServidor();
    setUser(null);
  };

  /**
   * Registra ESTE aparelho para receber os chamados de limpeza e manutenção.
   *
   * Tinha aqui uma segunda cópia de toda a inscrição — com a chave VAPID
   * escrita à mão e sem gravar a coluna `tipo`, que é o que separa aparelho
   * de admin de aparelho de responsável. Agora usa o mesmo caminho do
   * portal dos pais (lib/push.ts), que já grava o `tipo` e não duplica
   * aparelho já inscrito.
   */
  const activateNotifications = async () => {
    try {
      await ativarAvisos('', 'admin');
      avisar('🔔 Pronto! Este aparelho vai receber os chamados.');
    } catch (err: any) {
      avisar(err?.message || 'Não consegui ativar os avisos neste aparelho.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-canvas font-sans overflow-hidden overflow-x-clip">
      
      {isAdmin && <GlobalNotifier />}
      {/* convite para instalar o app — antes so aparecia no portal dos pais */}
      <InstallPrompt acimaDaBarra />

      <div className="md:hidden relative flex items-center justify-between bg-surface-deep text-ink-inverse p-4 shrink-0 shadow-raised z-30">
        {/* mesma textura de raia da barra lateral, para as duas larguras
            de tela terem a mesma identidade */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='16'%3E%3Cpath d='M0 8q10-6 20 0t20 0 20 0 20 0' fill='none' stroke='%23ffffff' stroke-width='1.5'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative flex items-center gap-2">
          {/* só aparece quando existe uma troca de aba nossa para desfazer —
              mesmo botão que o gesto/tecla de voltar do celular já usa. */}
          {navDepth > 0 && (
            <button onClick={() => window.history.back()} aria-label="Voltar" className="p-2 -ml-1 text-ink-on-dark hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Image src="/logo.png" alt="Logo" width={36} height={36} className="w-9 h-9 object-contain" />
          <span className="font-bold text-sm tracking-tight uppercase">Clube <span className="text-brand">Olimpo</span></span>
        </div>
        
        <div className="relative flex items-center gap-2">
          {isAdmin && (
             <button onClick={activateNotifications} className="p-2 text-brand-bright hover:text-white transition-colors bg-surface-raised rounded-control border border-brand/30 shadow-lg shadow-brand/10">
               <BellRing className="w-5 h-5" />
             </button>
          )}

          <button onClick={handleLogout} className="p-2 text-ink-on-dark-muted hover:text-white transition-colors bg-surface-raised rounded-control">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <header className="hidden md:flex bg-surface-deep text-ink-inverse shrink-0 w-60 lg:w-72 flex-col z-20 shadow-overlay relative">
        {/*
          Textura de raia de piscina, bem discreta.

          É um SVG em `data:` de ~190 bytes, posto por CSS: não entra
          no HTML de cada render e não vira requisição. A opacidade
          baixa é o ponto — a textura deve se notar de perto e sumir
          de longe, nunca competir com o nome das abas.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-40 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='16'%3E%3Cpath d='M0 8q10-6 20 0t20 0 20 0 20 0' fill='none' stroke='%23ffffff' stroke-width='1.5'/%3E%3C/svg%3E\")",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand/20 to-transparent pointer-events-none"
        />

        <div className="relative p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-control overflow-hidden shrink-0">
            <Image src="/logo.png" alt="Logo Clube Olimpo" width={40} height={40} className="w-full h-full object-contain" />
          </div>
          <span className="font-titulo font-semibold text-lg tracking-tight uppercase">
            Clube <span className="text-brand-bright">Olimpo</span>
          </span>
        </div>

        {/*
          A navegação virou lista de dados.

          Eram 13 botões escritos à mão com a mesma cadeia de classes
          copiada: item novo nascia por cópia, e mudar o visual da
          navegação era mudar 13 lugares. O `quem` de cada item é o
          mesmo que decide a renderização da aba lá embaixo.
        */}
        <nav className="relative flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-1">
          {([
            { aba: 'dashboard',    icone: LayoutDashboard, rotulo: 'Painel',             quem: isAdmin },
            { aba: 'registration', icone: UserPlus,        rotulo: 'Cadastro Alunos',    quem: isAdmin },
            { aba: 'students',     icone: Users,           rotulo: 'Alunos',             quem: isAdmin },
            { aba: 'swimming',     icone: Droplets,        rotulo: 'Avaliação Natação',  quem: true },
            { aba: 'avulsos',      icone: Sparkles,        rotulo: 'Avulsos & Wellhub',  quem: isStaff },
            { aba: 'sabado',       icone: CalendarClock,   rotulo: 'Avaliação Sábado',   quem: isAdmin },
            { aba: 'hidro',        icone: Waves,           rotulo: 'Hidro',              quem: isStaff },
            { aba: 'cleaning',     icone: ClipboardList,   rotulo: 'Checklist Limpeza',  quem: isStaff },
            { aba: 'maintenance',  icone: Wrench,          rotulo: 'Manutenção',         quem: isStaff },
            { aba: 'professors',   icone: GraduationCap,   rotulo: 'Professores',        quem: isAdmin },
            { aba: 'schedule',     icone: CalendarDays,    rotulo: isAdmin ? 'Grade de Horários' : 'Minha semana', quem: isStaff },
            { aba: 'acessos',      icone: ShieldCheck,     rotulo: 'Acessos',            quem: isMaster },
          ] as const)
            .filter(i => i.quem)
            .map(i => (
              <ItemNav
                key={i.aba}
                icone={i.icone}
                rotulo={i.rotulo}
                ativo={activeTab === i.aba}
                aoClicar={() => irPara(i.aba as Tab)}
              />
            ))}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-surface-raised-soft">
              <button
                onClick={activateNotifications}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-control border border-brand/40
                           bg-brand/10 text-brand-bright hover:bg-brand hover:text-brand-ink transition-colors"
              >
                <BellRing className="w-5 h-5" />
                <span className="font-bold text-sm">Forçar PWA</span>
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-ink-on-dark-muted hover:text-white hover:bg-surface-raised rounded-control transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="font-bold text-xs uppercase tracking-wider">Sair do Sistema</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-w-0 bg-surface-sunken overflow-y-auto relative z-10 custom-scrollbar pb-6">
        {activeTab === 'dashboard' && isAdmin && <DashboardModule />}
        {activeTab === 'acessos' && isMaster && <AccessModule meuNome={user.data?.username || user.data?.name || ''} />}
        {activeTab === 'registration' && isAdmin && <RegistrationModule onSuccess={() => irPara('swimming')} />}
        {activeTab === 'students' && isAdmin && <StudentsModule />}
        {activeTab === 'swimming' && <SwimmingModule />}
        {activeTab === 'avulsos' && isStaff && <SwimmingModule escopo="sem-turma" />}
        {activeTab === 'sabado' && isAdmin && <SwimmingModule escopo="sabado" />}
        {activeTab === 'cleaning' && isStaff && <ChecklistModule />}
        {activeTab === 'maintenance' && isStaff && <MaintenanceModule />}
        {activeTab === 'professors' && isAdmin && <ProfessorsModule />}
        {activeTab === 'hidro' && isStaff && <HidroModule />}
        {activeTab === 'schedule' && isAdmin && <ScheduleModule />}
        {activeTab === 'schedule' && isTeacher && <MinhaSemana meuNome={user.data?.name || user.data?.username || ''} />}
      </main>

      {/* No celular a barra vem DEPOIS do conteudo: empilhando na ordem do
       * codigo, e isso que a coloca no rodape, ao alcance do polegar. */}
      <MobileNav
        items={[
          // no celular cabem 4 atalhos fixos; o resto vai para o menu "Mais"
          ...(isAdmin ? [{ key: 'dashboard', label: 'Painel', icon: LayoutDashboard, primary: true }] : []),
          { key: 'swimming', label: 'Avaliação', icon: Droplets, primary: true },
          ...(isAdmin ? [{ key: 'sabado', label: 'Sábado', icon: CalendarClock, primary: true }] : []),
          { key: 'schedule', label: isAdmin ? 'Grade' : 'Semana', icon: CalendarDays, primary: true },
          { key: 'avulsos', label: 'Avulsos', icon: Sparkles },
          ...(isAdmin ? [{ key: 'registration', label: 'Cadastro', icon: UserPlus }] : []),
          ...(isAdmin ? [{ key: 'students', label: 'Alunos', icon: Users }] : []),
          { key: 'hidro', label: 'Hidro', icon: Waves },
          { key: 'cleaning', label: 'Limpeza', icon: ClipboardList },
          { key: 'maintenance', label: 'Manutenção', icon: Wrench },
          ...(isAdmin ? [{ key: 'professors', label: 'Professores', icon: GraduationCap }] : []),
          ...(isMaster ? [{ key: 'acessos', label: 'Acessos', icon: ShieldCheck }] : []),
        ]}
        active={activeTab}
        onSelect={(k) => irPara(k as Tab)}
      />
    </div>
  );
}
