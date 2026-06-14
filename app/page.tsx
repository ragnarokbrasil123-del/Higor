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
    <div className="h-screen w-full flex flex-col md:flex-row bg-[#F0F4F8] overflow-hidden">
      <aside className="w-full md:w-64 bg-black text-white flex flex-col shrink-0 border-r border-slate-800">
        
        {/* AQUI ESTÁ A MÁGICA DO SEU LOGO */}
        <div className="p-6 pt-8 flex items-center justify-center border-b border-slate-800/50">
          <img 
            src="/logo.png" 
            alt="Clube Olimpo" 
            className="w-40 h-auto object-contain drop-shadow-lg"
          />
        </div>

        <nav className="mt-6 flex-1 space-y-1 px-4 flex flex-row md:flex-col overflow-x-auto custom-scrollbar pb-2 md:pb-0">
          <button onClick={() => setActiveTab('registration')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0", activeTab === 'registration' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500")}>
            <UserPlus className="w-5 h-5" /><span>Cadastro Alunos</span>
          </button>
          <button onClick={() => setActiveTab('swimming')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 md:mt-2", activeTab === 'swimming' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500")}>
            <Droplets className="w-5 h-5" /><span>Avaliação Natação</span>
          </button>
          <button onClick={() => setActiveTab('cleaning')} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 md:mt-2", activeTab === 'cleaning' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500")}>
            <ClipboardList className="w-5 h-5" /><span>Checklist Limpeza</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full bg-slate-50 overflow-y-auto">
        {activeTab === 'registration' && <RegistrationModule onSuccess={() => setActiveTab('swimming')} />}
        {activeTab === 'swimming' && <SwimmingModule />}
        {activeTab === 'cleaning' && <ChecklistModule />}
      </main>
    </div>
  );
}
