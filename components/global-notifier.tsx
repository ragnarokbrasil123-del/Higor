'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, X, BellRing } from 'lucide-react';

interface GlobalNotifierProps {
  isAdmin: boolean;
}

export function GlobalNotifier({ isAdmin }: GlobalNotifierProps) {
  const [notifications, setNotifications] = useState<{ id: string; title: string; time: string }[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(true); 
  
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  useEffect(() => {
    if (!isAdmin) return;

    // Verifica se já ligou as notificações
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    };
    checkSubscription();

    // Mantém o Balãozinho original funcionando
    const channel = supabase
      .channel('manutencao-ao-vivo')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'maintenance_tasks' },
        (payload) => {
          const newTask = payload.new;
          const notif = {
            id: newTask.id,
            title: newTask.title,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setNotifications(prev => [...prev, notif]);
          
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notif.id));
          }, 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      alert('Seu navegador não suporta notificações nativas.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Você bloqueou as notificações!');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const publicVapidKey = 'BJx64L626N6Y5tY_D7goVf4l-PO2vpgax3PXFSDN59avftuq8_hWN3Neor_yff2j4GVwWhdWMKC1luKocmhClrg';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // Salva no banco de dados
      await supabase.from('push_subscriptions').insert([{ subscription }]);
      
      setIsSubscribed(true);
      alert('Pronto! O seu celular vai apitar com a tela apagada quando houver novos chamados.');
    } catch (err) {
      console.error(err);
      alert('Erro ao ativar notificações.');
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      {!isSubscribed && (
        <button 
          onClick={subscribeToPush}
          className="fixed bottom-6 right-6 z-[9998] bg-amber-500 hover:bg-amber-400 text-black px-4 py-3 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)] font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
        >
          <BellRing className="w-5 h-5 animate-pulse" />
          Ativar Alerta no Celular
        </button>
      )}

      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-start gap-4 min-w-[300px] pointer-events-auto"
            >
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm leading-tight">Nova Manutenção</p>
                <p className="text-slate-400 text-xs mt-1">{n.title}</p>
                <p className="text-slate-500 text-[10px] mt-2 font-mono">{n.time}</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="text-slate-500 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
