'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default true para não piscar na tela de quem já tem
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // 'modal' (bloqueia tela), 'banner' (rodapé sutil), 'hidden' (fechado)
  const [displayMode, setDisplayMode] = useState<'modal' | 'banner' | 'hidden'>('modal');

  useEffect(() => {
    // Verifica se já está instalado (rodando como App nativo)
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isAppInstalled);

    if (isAppInstalled) return;

    // Detecta se é iPhone (iOS)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Captura o evento nativo de instalação do Android
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  // Se já tiver instalado ou se o usuário fechou totalmente, não mostra nada.
  if (isStandalone || displayMode === 'hidden') return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Se o Chrome liberou a instalação, prossegue
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDisplayMode('hidden'); // Some se instalar
      }
      setDeferredPrompt(null);
    } else {
      // Se a pessoa abriu pelo navegador do WhatsApp/Instagram ou faltou ícone
      alert("Para instalar, você precisa abrir este link no navegador Google Chrome! Se você já estiver no Chrome, clique nos 3 pontinhos no canto superior e escolha 'Instalar Aplicativo'.");
    }
  };

  // --- MODO 1: TELA CHEIA (INVASIVO) ---
  if (displayMode === 'modal') {
    return (
      <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center md:hidden">
        <div className="w-24 h-24 bg-amber-500 rounded-3xl mb-8 shadow-[0_0_40px_rgba(245,158,11,0.4)] flex items-center justify-center p-4">
          <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
        </div>
        
        <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Instale o App</h2>
        <p className="text-slate-300 text-sm mb-10 max-w-[280px]">Tenha o Clube Olimpo na tela do seu celular para acesso ultra-rápido à sua ficha.</p>

        {isIOS ? (
           <div className="bg-white/10 border border-white/20 p-6 rounded-3xl w-full max-w-sm flex flex-col items-center gap-4">
             <p className="text-white text-sm font-bold">No seu iPhone, siga os 2 passos:</p>
             <div className="flex items-center gap-3 text-slate-300 bg-black/40 px-4 py-3 rounded-xl w-full">
               <Share className="w-6 h-6 text-blue-400 shrink-0" /> 
               <span className="text-xs text-left">1. Toque em <b>Compartilhar</b> na barra inferior do seu Safari.</span>
             </div>
             <div className="flex items-center gap-3 text-slate-300 bg-black/40 px-4 py-3 rounded-xl w-full">
               <PlusSquare className="w-6 h-6 text-blue-400 shrink-0" /> 
               <span className="text-xs text-left">2. Toque em <b>Adicionar à Tela de Início</b>.</span>
             </div>
           </div>
        ) : (
           <button onClick={handleInstallClick} className="w-full max-w-xs py-4 bg-amber-500 text-black font-extrabold rounded-2xl text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-amber-500/30">
             <Download className="w-6 h-6" /> Instalar Agora
           </button>
        )}

        <button onClick={() => setDisplayMode('banner')} className="mt-8 text-slate-500 font-bold text-sm underline underline-offset-4 hover:text-white transition-colors">
          Lembrar mais tarde
        </button>
      </div>
    );
  }

  // --- MODO 2: BANNER (SUTIL NO RODAPÉ) ---
  return (
    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 z-[99999] bg-slate-900 border-t border-slate-700 p-4 pb-8 md:pb-4 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:hidden">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-black rounded-lg border border-slate-700 flex items-center justify-center p-1">
          <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Clube Olimpo App</p>
          <p className="text-slate-400 text-[10px]">Acesso rápido e seguro</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {isIOS ? (
           <button onClick={() => setDisplayMode('modal')} className="px-4 py-2 bg-white/10 text-blue-400 font-bold text-xs rounded-full border border-blue-400/30">Instalar App</button>
        ) : (
           <button onClick={handleInstallClick} className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-full shadow-lg shadow-amber-500/20">Instalar</button>
        )}
        <button onClick={() => setDisplayMode('hidden')} className="p-1 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
      </div>
    </motion.div>
  );
}
