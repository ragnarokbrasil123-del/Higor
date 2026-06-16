'use client';

import React from 'react';
import { LogOut, Droplets, Award, Calendar } from 'lucide-react';
import { levels, Student, CapLevel } from '@/types';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

interface ClientPortalProps {
  student: Student;
  onLogout: () => void;
}

export function ClientPortal({ student, onLogout }: ClientPortalProps) {
  const evaluations = student.evaluations?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 overflow-y-auto">
      {/* Header Premium */}
      <div className="bg-black pt-12 pb-6 px-6 shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex justify-between items-start relative z-10">
          <img src="/logo.png" alt="Clube Olimpo" className="h-10 w-auto object-contain" />
          <button onClick={onLogout} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 backdrop-blur-md">
            Sair <LogOut className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-8 flex items-center gap-4 relative z-10">
          <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-lg border-2 border-white/20", levels[student.level].bgClass)}>
            {student.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{student.name}</h1>
            <p className="text-slate-400 text-sm mt-1">Dossiê do Aluno</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full -mt-4 relative z-20">
        
        <div className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200 border border-slate-100 mb-6 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nível Atual</p>
            <div className="flex items-center gap-2">
              <Award className={cn("w-6 h-6", levels[student.level].bgClass.replace('bg-', 'text-'))} />
              <p className="text-xl font-extrabold text-slate-800">Touca {levels[student.level].name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Idade</p>
            <p className="text-xl font-extrabold text-slate-800">{student.age} anos</p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" /> Histórico de Avaliações
        </h2>

        {evaluations.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 border-dashed">
            <Droplets className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma avaliação registrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {evaluations.map(ev => (
              <div key={ev.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-extrabold text-slate-800 text-lg">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                  <span className={cn("px-3 py-1 text-xs font-bold rounded-lg uppercase", ev.general_status === 'approved' ? "bg-emerald-100 text-emerald-700" : ev.general_status === 'reproved' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")}>
                    {ev.general_status === 'approved' ? 'Aprovado' : ev.general_status === 'reproved' ? 'Reprovado' : 'Pendente'}
                  </span>
                </div>
                {ev.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Observações do Professor</p>
                    <p className="text-sm text-slate-700">{ev.notes}</p>
                  </div>
                )}
                {ev.general_status === 'approved' && (
                  <div className="mt-4 p-3 bg-emerald-500 rounded-xl text-white text-center shadow-lg shadow-emerald-500/20">
                    <p className="text-sm font-bold">Parabéns! O aluno foi aprovado para trocar de nível! 🏅</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
