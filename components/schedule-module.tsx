'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Calendar, Clock, User, X, LayoutGrid, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

interface ClassSlot {
  id: string;
  class_id: string;
  cap_color: string;
  student_id: string | null;
}

interface ClassBlock {
  id: string;
  teacher_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  class_slots?: ClassSlot[];
}

const CAP_COLORS = [
  { id: 'Laranja', label: 'Touca Laranja', colorCode: 'bg-orange-500 text-white' },
  { id: 'Amarela', label: 'Touca Amarela', colorCode: 'bg-yellow-400 text-yellow-900' },
  { id: 'Vermelha', label: 'Touca Vermelha', colorCode: 'bg-red-500 text-white' },
  { id: 'Verde', label: 'Touca Verde', colorCode: 'bg-green-500 text-white' },
  { id: 'Azul', label: 'Touca Azul', colorCode: 'bg-blue-500 text-white' },
];

const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export function ScheduleModule() {
  const [classes, setClasses] = useState<ClassBlock[]>([]);
  const [teachersList, setTeachersList] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Controle do menu inteligente de professores
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);

  const [form, setForm] = useState({
    teacher_name: '',
    days_of_week: ['Segunda-feira'],
    start_time: '08:00',
    end_time: '08:45',
    slots: { 'Laranja': 0, 'Amarela': 0, 'Vermelha': 0, 'Verde': 0, 'Azul': 0 } as Record<string, number>
  });

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, []);

  const loadClasses = async () => {
    const { data: clsData } = await supabase.from('classes').select('*').order('start_time', { ascending: true });
    const { data: slotData } = await supabase.from('class_slots').select('*');

    if (clsData) {
      const formatted = clsData.map(c => ({
        ...c,
        class_slots: slotData?.filter(s => s.class_id === c.id) || []
      }));
      setClasses(formatted);
    }
  };

  const loadTeachers = async () => {
    const { data } = await supabase.from('app_users').select('name').in('role', ['teacher', 'admin']);
    if (data) {
      const uniqueNames = Array.from(new Set(data.map(u => u.name))).sort();
      setTeachersList(uniqueNames);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacher_name.trim()) return alert("Digite o nome do professor");
    if (form.days_of_week.length === 0) return alert("Selecione pelo menos um dia da semana");
    
    const totalSlots = Object.values(form.slots).reduce((a, b) => a + b, 0);
    if (totalSlots === 0) return alert("Você precisa criar pelo menos 1 vaga para essa turma.");

    setIsSubmitting(true);
    try {
      for (const day of form.days_of_week) {
        const { data: newClass, error: classErr } = await supabase.from('classes').insert([{
          teacher_name: form.teacher_name.trim(),
          day_of_week: day,
          start_time: form.start_time,
          end_time: form.end_time
        }]).select().single();

        if (classErr) throw new Error("Erro na Tabela Classes: " + classErr.message);

        const slotsToInsert = [];
        for (const [color, amount] of Object.entries(form.slots)) {
          for (let i = 0; i < amount; i++) {
            slotsToInsert.push({ class_id: newClass.id, cap_color: color });
          }
        }

        if (slotsToInsert.length > 0) {
          const { error: slotsErr } = await supabase.from('class_slots').insert(slotsToInsert);
          if (slotsErr) throw new Error("Erro na Tabela Class_Slots: " + slotsErr.message);
        }
      }

      await loadClasses();
      setIsModalOpen(false);
      setForm({ ...form, teacher_name: '', days_of_week: ['Segunda-feira'], slots: { 'Laranja': 0, 'Amarela': 0, 'Vermelha': 0, 'Verde': 0, 'Azul': 0 }});
    } catch (err: any) {
      console.error(err);
      alert("🚨 ALERTA DO DETETIVE: " + (err.message || "Erro desconhecido ao criar turma"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar essa turma inteira e todas as suas vagas?")) return;
    await supabase.from('classes').delete().eq('id', id);
    loadClasses();
  };

  const toggleDay = (day: string) => {
    if (form.days_of_week.includes(day)) {
      setForm({ ...form, days_of_week: form.days_of_week.filter(d => d !== day) });
    } else {
      setForm({ ...form, days_of_week: [...form.days_of_week, day] });
    }
  };

  // Filtra a lista baseada no que o usuário digitou
  const filteredTeachers = teachersList.filter(t => t.toLowerCase().includes(form.teacher_name.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-4 md:mt-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                <LayoutGrid className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Grade de Horários</h1>
            </div>
            <p className="text-slate-500 font-medium ml-16">Planejamento visual de Turmas e Vagas (Slots).</p>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all">
            <Plus className="w-5 h-5" /> Adicionar Horário
          </button>
        </div>

        <div className="space-y-6">
          {DAYS.map(day => {
            const classesOnDay = classes.filter(c => c.day_of_week === day);
            if (classesOnDay.length === 0) return null;

            return (
              <div key={day} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-black text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" /> {day}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classesOnDay.map(cls => (
                    <div key={cls.id} className="relative bg-slate-50 rounded-2xl p-4 border border-slate-200 group hover:border-indigo-300 transition-colors">
                      <button onClick={() => handleDeleteClass(cls.id)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-2 text-slate-700 font-black text-lg mb-1">
                        <Clock className="w-5 h-5 text-slate-400" />
                        {cls.start_time.slice(0,5)} às {cls.end_time.slice(0,5)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-500 font-bold mb-4">
                        <User className="w-4 h-4" />
                        {cls.teacher_name}
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vagas ({cls.class_slots?.length || 0}):</div>
                        <div className="flex flex-wrap gap-2">
                          {cls.class_slots?.map((slot) => {
                            const colorObj = CAP_COLORS.find(c => c.id === slot.cap_color);
                            return (
                              <div key={slot.id} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1", colorObj?.colorCode || 'bg-slate-200 text-slate-700')}>
                                <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                                {slot.cap_color} {slot.student_id ? '✅' : '(Vazia)'}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {classes.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <LayoutGrid className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700">Nenhum horário criado</h3>
              <p className="text-slate-500 mt-2">Clique no botão acima para montar a sua primeira turma.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-100 shrink-0">
                <h2 className="text-xl font-black text-slate-800">Nova Turma / Horário</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="classForm" onSubmit={handleCreateClass} className="space-y-6">
                  
                  <div className="space-y-5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    
                    {/* CAMPO DE PROFESSOR INTELIGENTE */}
                    <div className="relative">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Professor</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required 
                          value={form.teacher_name} 
                          onChange={e => {
                            setForm({...form, teacher_name: e.target.value});
                            setIsTeacherDropdownOpen(true);
                          }}
                          onFocus={() => setIsTeacherDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setIsTeacherDropdownOpen(false), 200)} // Delay para o clique no menu funcionar
                          placeholder="Clique para ver a lista ou digite..." 
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium pr-10" 
                        />
                        <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                      </div>

                      {/* Menu Suspenso Fantasma */}
                      <AnimatePresence>
                        {isTeacherDropdownOpen && filteredTeachers.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar"
                          >
                            {filteredTeachers.map((name, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setForm({...form, teacher_name: name});
                                  setIsTeacherDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-indigo-50 text-slate-700 font-bold transition-colors border-b border-slate-50 last:border-0"
                              >
                                {name}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Quais dias ela dá essa aula?</label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map(d => (
                          <button 
                            type="button" 
                            key={d}
                            onClick={() => toggleDay(d)}
                            className={cn("px-4 py-2 rounded-xl text-sm font-bold border transition-all", form.days_of_week.includes(d) ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300")}
                          >
                            {d.split('-')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Horário Início</label>
                        <input type="time" required value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Horário Fim</label>
                        <input type="time" required value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-black text-slate-800">Quantas Vagas por Cor?</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {CAP_COLORS.map(color => (
                        <div key={color.id} className={cn("flex flex-col p-3 rounded-xl border transition-colors", form.slots[color.id] > 0 ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-200")}>
                          <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full shadow-sm", color.colorCode.split(' ')[0])}></div>
                            {color.id}
                          </label>
                          <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button type="button" onClick={() => setForm({...form, slots: {...form.slots, [color.id]: Math.max(0, form.slots[color.id] - 1)}})} className="w-8 h-8 flex items-center justify-center bg-white rounded-md text-slate-600 font-bold shadow-sm hover:text-red-500">-</button>
                            <span className="flex-1 text-center font-black text-slate-700">{form.slots[color.id]}</span>
                            <button type="button" onClick={() => setForm({...form, slots: {...form.slots, [color.id]: form.slots[color.id] + 1}})} className="w-8 h-8 flex items-center justify-center bg-white rounded-md text-slate-600 font-bold shadow-sm hover:text-green-500">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </form>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                <button form="classForm" type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? 'Multiplicando Horários...' : 'Criar Turmas em Massa'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
