'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Save } from 'lucide-react';
import { Student, CapLevel, levels } from '@/types';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

interface RegistrationModuleProps {
  onAddStudent: (student: Student) => void;
}

export function RegistrationModule({ onAddStudent }: RegistrationModuleProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [level, setLevel] = useState<CapLevel>('orange');
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age) return;

    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9), // ID aleatório simples
      name,
      age: parseInt(age),
      level,
      lastEvaluation: new Date().toISOString().split('T')[0],
      evalDetails: {
        breathing: 'untested',
        floating: 'untested',
        technique: 'untested',
        speed: 'untested'
      },
      guardianName,
      phone
    };

    onAddStudent(newStudent);
    
    // Limpar o formulário após salvar
    setName('');
    setAge('');
    setLevel('orange');
    setGuardianName('');
    setPhone('');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      {/* Header */}
      <header className="h-16 flex items-center px-4 md:px-8 bg-white/50 border-b border-slate-200 backdrop-blur-sm shrink-0">
        <h1 className="text-xl font-bold text-slate-800">Cadastro de Alunos</h1>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Novo Aluno</h2>
              <p className="text-sm text-slate-500">Preencha os dados para matricular um novo aluno na natação.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Nome Completo *</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-slate-800"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Idade *</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-slate-800"
                  placeholder="Ex: 8"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nível (Touca) *</label>
                <div className="relative">
                  <select 
                    value={level}
                    onChange={(e) => setLevel(e.target.value as CapLevel)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-slate-800 appearance-none font-medium"
                  >
                    {Object.entries(levels).map(([key, value]) => (
                      <option key={key} value={key}>Touca {value.name}</option>
                    ))}
                  </select>
                  <div className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-inner", levels[level].bgClass)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nome do Responsável</label>
                <input 
                  type="text" 
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-slate-800"
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Telefone de Contato</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-slate-800"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button 
                type="submit"
                className="px-8 py-3 bg-amber-500 text-black rounded-xl font-bold text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95"
              >
                <Save className="w-4 h-4" />
                Cadastrar Aluno
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
