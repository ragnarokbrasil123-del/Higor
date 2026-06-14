'use client';

import React, { useState } from 'react';
import { SwimmingModule } from '@/components/swimming-module';
import { ChecklistModule } from '@/components/checklist-module';
import { RegistrationModule } from '@/components/registration-module';
import { Droplets, ClipboardList, Landmark, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Student, initialStudents } from '@/types';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

type Tab = 'swimming' | 'cleaning' | 'registration';

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('swimming');
  const [students, setStudents] = useState<Student[]>(initialStudents);

  const handleAddStudent = (newStudent: Student) => {
    setStudents((prev) => [newStudent, ...prev]);
    setActiveTab('swimming');
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[#F0F4F8] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-black text-white flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Landmark className="w-6 h-6 text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight uppercase">
            Clube <span className="text-amber-500">Olimpo</span>
          </span>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-4 flex flex-row md:flex-col overflow-x-auto custom-scrollbar pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('registration')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0",
              activeTab === 'registration' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500"
            )}
          >
            <UserPlus className="w-5 h-5" />
            <span>Cadastro Alunos</span>
          </button>

          <button
            onClick={() => setActiveTab('swimming')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 md:mt-2",
              activeTab === 'swimming' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500"
            )}
          >
            <Droplets className="w-5 h-5" />
            <span>Avaliação Natação</span>
          </button>

          <button
            onClick={() => setActiveTab('cleaning')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 md:mt-2",
              activeTab === 'cleaning' ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-amber-500"
            )}
          >
            <ClipboardList className="w-5 h-5" />
            <span>Checklist Limpeza</span>
          </button>
        </nav>

        <div className="p-6 mt-auto hidden md:block">
          <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-3 border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 shrink-0"></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">Ricardo Mendes</p>
              <p className="text-[10px] text-slate-400 truncate">Diretor Técnico</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-slate-50 overflow-y-auto">
        {activeTab === 'registration' && <RegistrationModule onAddStudent={handleAddStudent} />}
        {activeTab === 'swimming' && <SwimmingModule students={students} setStudents={setStudents} />}
        {activeTab === 'cleaning' && <ChecklistModule />}
      </main>
    </div>
  );
}
