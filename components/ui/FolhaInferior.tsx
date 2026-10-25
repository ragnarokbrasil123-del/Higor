'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ============================================================
   Folha inferior (bottom sheet).

   Sobe de baixo no celular e vira diálogo centrado no desktop. A
   escolha não é estética: no celular, o conteúdo e os botões ficam
   na metade de baixo da tela, que é onde o polegar alcança. Um
   modal centrado obriga a pessoa a trocar a mão de posição.

   É aqui — e só aqui, mais a barra de navegação — que o efeito de
   vidro vale a pena: o fundo está parado atrás de uma camada que
   cobre a tela, então o blur é pintado uma vez. Em card de lista,
   o blur seria repintado a cada rolagem.

   A alça no topo existe para dizer "isto se arrasta/fecha" sem
   precisar escrever.
   ============================================================ */

interface FolhaInferiorProps {
  aberta: boolean;
  aoFechar: () => void;
  titulo?: string;
  /** Botões de ação. Ficam colados embaixo, dentro da área segura. */
  rodape?: React.ReactNode;
  children: React.ReactNode;
}

export function FolhaInferior({ aberta, aoFechar, titulo, rodape, children }: FolhaInferiorProps) {
  const caixaRef = useRef<HTMLDivElement>(null);

  // Escape fecha, como em qualquer diálogo
  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberta, aoFechar]);

  /* Trava a rolagem do fundo enquanto a folha está aberta: sem isso,
     arrastar dentro da folha rola a lista atrás dela. */
  useEffect(() => {
    if (!aberta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, [aberta]);

  useEffect(() => {
    if (aberta) setTimeout(() => caixaRef.current?.focus(), 50);
  }, [aberta]);

  if (!aberta) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center
                 bg-ink/40 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <div
        ref={caixaRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={e => e.stopPropagation()}
        className={cn(
          'w-full md:max-w-lg bg-surface outline-none',
          'rounded-t-panel md:rounded-panel shadow-overlay',
          'max-h-[88dvh] flex flex-col',
          'motion-safe:animate-[subir_.22s_cubic-bezier(.16,1,.3,1)]'
        )}
      >
        {/* alça: só no celular, onde o gesto faz sentido */}
        <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0" aria-hidden="true">
          <span className="w-10 h-1 rounded-full bg-line-strong" />
        </div>

        {titulo && (
          <div className="flex items-center justify-between gap-3 px-5 pt-3 md:pt-5 pb-3 shrink-0">
            <h2 className="font-titulo text-lg font-semibold text-ink leading-tight">{titulo}</h2>
            <button
              onClick={aoFechar}
              aria-label="Fechar"
              className="shrink-0 -mr-2 p-2 rounded-control text-ink-subtle hover:text-ink hover:bg-surface-sunken transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="px-5 pb-2 overflow-y-auto grow">{children}</div>

        {rodape && (
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:pb-5 shrink-0 border-t border-line flex gap-2">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
