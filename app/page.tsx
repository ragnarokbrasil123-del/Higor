'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SwimmingModule } from '@/components/swimming/SwimmingModule';
import { ChecklistModule } from '@/components/checklist-module';
import { MaintenanceModule } from '@/components/maintenance-module';
import { RegistrationModule } from '@/components/registration-module';
import { LoginModule } from '@/components/login-module';
import { ClientPortal } from '@/components/client-portal';
import { ProfessorsModule } from '@/components/professors-module';
import { StudentsModule } from '@/components/students-module';
import { ScheduleModule } from '@/components/schedule-module';
import { DashboardModule } from '@/components/dashboard-module';
import { AccessModule } from '@/components/access-module';
import { Droplets, ClipboardList, UserPlus, GraduationCap, LogOut, Wrench, BellRing, AlertTriangle, X, CalendarDays, Users, Sparkles, CalendarClock, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { MobileNav } from '@/components/ui';
import { LOGIN_PROFESSOR_LIBERADO, LOGIN_RESPONSAVEL_LIBERADO } from '@/lib/acesso';

type Tab = 'dashboard' | 'acessos' | 'swimming' | 'avulsos' | 'sabado' | 'cleaning' | 'maintenance' | 'registration' | 'students' | 'professors' | 'schedule';
type UserState = { role: 'admin' | 'teacher' | 'client'; data: any } | null;

// ==========================================
// CARTA NA MANGA: ALARME GLOBAL PARA O ADMIN
// ==========================================
function GlobalNotifier() {
  const [alert, setAlert] = useState<{title: string, message: string} | null>(null);
  const [soundUnlocked, setSoundUnlocked] = useState(false);

  const unlockSound = () => {
    setSoundUnlocked(true);
    try {
      const audio = new Audio('https://www.soundjay.com/buttons/button-09.mp3');
      audio.volume = 0.1;
      audio.play().catch(()=>{});
    } catch(e) {}
  };

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
      {!soundUnlocked && (
        <button onClick={unlockSound} className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[99999] bg-amber-500 text-black px-6 py-3 rounded-full font-bold shadow-2xl animate-bounce hover:bg-amber-400 transition-colors">
          🔊 Clique aqui para Ligar o Alarme Sonoro
        </button>
      )}

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

  useEffect(() => {
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
        if (sessao?.role === 'admin') setActiveTab('dashboard');
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('PWA Error', err));
    }
    
    // MÁGICA DE TELETRANSPORTE: Permite que outros módulos troquem a aba
    const handleJump = (e: any) => setActiveTab(e.detail);
    window.addEventListener('jumpToTab', handleJump);
    
    setIsLoaded(true);
    
    return () => window.removeEventListener('jumpToTab', handleJump);
  }, []);

  if (!isLoaded) return null;

  if (!user) {
    return <LoginModule onLogin={(role, data) => {
      const session = { role, data };
      localStorage.setItem('olimpo_session', JSON.stringify(session));
      setUser(session);
      if (role === 'admin') setActiveTab('dashboard');
    }} />;
  }

  if (user.role === 'client') {
    return <ClientPortal
      students={Array.isArray(user.data) ? user.data : [user.data]}
      onLogout={() => {
        localStorage.removeItem('olimpo_session');
        setUser(null);
      }} 
    />;
  }

  const isAdmin = user.role === 'admin';
  // o admin master e quem convida e corta acesso dos outros
  const isMaster = isAdmin && user.data?.is_master === true;
  const isTeacher = user.role === 'teacher';
  const isStaff = isAdmin || isTeacher; 

  const handleLogout = () => {
    localStorage.removeItem('olimpo_session');
    setUser(null);
  };

  const activateNotifications = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('O seu navegador não suporta notificações nativas.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return alert('Você precisa Clicar em PERMITIR no aviso!');
      
      const registration = await navigator.serviceWorker.ready;
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
        return outputArray;
      };

      const publicVapidKey = "BJx64L626N6Y5tY_D7goVf4l-PO2vpgax3PXFSDN59avftuq8_hWN3Neor_yff2j4GVwWhdWMKC1luKocmhClrg";
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      const { error } = await supabase.from('push_subscriptions').insert([{ subscription }]);
      if (error) alert('Erro ao salvar aparelho. A tabela existe?');
      else alert('🔔 FEITO! Aparelho Registrado na Nuvem!');
    } catch (err: any) {
      alert('Erro técnico ao ativar: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-canvas font-sans overflow-hidden overflow-x-clip">
      
      {isAdmin && <GlobalNotifier />}

      <div className="md:hidden flex items-center justify-between bg-slate-950 text-white p-4 shrink-0 shadow-md z-30">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-sm tracking-tight uppercase">Clube <span className="text-amber-500">Olimpo</span></span>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
             <button onClick={activateNotifications} className="p-2 text-amber-400 hover:text-white transition-colors bg-slate-900 rounded-lg border border-amber-500/30 shadow-lg shadow-amber-500/10">
               <BellRing className="w-5 h-5" />
             </button>
          )}

          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-900 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <header className="hidden md:flex bg-slate-950 text-white shrink-0 w-60 lg:w-72 flex-col z-20 shadow-2xl relative">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
            <img src="/logo.png" alt="Logo Clube Olimpo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-lg tracking-tight uppercase">
            Clube <span className="text-amber-500">Olimpo</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-1">
          {isAdmin && (
            <button onClick={() => setActiveTab('dashboard')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'dashboard' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-bold text-sm">Painel</span>
            </button>
          )}

          <button onClick={() => setActiveTab('registration')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'registration' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
            <UserPlus className="w-5 h-5" />
            <span className="font-bold text-sm">Cadastro Alunos</span>
          </button>

          {isAdmin && (
            <button onClick={() => setActiveTab('students')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'students' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
              <Users className="w-5 h-5" />
              <span className="font-bold text-sm">Alunos</span>
            </button>
          )}

          <button onClick={() => setActiveTab('swimming')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'swimming' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
            <Droplets className="w-5 h-5" />
            <span className="font-bold text-sm">Avaliação Natação</span>
          </button>

          {isAdmin && (
            <button onClick={() => setActiveTab('avulsos')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'avulsos' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
              <Sparkles className="w-5 h-5" />
              <span className="font-bold text-sm">Avulsos & Wellhub</span>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setActiveTab('sabado')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'sabado' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
              <CalendarClock className="w-5 h-5" />
              <span className="font-bold text-sm">Avaliação Sábado</span>
            </button>
          )}

          {isStaff && (
            <button onClick={() => setActiveTab('cleaning')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'cleaning' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
              <ClipboardList className="w-5 h-5" />
              <span className="font-bold text-sm">Checklist Limpeza</span>
            </button>
          )}

          {isStaff && (
            <button onClick={() => setActiveTab('maintenance')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'maintenance' ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
              <Wrench className="w-5 h-5" />
              <span className="font-bold text-sm">Manutenção</span>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setActiveTab('professors')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'professors' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
              <GraduationCap className="w-5 h-5" />
              <span className="font-bold text-sm">Professores</span>
            </button>
          )}

          {isStaff && (
            <button onClick={() => setActiveTab('schedule')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'schedule' ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
              <CalendarDays className="w-5 h-5" />
              <span className="font-bold text-sm">Grade de Horários</span>
            </button>
          )}

          {isMaster && (
            <button onClick={() => setActiveTab('acessos')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'acessos' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
              <ShieldCheck className="w-5 h-5" />
              <span className="font-bold text-sm">Acessos</span>
            </button>
          )}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-800">
               <button onClick={activateNotifications} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black rounded-xl transition-all border border-amber-500/30">
                 <BellRing className="w-5 h-5" />
                 <span className="font-bold text-sm">Forçar PWA</span>
               </button>
            </div>
          )}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="font-bold text-xs uppercase tracking-wider">Sair do Sistema</span>
          </button>
        </div>
      </header>

      <MobileNav
        items={[
          // no celular cabem 4 atalhos fixos; o resto vai para o menu "Mais"
          ...(isAdmin ? [{ key: 'dashboard', label: 'Painel', icon: LayoutDashboard, primary: true }] : []),
          { key: 'swimming', label: 'Avaliação', icon: Droplets, primary: true },
          ...(isAdmin ? [{ key: 'sabado', label: 'Sábado', icon: CalendarClock, primary: true }] : []),
          { key: 'schedule', label: 'Grade', icon: CalendarDays, primary: true },
          ...(isAdmin ? [{ key: 'avulsos', label: 'Avulsos', icon: Sparkles }] : []),
          { key: 'registration', label: 'Cadastro', icon: UserPlus },
          ...(isAdmin ? [{ key: 'students', label: 'Alunos', icon: Users }] : []),
          { key: 'cleaning', label: 'Limpeza', icon: ClipboardList },
          { key: 'maintenance', label: 'Manutenção', icon: Wrench },
          ...(isAdmin ? [{ key: 'professors', label: 'Professores', icon: GraduationCap }] : []),
          ...(isMaster ? [{ key: 'acessos', label: 'Acessos', icon: ShieldCheck }] : []),
        ]}
        active={activeTab}
        onSelect={(k) => setActiveTab(k as Tab)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto relative z-10 custom-scrollbar pb-6">
        {activeTab === 'dashboard' && isAdmin && <DashboardModule />}
        {activeTab === 'acessos' && isMaster && <AccessModule meuNome={user.data?.username || user.data?.name || ''} />}
        {activeTab === 'registration' && <RegistrationModule onSuccess={() => setActiveTab('swimming')} />}
        {activeTab === 'students' && isAdmin && <StudentsModule />}
        {activeTab === 'swimming' && <SwimmingModule />}
        {activeTab === 'avulsos' && isAdmin && <SwimmingModule escopo="sem-turma" />}
        {activeTab === 'sabado' && isAdmin && <SwimmingModule escopo="sabado" />}
        {activeTab === 'cleaning' && isStaff && <ChecklistModule />}
        {activeTab === 'maintenance' && isStaff && <MaintenanceModule />}
        {activeTab === 'professors' && isAdmin && <ProfessorsModule />}
        {activeTab === 'schedule' && isStaff && <ScheduleModule />}
      </main>
    </div>
  );
}
