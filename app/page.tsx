'use client';

import React, { useState, useEffect } from 'react';
import { SwimmingModule } from '@/components/swimming-module';
import { ChecklistModule } from '@/components/checklist-module';
import { MaintenanceModule } from '@/components/maintenance-module';
import { RegistrationModule } from '@/components/registration-module';
import { LoginModule } from '@/components/login-module';
import { ClientPortal } from '@/components/client-portal';
import { TeamModule } from '@/components/team-module';
import { Droplets, ClipboardList, UserPlus, ShieldCheck, LogOut, Wrench } from 'lucide-react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

type Tab = 'swimming' | 'cleaning' | 'maintenance' | 'registration' | 'team';
type UserState = { role: 'admin' | 'teacher' | 'client'; data: any } | null;

export default function Page() {
  const [user, setUser] = useState<UserState>(null);
  const [activeTab, setActiveTab] = useState<Tab>('swimming');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('olimpo_session');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('PWA Error', err));
    }
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  if (!user) {
    return <LoginModule onLogin={(role, data) => {
      const session = { role, data };
      localStorage.setItem('olimpo_session', JSON.stringify(session));
      setUser(session);
    }} />;
  }

  if (user.role === 'client') {
    return <ClientPortal 
      student={user.data} 
      onLogout={() => {
        localStorage.removeItem('olimpo_session');
        setUser(null);
      }} 
    />;
  }

  const isAdmin = user.role === 'admin';
  const isTeacher = user.role === 'teacher';
  const isStaff = isAdmin || isTeacher; 

  const handleLogout = () => {
    localStorage.removeItem('olimpo_session');
    setUser(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-slate-50 font-sans overflow-hidden">
      
      {/* === HEADER MOBILE (Visível apenas no celular) === */}
      <div className="md:hidden flex items-center justify-between bg-slate-950 text-white p-4 shrink-0 shadow-md z-30">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-sm tracking-tight uppercase">Clube <span className="text-amber-500">Olimpo</span></span>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-900 rounded-lg">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* === MENU LATERAL DESKTOP (Oculto no celular) === */}
      <header className="hidden md:flex bg-slate-950 text-white shrink-0 w-72 flex-col z-20 shadow-2xl relative">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
            <img src="/logo.png" alt="Logo Clube Olimpo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-lg tracking-tight uppercase">
            Clube <span className="text-amber-500">Olimpo</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-1">
          <button onClick={() => setActiveTab('registration')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'registration' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
            <UserPlus className="w-5 h-5" />
            <span className="font-bold text-sm">Cadastro Alunos</span>
          </button>
          
          <button onClick={() => setActiveTab('swimming')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'swimming' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
            <Droplets className="w-5 h-5" />
            <span className="font-bold text-sm">Avaliação Natação</span>
          </button>

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
            <button onClick={() => setActiveTab('team')} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border", activeTab === 'team' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "hover:bg-slate-900 text-slate-300 border-transparent")}>
              <ShieldCheck className="w-5 h-5" />
              <span className="font-bold text-sm">Equipe & Senhas</span>
            </button>
          )}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="font-bold text-xs uppercase tracking-wider">Sair do Sistema</span>
          </button>
        </div>
      </header>

      {/* === MENU MOBILE FOOTER === */}
      <div className="md:hidden flex items-center justify-between px-2 py-3 bg-slate-950 border-t border-slate-900 z-50 shrink-0">
        <button onClick={() => setActiveTab('registration')} className={cn("flex flex-col items-center p-2 rounded-xl border flex-1 mx-0.5", activeTab === 'registration' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
          <UserPlus className="w-4 h-4" />
          <span className="text-[9px] font-bold tracking-wide mt-1">Alunos</span>
        </button>
        <button onClick={() => setActiveTab('swimming')} className={cn("flex flex-col items-center p-2 rounded-xl border flex-1 mx-0.5", activeTab === 'swimming' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
          <Droplets className="w-4 h-4" />
          <span className="text-[9px] font-bold tracking-wide mt-1">Natação</span>
        </button>
        
        {isStaff && (
          <button onClick={() => setActiveTab('cleaning')} className={cn("flex flex-col items-center p-2 rounded-xl border flex-1 mx-0.5", activeTab === 'cleaning' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
            <ClipboardList className="w-4 h-4" />
            <span className="text-[9px] font-bold tracking-wide mt-1">Limpeza</span>
          </button>
        )}
        {isStaff && (
          <button onClick={() => setActiveTab('maintenance')} className={cn("flex flex-col items-center p-2 rounded-xl border flex-1 mx-0.5", activeTab === 'maintenance' ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
            <Wrench className="w-4 h-4" />
            <span className="text-[9px] font-bold tracking-wide mt-1">Manu.</span>
          </button>
        )}
        {isAdmin && (
          <button onClick={() => setActiveTab('team')} className={cn("flex flex-col items-center p-2 rounded-xl border flex-1 mx-0.5", activeTab === 'team' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[9px] font-bold tracking-wide mt-1">Equipe</span>
          </button>
        )}
      </div>

      {/* === ÁREA CENTRAL === */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto relative z-10 custom-scrollbar pb-6">
        {activeTab === 'registration' && <RegistrationModule onSuccess={() => setActiveTab('swimming')} />}
        {activeTab === 'swimming' && <SwimmingModule />}
        {activeTab === 'cleaning' && isStaff && <ChecklistModule />}
        {activeTab === 'maintenance' && isStaff && <MaintenanceModule />}
        {activeTab === 'team' && isAdmin && <TeamModule />}
      </main>
    </div>
  );
}
