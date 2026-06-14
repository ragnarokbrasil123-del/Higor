'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Plus, Trash2, Edit2, Check, X, ClipboardList } from 'lucide-react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

const initialTasks: Task[] = [
  { id: '1', title: 'Limpar vestiários masculinos', completed: true },
  { id: '2', title: 'Limpar vestiários femininos', completed: false },
  { id: '3', title: 'Higienizar bordas da piscina', completed: false },
  { id: '4', title: 'Recolher lixo da área comum', completed: false },
  { id: '5', title: 'Repor sabonete e papel toalha', completed: false },
];

export function ChecklistModule() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false
    };
    
    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const saveEditing = () => {
    if (!editingTitle.trim()) {
      cancelEditing();
      return;
    }
    setTasks(tasks.map(task => 
      task.id === editingTaskId ? { ...task, title: editingTitle.trim() } : task
    ));
    setEditingTaskId(null);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTitle('');
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-y-auto">
      <div className="absolute top-0 w-full h-80 bg-gradient-to-b from-slate-900 to-transparent pointer-events-none opacity-80"></div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-8 w-full">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-6">
          <div className="text-white">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-amber-500" />
              Checklist de Limpeza
            </h1>
            <p className="text-amber-200/80">Gerenciamento diário de infraestrutura e higienização.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-x-white/20 border-t-white/20 shadow-lg shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/20"
                    fill="none"
                    strokeWidth="3"
                    stroke="currentColor"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-green-400 transition-all duration-1000 ease-out"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray={`${progressPercent}, 100`}
                    stroke="currentColor"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-white font-bold text-sm">{progressPercent}%</span>
              </div>
              <div className="text-white">
                <p className="font-semibold text-lg">{completedCount} de {tasks.length}</p>
                <p className="text-xs text-amber-200/80 uppercase tracking-wider">Concluídas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main List Box */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          
          {/* Add Form */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <form onSubmit={handleAddTask} className="relative flex items-center">
              <Plus className="absolute left-4 text-slate-400 w-5 h-5 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Adicionar nova tarefa..." 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full pl-12 pr-24 py-4 rounded-2xl border-0 bg-white shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all text-slate-700 font-medium"
              />
              <button 
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="absolute right-2 top-2 bottom-2 px-6 bg-amber-500 hover:bg-amber-600 text-black shadow-sm rounded-xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-amber-500 flex items-center justify-center"
              >
                Adicionar
              </button>
            </form>
          </div>

          {/* List */}
          <div className="p-4 sm:p-6 space-y-2">
            <AnimatePresence mode="popLayout">
              {tasks.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 text-slate-400"
                >
                  <CheckSquare className="w-12 h-12 mx-auto mb-4 text-slate-300 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma tarefa encontrada.</p>
                  <p className="text-sm">Adicione tarefas no campo acima para começar.</p>
                </motion.div>
              ) : (
                tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border-2",
                      task.completed 
                        ? "bg-green-50/40 border-green-500/20" 
                        : "bg-white border-transparent hover:border-slate-100 hover:bg-slate-50/80"
                    )}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={cn(
                        "w-7 h-7 shrink-0 rounded-[8px] flex items-center justify-center transition-all duration-300 border-2",
                        task.completed
                          ? "bg-green-500 border-green-500"
                          : "border-slate-300 hover:border-amber-400"
                      )}
                    >
                      <motion.div
                        initial={false}
                        animate={{ scale: task.completed ? 1 : 0, opacity: task.completed ? 1 : 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </motion.div>
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingTaskId === task.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                          onBlur={saveEditing}
                          autoFocus
                          className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-800 font-medium"
                        />
                      ) : (
                        <p 
                          className={cn(
                            "font-medium transition-all duration-300 truncate select-none",
                            task.completed ? "text-green-800/60 line-through" : "text-slate-700"
                          )}
                          onDoubleClick={() => startEditing(task)}
                        >
                          {task.title}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={cn(
                      "flex items-center gap-1 transition-opacity",
                      editingTaskId === task.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 sm:opacity-100" // Always visible on mobile, hover on desktop
                    )}>
                      {editingTaskId === task.id ? (
                        <>
                          <button onClick={saveEditing} className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEditing} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => startEditing(task)} 
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteTask(task.id)} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
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
