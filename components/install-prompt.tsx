'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

interface InstallPromptProps {
  /**
   * No app da equipe existe a barra de navegação colada embaixo — sem isto
   * o banner cobriria os botões de aba. O portal dos pais não tem barra,
   * então lá continua colado no rodapé.
   */
  acimaDaBarra?: boolean;
}

/** Guarda quando a pessoa fechou o convite, para ele não voltar a cada abertura. */
const CHAVE_DISPENSA = 'olimpo_install_dispensado';
const DIAS_DE_SILENCIO = 30;

export function InstallPrompt({ acimaDaBarra = false }: InstallPromptProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default true para não piscar na tela de quem já tem
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  /** Só vira true quando temos certeza de que dá para instalar. */
  const [podeConvidar, setPodeConvidar] = useState(false);

  // 'modal' (bloqueia tela), 'banner' (rodapé sutil), 'hidden' (fechado)
  // Começa como banner para não atrapalhar quem só quer ver a avaliação.
  const [displayMode, setDisplayMode] = useState<'modal' | 'banner' | 'hidden'>('banner');

  useEffect(() => {
    // Verifica se já está instalado (rodando como App nativo)
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isAppInstalled);

    if (isAppInstalled) return;

    // Fechou o convite há pouco tempo? Fica quieto.
    try {
      const quando = Number(localStorage.getItem(CHAVE_DISPENSA) || 0);
      if (quando && Date.now() - quando < DIAS_DE_SILENCIO * 86400000) return;
    } catch { /* navegador sem localStorage: segue */ }

    // Detecta se é iPhone (iOS)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // No iPhone não existe evento de instalação: só dá para orientar.
    if (ios) { setPodeConvidar(true); return; }

    /**
     * No Chrome o `beforeinstallprompt` NÃO dispara quando o app já está
     * instalado. Por isso o convite só aparece depois de receber o evento —
     * antes ele ficava insistindo com quem já tinha instalado.
     */
    const aoPoderInstalar = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPodeConvidar(true);
    };
    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    return () => window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
  }, []);

  /** Fecha e não volta a incomodar por um mês. */
  const dispensar = () => {
    setDisplayMode('hidden');
    try { localStorage.setItem(CHAVE_DISPENSA, String(Date.now())); } catch { /* ignora */ }
  };

  // Já instalado, sem como instalar, ou fechado pela pessoa: não mostra nada.
  if (isStandalone || !podeConvidar || displayMode === 'hidden') return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDisplayMode('hidden');
    setDeferredPrompt(null);
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
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={`fixed left-0 right-0 z-[99999] bg-slate-900 border-t border-slate-700 p-4 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:hidden ${
        acimaDaBarra
          ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]'
          : 'bottom-0 pb-8 md:pb-4'
      }`}
    >
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
        <button onClick={dispensar} aria-label="Fechar" className="p-1 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
      </div>
    </motion.div>
  );
}
