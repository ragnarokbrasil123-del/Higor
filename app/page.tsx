'use client';

import React, { useState } from 'react';
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

  if (!user) {
    return <LoginModule onLogin={(role, data) => setUser({ role, data })} />;
  }

  if (user.role === 'client') {
    return <ClientPortal student={user.data} onLogout={() => setUser(null)} />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row bg-[#F0F4F8] overflow-hidden">
      
      {/* === DESKTOP SIDEBAR === */}
      <aside className="hidden md:flex w-64 bg-black text-white flex-col shrink-0 border-r border-slate-800 z-20">
        <div className="p-6 pt-8 flex items-center justify-center border-b border-slate-800/50">
          <img src="/logo.png" alt="Clube Olimpo" className="w-40 h-auto object-contain drop-shadow-lg" />
        </div>
        <nav className="mt-6 flex-1 space-y-2 px-4 flex flex-col pb-6 overflow-y-auto custom-scrollbar">
          <button onClick={() => setActiveTab('registration')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0", activeTab === 'registration' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500")}>
            <UserPlus className="w-5 h-5" /><span>Cadastro Alunos</span>
          </button>
          
          <button onClick={() => setActiveTab('swimming')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0", activeTab === 'swimming' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500")}>
            <Droplets className="w-5 h-5" /><span>Avaliação Natação</span>
          </button>

          {isAdmin && (
            <button onClick={() => setActiveTab('cleaning')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0", activeTab === 'cleaning' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500")}>
              <ClipboardList className="w-5 h-5" /><span>Checklist Limpeza</span>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setActiveTab('maintenance')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0", activeTab === 'maintenance' ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-blue-400")}>
              <Wrench className="w-5 h-5" /><span>Manutenção</span>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setActiveTab('team')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0", activeTab === 'team' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500")}>
              <ShieldCheck className="w-5 h-5" /><span>Equipe & Senhas</span>
            </button>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => setUser(null)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all">
             <LogOut className="w-4 h-4" /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* === CABEÇALHO MOBILE === */}
      <header className="md:hidden bg-black flex flex-col shrink-0 z-20 shadow-md border-b border-slate-900">
        <div className="h-14 flex justify-between items-center px-4">
          <div className="w-8" />
          <img src="/logo.png" alt="Clube Olimpo" className="h-8 w-auto object-contain" />
          <button onClick={() => setUser(null)} className="text-slate-400 hover:text-white p-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex justify-start items-center px-2 pb-3 gap-2 bg-black overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('registration')} className={cn("shrink-0 min-w-[75px] py-2.5 px-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border", activeTab === 'registration' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
            <UserPlus className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-wide">Cadastro</span>
          </button>
          
          <button onClick={() => setActiveTab('swimming')} className={cn("shrink-0 min-w-[75px] py-2.5 px-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border", activeTab === 'swimming' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
            <Droplets className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-wide">Natação</span>
          </button>

          {isAdmin && (
            <button onClick={() => setActiveTab('cleaning')} className={cn("shrink-0 min-w-[75px] py-2.5 px-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border", activeTab === 'cleaning' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
              <ClipboardList className="w-4 h-4" />
              <span className="text-[10px] font-bold tracking-wide">Limpeza</span>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setActiveTab('maintenance')} className={cn("shrink-0 min-w-[75px] py-2.5 px-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border", activeTab === 'maintenance' ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
              <Wrench className="w-4 h-4" />
              <span className="text-[10px] font-bold tracking-wide">Manutenção</span>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setActiveTab('team')} className={cn("shrink-0 min-w-[75px] py-2.5 px-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border", activeTab === 'team' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-bold tracking-wide">Equipe</span>
            </button>
          )}
        </div>
      </header>

      {/* === ÁREA CENTRAL === */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto relative z-10 custom-scrollbar pb-6">
        {activeTab === 'registration' && <RegistrationModule onSuccess={() => setActiveTab('swimming')} />}
        {activeTab === 'swimming' && <SwimmingModule />}
        {activeTab === 'cleaning' && isAdmin && <ChecklistModule />}
        {activeTab === 'maintenance' && isAdmin && <MaintenanceModule />}
        {activeTab === 'team' && isAdmin && <TeamModule />}
      </main>

    </div>
  );
}
