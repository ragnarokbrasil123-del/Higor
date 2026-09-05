'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, Edit2, Trash2, X, Camera, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button, DateNav, EmptyState, IconButton, Input, PageHeader, PageShell } from '@/components/ui';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  date: string;
  photo_url?: string | null;
}

interface TaskBoardProps {
  /** Tabela do Supabase: 'cleaning_tasks' ou 'maintenance_tasks'. */
  tabela: string;
  /** Nome do canal de realtime — precisa ser único por tela. */
  canal: string;
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  /** Lista sugerida quando o dia está em branco. Sem isso, o vazio não oferece atalho. */
  tarefasPadrao?: string[];
  /** Avisa a equipe por push quando uma tarefa é criada. */
  avisarAoCriar?: boolean;
  /** Texto do push quando sobe uma foto. Recebe o nome da tarefa. */
  textoPushFoto: (tarefa: string) => string;
  /** Rótulo do botão que gera a lista padrão. */
  rotuloPadrao?: string;
}

/**
 * Quadro de tarefas do dia com foto de comprovação.
 *
 * Checklist de Limpeza e Manutenção eram dois arquivos praticamente
 * idênticos (~290 linhas cada, 109 linhas de diferença). Agora são duas
 * configurações deste componente — corrigir um bug conserta os dois.
 */
export function TaskBoard({
  tabela,
  canal,
  icone,
  titulo,
  descricao,
  tarefasPadrao,
  avisarAoCriar = false,
  textoPushFoto,
  rotuloPadrao = 'Gerar lista padrão',
}: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTaskId, setActiveUploadTaskId] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  // Sincronização em tempo real: se outra pessoa marcar, a tela atualiza.
  useEffect(() => {
    loadTasks();
    const channel = supabase
      .channel(canal)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => loadTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate]);

  const loadTasks = async () => {
    const { data } = await supabase.from(tabela).select('*').eq('date', selectedDate).order('id', { ascending: true });
    if (data) setTasks(data as Task[]);
  };

  const avisarEquipe = (title: string) => {
    fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).catch(() => { /* o aviso é acessório: nunca trava a ação */ });
  };

  const gerarPadrao = async () => {
    if (!tarefasPadrao?.length) return;
    const novas = tarefasPadrao.map(title => ({ title, date: selectedDate, completed: false }));
    const { data } = await supabase.from(tabela).insert(novas).select();
    if (data) setTasks([...tasks, ...(data as Task[])]);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedDate) return;
    const limpo = newTaskTitle.trim();
    const tempId = Date.now().toString();

    setTasks([...tasks, { id: tempId, title: limpo, completed: false, date: selectedDate }]);
    setNewTaskTitle('');

    const { data } = await supabase.from(tabela).insert([{ title: limpo, date: selectedDate, completed: false }]).select();
    if (data && data.length > 0) {
      setTasks(current => current.map(t => (t.id === tempId ? (data[0] as Task) : t)));
      if (avisarAoCriar) avisarEquipe(limpo);
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTasks(tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
    await supabase.from(tabela).update({ completed: !task.completed }).eq('id', id);
  };

  const deleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    await supabase.from(tabela).delete().eq('id', id);
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTitle('');
  };

  const saveEditing = async () => {
    if (!editingTaskId || !editingTitle.trim()) return cancelEditing();
    setTasks(tasks.map(t => (t.id === editingTaskId ? { ...t, title: editingTitle.trim() } : t)));
    await supabase.from(tabela).update({ title: editingTitle.trim() }).eq('id', editingTaskId);
    cancelEditing();
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  const compressImage = (file: File): Promise<string> =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const escala = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * escala;
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const openCamera = (id: string) => {
    setActiveUploadTaskId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTaskId) return;
    try {
      const base64 = await compressImage(file);
      setTasks(tasks.map(t => (t.id === activeUploadTaskId ? { ...t, photo_url: base64 } : t)));
      await supabase.from(tabela).update({ photo_url: base64 }).eq('id', activeUploadTaskId);
      const nome = tasks.find(t => t.id === activeUploadTaskId)?.title || '';
      avisarEquipe(textoPushFoto(nome));
    } catch {
      alert('Erro ao salvar foto.');
    } finally {
      setActiveUploadTaskId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <PageShell width="focus">
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      <AnimatePresence>
        {viewingPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
            <button onClick={() => setViewingPhoto(null)} aria-label="Fechar foto" className="absolute top-6 right-6 p-3 min-w-11 min-h-11 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
              <X className="w-7 h-7" />
            </button>
            <img src={viewingPhoto} className="max-w-full max-h-[85vh] object-contain rounded-card shadow-overlay" alt={`Evidência — ${titulo}`} />
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        icon={icone}
        title={titulo}
        description={descricao}
        action={<DateNav date={selectedDate} onShift={changeDate} progress={progress} done={completedCount} total={tasks.length} />}
      />

      <div className="bg-surface rounded-panel shadow-raised border border-line overflow-hidden">
        <div className="p-4 border-b border-line bg-surface-sunken">
          <form onSubmit={handleAddTask} className="flex gap-2">
            <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="+ Adicionar tarefa..." className="flex-1 bg-surface" />
            <Button type="submit" disabled={!newTaskTitle.trim()} size="lg" className="shrink-0">Adicionar</Button>
          </form>
        </div>

        <div className="p-2 md:p-4 space-y-1.5">
          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <EmptyState
                  icon={<Check className="w-12 h-12" />}
                  title="Nada para hoje"
                  description={tarefasPadrao?.length ? 'Gere a lista padrão e ajuste o que precisar.' : 'Cadastre acima a primeira tarefa do dia.'}
                  action={tarefasPadrao?.length ? (
                    <Button variant="dark" size="lg" onClick={gerarPadrao}>{rotuloPadrao}</Button>
                  ) : undefined}
                />
              </motion.div>
            ) : (
              tasks.map(task => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    'group flex items-start gap-3 p-3 rounded-card border transition-colors',
                    task.completed ? 'bg-success-soft border-success/25' : 'bg-surface border-line'
                  )}
                >
                  {/* alvo de toque grande: marcar é a ação mais frequente */}
                  <button
                    onClick={() => toggleTask(task.id)}
                    aria-label={task.completed ? `Desmarcar ${task.title}` : `Concluir ${task.title}`}
                    aria-pressed={task.completed}
                    className="w-11 h-11 shrink-0 flex items-center justify-center rounded-control active:scale-90 transition-transform"
                  >
                    <span className={cn('w-7 h-7 rounded-badge flex items-center justify-center border-2 transition-colors',
                      task.completed ? 'bg-success border-success' : 'border-line-strong')}>
                      <motion.span animate={{ scale: task.completed ? 1 : 0 }}>
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </motion.span>
                    </span>
                  </button>

                  <div className="flex-1 min-w-0 pt-2.5">
                    {editingTaskId === task.id ? (
                      <Input
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEditing()}
                        onBlur={saveEditing}
                        autoFocus
                        className="py-2"
                      />
                    ) : (
                      <p
                        onDoubleClick={() => startEditing(task)}
                        className={cn('text-sm font-medium leading-snug break-words',
                          task.completed ? 'text-success-ink/70 line-through' : 'text-ink')}
                      >
                        {task.title}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {task.photo_url ? (
                      <IconButton tone="info" onClick={() => setViewingPhoto(task.photo_url!)} aria-label="Ver foto">
                        <Eye className="w-5 h-5" />
                      </IconButton>
                    ) : (
                      <IconButton onClick={() => openCamera(task.id)} aria-label="Adicionar foto">
                        <Camera className="w-5 h-5" />
                      </IconButton>
                    )}

                    {editingTaskId === task.id ? (
                      <>
                        <IconButton tone="success" onClick={saveEditing} aria-label="Salvar"><Check className="w-5 h-5" /></IconButton>
                        <IconButton onClick={cancelEditing} aria-label="Cancelar"><X className="w-5 h-5" /></IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton onClick={() => startEditing(task)} aria-label="Editar" className="hidden sm:inline-flex"><Edit2 className="w-4 h-4" /></IconButton>
                        <IconButton tone="danger" onClick={() => deleteTask(task.id)} aria-label="Excluir"><Trash2 className="w-4 h-4" /></IconButton>
                      </>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  );
}
