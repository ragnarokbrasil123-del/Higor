'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Save } from 'lucide-react';
import { CapLevel, levels } from '@/types';
import { supabase } from '@/lib/supabase';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

interface RegistrationModuleProps {
  onSuccess: () => void;
}

export function RegistrationModule({ onSuccess }: RegistrationModuleProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [level, setLevel] = useState<CapLevel>('orange');
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age) return;
    setLoading(true);

    const { error } = await supabase.from('students').insert([
      { name, age: parseInt(age), level, guardian_name: guardianName, phone }
    ]);

    setLoading(false);
    if (error) {
      alert("Erro ao salvar no banco: " + error.message);
      return;
    }
    
    // Limpa o formulário e avisa a página principal que deu sucesso
    setName(''); setAge(''); setLevel('orange'); setGuardianName(''); setPhone('');
    onSuccess();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <header className="h-16 flex items-center px-4 md:px-8 bg-white/50 border-b border-slate-200 backdrop-blur-sm shrink-0">
        <h1 className="text-xl font-bold text-slate-800">Cadastro de Alunos</h1>
      </header>
      <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Nome Completo *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Idade *</label>
                <input type="number" required min="1" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nível (Touca) *</label>
                <select value={level} onChange={(e) => setLevel(e.target.value as CapLevel)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700">
                  {Object.entries(levels).map(([key, value]) => (<option key={key} value={key}>Touca {value.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nome do Responsável</label>
                <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Telefone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
            </div>
            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button type="submit" disabled={loading} className="px-8 py-3 bg-amber-500 text-black rounded-xl font-bold text-sm hover:bg-amber-400 transition-all flex items-center gap-2">
                <Save className="w-4 h-4" /> {loading ? "Salvando..." : "Cadastrar Aluno"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
