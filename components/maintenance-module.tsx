'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Plus, Trash2, Edit2, Check, X, Wrench, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '@/lib/supabase';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  date?: string;
}

const defaultTasks = [
  "Medição de Cloro e PH da Água",
  "Limpeza das Bordas da Piscina",
  "Retrolavagem do Filtro",
  "Aspiração do Fundo da Piscina",
  "Limpeza dos Cestos do Skimmer",
  "Revisão da Bomba de Calor",
  "Checagem da Casa de Máquinas (Vazamentos)",
  "Calibração de Equipamentos Automáticos",
  "Troca/Reposição de Produtos Químicos",
  "Verificação de Iluminação Subaquática",
  "Verificação dos Trocadores de Calor",
  "Ralos de Fundo e Segurança"
];

export function MaintenanceModule() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => { fetchTasks(selectedDate); }, [selectedDate]);

  const fetchTasks = async (date: string) => {
    const { data } = await supabase.from('maintenance_tasks').select('*').eq('date', date).order('created_at', { ascending: true });
    if (data) setTasks(data);
  };

  const changeDate = (days: number) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    setSelectedDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const tempId = Date.now().toString();
    const newTaskTitleClean = newTaskTitle.trim();
    
    setTasks([...tasks, { id: tempId, title: newTaskTitleClean, completed: false, date: selectedDate }]);
    setNewTaskTitle('');

    const { data } = await supabase.from('maintenance_tasks').insert([{ title: newTaskTitleClean, completed: false, date: selectedDate }]).select();
    if (data && data[0]) setTasks(prev => prev.map(t => t.id === tempId ? data[0] : t));
  };

  const loadDefaultChecklist = async () => {
    const tempTasks = defaultTasks.map((title, index) => ({ id: `temp-${Date.now()}-${index}`, title, completed: false, date: selectedDate }));
    setTasks(tempTasks);
    const rowsToInsert = defaultTasks.map(title => ({ title, completed: false, date: selectedDate }));
    const { data } = await supabase.from('maintenance_tasks').insert(rowsToInsert).select();
    if (data) setTasks(data);
  };

  const toggleTask = async (id: string) => {
    const taskToToggle = tasks.find(t => t.id === id);
    if (!taskToToggle) return;
    const newStatus = !taskToToggle.completed;
    setTasks(tasks.map(task => task.id === id ? { ...task, completed: newStatus } : task));
    await supabase.from('maintenance_tasks').update({ completed: newStatus }).eq('id', id);
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const saveEditing = async () => {
    if (!editingTitle.trim() || !editingTaskId) return cancelEditing();
    const newTitle = editingTitle.trim();
    const idToEdit = editingTaskId;
    setTasks(tasks.map(task => task.id === idToEdit ? { ...task, title: newTitle } : task));
    setEditingTaskId(null);
    await supabase.from('maintenance_tasks').update({ title: newTitle }).eq('id', idToEdit);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTitle('');
  };

  const deleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    await supabase.from('maintenance_tasks').delete().eq('id', id);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  const isToday = () => {
    const today = new Date();
    return selectedDate === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-y-auto bg-slate-50">
      <div className="absolute top-0 w-full h-64 bg-gradient-to-b from-blue-900 to-transparent pointer-events-none opacity-80"></div>

      <div className="relative z-10 max-w-4xl mx-auto p-3 md:p-8 w-full">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 mt-4">
          <div className="text-white">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
              <Wrench className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
              Manutenção
            </h1>
            <p className="text-xs md:text-sm text-blue-200/80">Checklist técnico da casa de máquinas e infraestrutura.</p>
            
            <div className="flex items-center gap-1 md:gap-2 mt-4">
              <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/10 rounded-lg text-blue-400"><ChevronLeft className="w-5 h-5" /></button>
              <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                <CalendarDays className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                <div className="flex flex-col">
                  {isToday() && <span className="text-[9px] uppercase font-bold text-blue-400 tracking-wider">Hoje</span>}
                  <input type="date" value={selectedDate} onChange={(e) => e.target.value && setSelectedDate(e.target.value)} className="bg-transparent border-none text-white text-xs md:text-sm font-bold focus:ring-0 outline-none p-0 w-[110px]" />
                </div>
              </div>
              <button onClick={() => changeDate(1)} className="p-2 hover:bg-white/10 rounded-lg text-blue-400"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-4 border border-x-white/20 border-t-white/20 shrink-0 self-start md:self-auto">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36"><path className="text-white/20" fill="none" strokeWidth="3" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/><path className="text-blue-400 transition-all" fill="none" strokeWidth="3" strokeDasharray={`${progressPercent}, 100`} stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/></svg>
                <span className="absolute text-white font-bold text-[10px] md:text-sm">{progressPercent}%</span>
              </div>
              <div className="text-white">
                <p className="font-bold text-base md:text-lg">{completedCount} de {tasks.length}</p>
                <p className="text-[10px] text-blue-200/80 uppercase">Concluídas</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="p-3 md:p-6 border-b border-slate-100 bg-slate-50/50">
            <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input type="text" placeholder="Adicionar nova tarefa técnica..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm font-medium outline-none transition-all" />
              </div>
              <button type="submit" disabled={!newTaskTitle.trim()} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all">Adicionar</button>
            </form>
          </div>

          <div className="p-2 md:p-6 space-y-1 md:space-y-2">
            <AnimatePresence mode="popLayout">
              {tasks.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 px-4">
                  <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                  <p className="text-lg font-bold text-slate-700 mb-1">Manutenção em branco</p>
                  <button onClick={loadDefaultChecklist} className="w-full md:w-auto mx-auto px-6 py-4 mt-6 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-sm shadow-lg">
                    <Wrench className="w-5 h-5 text-blue-400" /> Gerar Rotina Padrão (Filtros e Bombas)
                  </button>
                </motion.div>
              ) : (
                tasks.map((task) => (
                  <motion.div key={task.id} layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("group flex flex-col md:flex-row md:items-center gap-3 p-3 md:p-4 rounded-xl transition-all border", task.completed ? "bg-green-50/40 border-green-500/20" : "bg-white border-slate-100 hover:bg-slate-50")}>
                    
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <button onClick={() => toggleTask(task.id)} className={cn("w-6 h-6 shrink-0 rounded flex items-center justify-center border-2", task.completed ? "bg-green-500 border-green-500" : "border-slate-300")}>
                        <motion.div animate={{ scale: task.completed ? 1 : 0 }}><Check className="w-3 h-3 text-white" strokeWidth={3} /></motion.div>
                      </button>
                      <div className="flex-1 min-w-0">
                        {editingTaskId === task.id ? (
                          <input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEditing()} onBlur={saveEditing} autoFocus className="w-full bg-white border border-blue-300 rounded px-2 py-1 outline-none text-sm" />
                        ) : (
                          <p className={cn("text-sm font-medium truncate select-none", task.completed ? "text-green-800/60 line-through" : "text-slate-700")} onDoubleClick={() => startEditing(task)}>{task.title}</p>
                        )}
                      </div>
                      
                      <div className={cn("flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity", editingTaskId === task.id && "md:opacity-100")}>
                        {editingTaskId === task.id ? (
                          <><button onClick={saveEditing} className="p-1.5 text-green-600 bg-green-50 rounded"><Check className="w-4 h-4" /></button><button onClick={cancelEditing} className="p-1.5 text-slate-400 bg-slate-100 rounded"><X className="w-4 h-4" /></button></>
                        ) : (
                          <><button onClick={() => startEditing(task)} className="p-1.5 text-slate-400 bg-slate-50 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => deleteTask(task.id)} className="p-1.5 text-slate-400 bg-slate-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button></>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
