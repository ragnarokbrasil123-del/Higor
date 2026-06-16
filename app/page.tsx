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
    // fixed inset-0 com overflow-hidden cria a estrutura dura de um App nativo
    <div className="fixed inset-0 flex flex-col md:flex-row bg-[#F0F4F8] overflow-hidden">
      
      {/* === DESKTOP SIDEBAR === */}
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

      {/* === CABEÇALHO MOBILE === */}
      <header className="md:hidden h-14 bg-black border-b border-slate-800 flex items-center justify-center shrink-0 z-20 shadow-md">
        <img src="/logo.png" alt="Clube Olimpo" className="h-8 w-auto object-contain" />
      </header>

      {/* === ÁREA CENTRAL (Ajustada para não sobrepor o rodapé) === */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 relative z-10 custom-scrollbar">
        {activeTab === 'registration' && <RegistrationModule onSuccess={() => setActiveTab('swimming')} />}
        {activeTab === 'swimming' && <SwimmingModule />}
        {activeTab === 'cleaning' && <ChecklistModule />}
      </main>

      {/* === BOTTOM TAB BAR MOBILE (Com área de segurança) === */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-slate-800 flex justify-around items-center px-1 z-50 pb-[env(safe-area-inset-bottom)] h-[calc(4rem+env(safe-area-inset-bottom))]">
        <button onClick={() => setActiveTab('registration')} className={cn("flex flex-col items-center justify-center gap-1 h-full flex-1 transition-all", activeTab === 'registration' ? "text-amber-500" : "text-slate-500 hover:text-slate-300")}>
          <UserPlus className={cn("w-5 h-5 transition-all", activeTab === 'registration' && "w-6 h-6")} />
          <span className="text-[10px] font-bold">Cadastro</span>
        </button>
        <button onClick={() => setActiveTab('swimming')} className={cn("flex flex-col items-center justify-center gap-1 h-full flex-1 transition-all", activeTab === 'swimming' ? "text-amber-500" : "text-slate-500 hover:text-slate-300")}>
          <Droplets className={cn("w-5 h-5 transition-all", activeTab === 'swimming' && "w-6 h-6")} />
          <span className="text-[10px] font-bold">Natação</span>
        </button>
        <button onClick={() => setActiveTab('cleaning')} className={cn("flex flex-col items-center justify-center gap-1 h-full flex-1 transition-all", activeTab === 'cleaning' ? "text-amber-500" : "text-slate-500 hover:text-slate-300")}>
          <ClipboardList className={cn("w-5 h-5 transition-all", activeTab === 'cleaning' && "w-6 h-6")} />
          <span className="text-[10px] font-bold">Limpeza</span>
        </button>
      </div>
    </div>
  );
}
