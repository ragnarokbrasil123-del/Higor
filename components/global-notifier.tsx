'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AppNotification {
  id: string;
  title: string;
  message: string;
}

export function GlobalNotifier({ isAdmin }: { isAdmin: boolean }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    // Se não for Admin, não fica escutando o banco
    if (!isAdmin) return;

    // Fica de escuta na tabela de Manutenção
    const channel = supabase
      .channel('manutencao-ao-vivo')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'maintenance_tasks' },
        (payload) => {
          const newTask = payload.new as any;
          addNotification({
            id: Date.now().toString(),
            title: 'Nova Demanda de Manutenção',
            message: newTask.title
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const addNotification = (notif: AppNotification) => {
    setNotifications((prev) => [...prev, notif]);
    
    // O balão some sozinho depois de 6 segundos
    setTimeout(() => {
      setNotifications((prev) => prev.filter(n => n.id !== notif.id));
    }, 6000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto w-80 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-4 flex items-start gap-4 relative overflow-hidden"
          >
            {/* Linha colorida lateral e Efeito de Brilho */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 shadow-[0_0_15px_#3b82f6]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-xl pointer-events-none" />
            
            <div className="p-2.5 bg-blue-500/20 rounded-xl shrink-0 mt-0.5 shadow-inner border border-blue-500/30">
              <Wrench className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            
            <div className="flex-1 relative z-10">
              <h4 className="text-white font-extrabold text-sm">{notif.title}</h4>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">{notif.message}</p>
            </div>
            
            <button 
              onClick={() => removeNotification(notif.id)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors relative z-10"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
