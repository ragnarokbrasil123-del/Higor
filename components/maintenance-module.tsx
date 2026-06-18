'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, ChevronLeft, ChevronRight, Edit2, Trash2, X, Wrench, Camera, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

interface MaintenanceTask {
  id: string;
  title: string;
  completed: boolean;
  date: string;
  photo_url?: string | null;
}

export function MaintenanceModule() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  // Controle da Câmera
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTaskId, setActiveUploadTaskId] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [selectedDate]);

  const loadTasks = async () => {
    const { data } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .eq('date', selectedDate)
      .order('id', { ascending: true });
    if (data) setTasks(data);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedDate) return;

    const newTaskTitleClean = newTaskTitle.trim();
    const tempId = Date.now().toString();

    setTasks([...tasks, { id: tempId, title: newTaskTitleClean, completed: false, date: selectedDate }]);
    setNewTaskTitle('');

    const { error } = await supabase
      .from('maintenance_tasks')
      .insert([{ title: newTaskTitleClean, date: selectedDate, completed: false }]);

    if (!error) {
      // Dispara a Notificação Push nativa!
      fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitleClean })
      });
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    await supabase.from('maintenance_tasks').update({ completed: !task.completed }).eq('id', id);
  };

  const deleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    await supabase.from('maintenance_tasks').delete().eq('id', id);
  };

  const startEditing = (task: MaintenanceTask) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const saveEditing = async () => {
    if (!editingTaskId || !editingTitle.trim()) return cancelEditing();
    
    setTasks(tasks.map(t => t.id === editingTaskId ? { ...t, title: editingTitle.trim() } : t));
    await supabase.from('maintenance_tasks').update({ title: editingTitle.trim() }).eq('id', editingTaskId);
    cancelEditing();
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTitle('');
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  // ==========================================
  // COMPRESSOR DE IMAGEM E UPLOAD
  // ==========================================
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Reduz a resolução para não lotar o banco
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% de qualidade
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const openCamera = (id: string) => {
    setActiveUploadTaskId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTaskId) return;

    try {
      const base64Image = await compressImage(file);
      
      // Atualiza a tela instantaneamente
      setTasks(tasks.map(t => t.id === activeUploadTaskId ? { ...t, photo_url: base64Image } : t));
      
      // Salva no banco de dados
      await supabase.from('maintenance_tasks').update({ photo_url: base64Image }).eq('id', activeUploadTaskId);
    } catch (err) {
      alert("Erro ao salvar foto.");
    } finally {
      setActiveUploadTaskId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-100 to-slate-200">
      {/* INPUT OCULTO DA CÂMERA */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" // Abre a câmera traseira direto no celular!
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* MODAL DE VER FOTO TELA CHEIA */}
      <AnimatePresence>
        {viewingPhoto && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          >
            <button 
              onClick={() => setViewingPhoto(null)} 
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img src={viewingPhoto} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" alt="Evidência" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-4 md:mt-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="w-8 h-8 text-blue-500" />
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Manutenção</h1>
            </div>
            <p className="text-slate-500 font-medium ml-11">Checklist técnico da casa de máquinas.</p>
          </div>

          <div className="flex items-center gap-6 bg-white p-2 pr-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center">
              <button onClick={() => changeDate(-1)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <div className="w-40 text-center flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isToday ? 'Hoje' : 'Histórico'}</span>
                <span className="font-bold text-slate-700">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
              <button onClick={() => changeDate(1)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
            
            <div className="w-px h-10 bg-slate-200 mx-2"></div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * progress) / 100} className={cn("transition-all duration-1000 ease-out", progress === 100 ? "text-green-500" : "text-blue-500")} />
                </svg>
                <span className="absolute text-[11px] font-bold text-slate-700">{progress}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700">{completedCount} de {tasks.length}</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Concluídas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50">
            <form onSubmit={handleAddTask} className="flex gap-3">
              <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="+ Adicionar nova tarefa técnica..." className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400" />
              <button type="submit" disabled={!newTaskTitle.trim()} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all">Adicionar</button>
            </form>
          </div>

          <div className="p-2 md:p-6 space-y-1 md:space-y-2">
            <AnimatePresence mode="popLayout">
              {tasks.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 px-4">
                  <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                  <p className="text-lg font-bold text-slate-700 mb-1">Manutenção em branco</p>
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
                      
                      {/* BOTOES DE AÇÃO */}
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        
                        {/* Se tiver foto, mostra o botão VER FOTO. Se não, mostra a CÂMERA */}
                        {task.photo_url ? (
                           <button onClick={() => setViewingPhoto(task.photo_url!)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded mr-2 flex items-center gap-1">
                             <Eye className="w-4 h-4" /> <span className="text-[10px] font-bold">Ver Foto</span>
                           </button>
                        ) : (
                           <button onClick={() => openCamera(task.id)} className="p-1.5 text-slate-500 bg-slate-100 hover:text-blue-600 hover:bg-blue-50 rounded mr-2 flex items-center gap-1">
                             <Camera className="w-4 h-4" /> <span className="text-[10px] font-bold">Foto</span>
                           </button>
                        )}

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
