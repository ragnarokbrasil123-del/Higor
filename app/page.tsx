'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { LoginModule } from '@/components/login-module';
import { InstallPrompt } from '@/components/install-prompt';
import { Loading , avisar } from '@/components/ui';
import { Droplets, ClipboardList, UserPlus, GraduationCap, LogOut, Wrench, BellRing, AlertTriangle, X, CalendarDays, Users, Sparkles, CalendarClock, LayoutDashboard, ShieldCheck, Waves, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { ativarAvisos } from '@/lib/push';
import { logoutServidor } from '@/lib/equipe';
import { MobileNav } from '@/components/ui';
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
      <AnimatePresence>
        {alert && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-20 left-4 right-4 z-[99999] md:left-auto md:right-10 md:w-96 bg-red-600 text-white rounded-3xl p-6 shadow-[0_20px_60px_rgba(220,38,38,0.8)] border-4 border-red-400"
          >
            <button onClick={() => setAlert(null)} className="absolute top-4 right-4 p-2 bg-red-700/50 hover:bg-red-800 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-red-500 rounded-2xl animate-pulse">
                <AlertTriangle className="w-10 h-10 text-yellow-300" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-widest text-white leading-tight">{alert.title}</h2>
            </div>
            <p className="text-red-100 font-bold ml-16 text-lg">{alert.message}</p>
            <button onClick={() => setAlert(null)} className="mt-6 w-full bg-white text-red-700 font-black py-4 rounded-xl hover:bg-red-50 active:scale-95 transition-all text-lg shadow-lg">
              Ciente!
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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

      <div className="md:hidden flex items-center justify-between bg-surface-deep text-white p-4 shrink-0 shadow-md z-30">
        <div className="flex items-center gap-2">
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
        
        <div className="flex items-center gap-2">
          {isAdmin && (
             <button onClick={activateNotifications} className="p-2 text-brand-bright hover:text-white transition-colors bg-surface-raised rounded-lg border border-brand/30 shadow-lg shadow-brand/10">
               <BellRing className="w-5 h-5" />
             </button>
          )}

          <button onClick={handleLogout} className="p-2 text-ink-on-dark-muted hover:text-white transition-colors bg-surface-raised rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <header className="hidden md:flex bg-surface-deep text-white shrink-0 w-60 lg:w-72 flex-col z-20 shadow-2xl relative">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
            <Image src="/logo.png" alt="Logo Clube Olimpo" width={40} height={40} className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight uppercase">
            Clube <span className="text-brand">Olimpo</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-1">
          {isAdmin && (
            <button onClick={() => irPara('dashboard')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'dashboard' ? "bg-brand text-black border-brand shadow-lg shadow-brand/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-bold text-sm">Painel</span>
            </button>
          )}

          {/* matricular aluno e importar planilha e trabalho de secretaria */}
          {isAdmin && (
            <button onClick={() => irPara('registration')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'registration' ? "bg-brand text-black border-brand shadow-lg shadow-brand/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <UserPlus className="w-5 h-5" />
              <span className="font-bold text-sm">Cadastro Alunos</span>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => irPara('students')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'students' ? "bg-brand text-black border-brand shadow-lg shadow-brand/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <Users className="w-5 h-5" />
              <span className="font-bold text-sm">Alunos</span>
            </button>
          )}

          <button onClick={() => irPara('swimming')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'swimming' ? "bg-brand text-black border-brand shadow-lg shadow-brand/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
            <Droplets className="w-5 h-5" />
            <span className="font-bold text-sm">Avaliação Natação</span>
          </button>

          {isStaff && (
            <button onClick={() => irPara('avulsos')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'avulsos' ? "bg-brand text-black border-brand shadow-lg shadow-brand/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <Sparkles className="w-5 h-5" />
              <span className="font-bold text-sm">Avulsos & Wellhub</span>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => irPara('sabado')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'sabado' ? "bg-brand text-black border-brand shadow-lg shadow-brand/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <CalendarClock className="w-5 h-5" />
              <span className="font-bold text-sm">Avaliação Sábado</span>
            </button>
          )}

          {isStaff && (
            <button onClick={() => irPara('hidro')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'hidro' ? "bg-cyan-500 text-black border-cyan-500 shadow-lg shadow-cyan-500/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <Waves className="w-5 h-5" />
              <span className="font-bold text-sm">Hidro</span>
            </button>
          )}

          {isStaff && (
            <button onClick={() => irPara('cleaning')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'cleaning' ? "bg-brand text-black border-brand shadow-lg shadow-brand/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <ClipboardList className="w-5 h-5" />
              <span className="font-bold text-sm">Checklist Limpeza</span>
            </button>
          )}

          {isStaff && (
            <button onClick={() => irPara('maintenance')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'maintenance' ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <Wrench className="w-5 h-5" />
              <span className="font-bold text-sm">Manutenção</span>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => irPara('professors')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'professors' ? "bg-brand text-black border-brand shadow-lg shadow-brand/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <GraduationCap className="w-5 h-5" />
              <span className="font-bold text-sm">Professores</span>
            </button>
          )}

          {isStaff && (
            <button onClick={() => irPara('schedule')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'schedule' ? "bg-info text-white border-info shadow-lg shadow-info/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <CalendarDays className="w-5 h-5" />
              {/* o professor consulta a propria agenda; so o admin edita a grade */}
              <span className="font-bold text-sm">{isAdmin ? 'Grade de Horários' : 'Minha semana'}</span>
            </button>
          )}

          {isMaster && (
            <button onClick={() => irPara('acessos')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'acessos' ? "bg-brand text-black border-brand shadow-lg shadow-brand/20" : "hover:bg-surface-raised text-ink-on-dark border-transparent")}>
              <ShieldCheck className="w-5 h-5" />
              <span className="font-bold text-sm">Acessos</span>
            </button>
          )}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-surface-raised-soft">
               <button onClick={activateNotifications} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-brand/10 text-brand-bright hover:bg-brand hover:text-black rounded-xl transition-all border border-brand/30">
                 <BellRing className="w-5 h-5" />
                 <span className="font-bold text-sm">Forçar PWA</span>
               </button>
            </div>
          )}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-ink-on-dark-muted hover:text-white hover:bg-surface-raised rounded-xl transition-colors">
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
