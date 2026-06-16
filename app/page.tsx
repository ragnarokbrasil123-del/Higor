'use client';

import React, { useState } from 'react';
import { SwimmingModule } from '@/components/swimming-module';
import { ChecklistModule } from '@/components/checklist-module';
import { RegistrationModule } from '@/components/registration-module';
import { Droplets, ClipboardList, UserPlus } from 'lucide-react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

type Tab = 'swimming' | 'cleaning' | 'registration';

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('swimming');

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row bg-[#F0F4F8] overflow-hidden">
      
      {/* === DESKTOP SIDEBAR (Fica igual no computador) === */}
      <aside className="hidden md:flex w-64 bg-black text-white flex-col shrink-0 border-r border-slate-800 z-20">
        <div className="p-6 pt-8 flex items-center justify-center border-b border-slate-800/50">
          <img src="/logo.png" alt="Clube Olimpo" className="w-40 h-auto object-contain drop-shadow-lg" />
        </div>
        <nav className="mt-6 flex-1 space-y-2 px-4 flex flex-col pb-6">
          <button onClick={() => setActiveTab('registration')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0", activeTab === 'registration' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500")}>
            <UserPlus className="w-5 h-5" /><span>Cadastro Alunos</span>
          </button>
          <button onClick={() => setActiveTab('swimming')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0", activeTab === 'swimming' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500")}>
            <Droplets className="w-5 h-5" /><span>Avaliação Natação</span>
          </button>
          <button onClick={() => setActiveTab('cleaning')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0", activeTab === 'cleaning' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500")}>
            <ClipboardList className="w-5 h-5" /><span>Checklist Limpeza</span>
          </button>
        </nav>
      </aside>

      {/* === CABEÇALHO MOBILE INTELIGENTE (Logo + Botões juntos) === */}
      <header className="md:hidden bg-black flex flex-col shrink-0 z-20 shadow-md">
        <div className="h-14 flex items-center justify-center">
          <img src="/logo.png" alt="Clube Olimpo" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex justify-between items-center px-2 pb-3 gap-2 bg-black">
          <button onClick={() => setActiveTab('registration')} className={cn("flex-1 py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border", activeTab === 'registration' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
            <UserPlus className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-wide">Cadastro</span>
          </button>
          <button onClick={() => setActiveTab('swimming')} className={cn("flex-1 py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border", activeTab === 'swimming' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
            <Droplets className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-wide">Natação</span>
          </button>
          <button onClick={() => setActiveTab('cleaning')} className={cn("flex-1 py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border", activeTab === 'cleaning' ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
            <ClipboardList className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-wide">Limpeza</span>
          </button>
        </div>
      </header>

      {/* === ÁREA CENTRAL (Agora 100% livre até o final da tela) === */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto relative z-10 custom-scrollbar pb-6">
        {activeTab === 'registration' && <RegistrationModule onSuccess={() => setActiveTab('swimming')} />}
        {activeTab === 'swimming' && <SwimmingModule />}
        {activeTab === 'cleaning' && <ChecklistModule />}
      </main>

    </div>
  );
}
