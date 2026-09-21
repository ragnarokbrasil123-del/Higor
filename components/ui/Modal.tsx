'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Barra fixa no rodapé, para os botões de ação. */
  footer?: React.ReactNode;
  /** Conteúdo extra no cabeçalho, à direita do título. */
  headerAction?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const LARGURA = {
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

/**
 * Diálogo padrão do app: fundo escurecido, cabeçalho fixo,
 * corpo rolável e rodapé fixo. Antes eram 3 cópias à mão.
 */
export function Modal({ open, onClose, title, footer, headerAction, size = 'lg', children }: ModalProps) {
  // fecha no Esc
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /**
   * No celular, o teclado cobre o rodapé (botão Salvar) se o modal continuar
   * medindo pela altura "de layout" — ela não encolhe quando o teclado abre.
   * Sincronizando com o visualViewport, o modal encolhe junto com o teclado
   * e o rodapé continua visível acima dele.
   */
  const [viewport, setViewport] = React.useState<{ height: number; top: number } | null>(null);
  React.useEffect(() => {
    if (!open) return;
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const ajustar = () => setViewport({ height: vv.height, top: vv.offsetTop });
    ajustar();
    vv.addEventListener('resize', ajustar);
    vv.addEventListener('scroll', ajustar);
    return () => {
      vv.removeEventListener('resize', ajustar);
      vv.removeEventListener('scroll', ajustar);
    };
  }, [open]);

  const conteudo = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-x-0 top-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          style={viewport ? { height: viewport.height, transform: `translateY(${viewport.top}px)` } : { bottom: 0 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-surface-raised/60 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className={cn(
              'relative bg-surface w-full shadow-overlay flex flex-col overflow-hidden',
              // celular: folha inferior colada embaixo, ocupando quase toda a altura
              // (% em vez de dvh/vh: assim acompanha o encolhimento do wrapper quando o teclado abre)
              'rounded-t-panel max-h-[92%] pb-[env(safe-area-inset-bottom)]',
              // tablet para cima: diálogo centralizado
              'sm:rounded-panel sm:max-h-[90%] sm:pb-0',
              LARGURA[size]
            )}
          >
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0" aria-hidden="true">
              <span className="w-10 h-1 rounded-full bg-line-strong" />
            </div>

            {(title || headerAction) && (
              <div className="px-4 py-3 sm:p-5 border-b border-line bg-surface-sunken flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0 flex-1">
                  {typeof title === 'string' ? (
                    <h2 className="text-lg font-black text-ink truncate">{title}</h2>
                  ) : (
                    title
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {headerAction}
                  <IconButton onClick={onClose} aria-label="Fechar">
                    <X className="w-4 h-4" />
                  </IconButton>
                </div>
              </div>
            )}

            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 overscroll-contain">{children}</div>

            {footer && (
              <div className="p-4 bg-surface-sunken border-t border-line shrink-0 flex items-center gap-3">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  /**
   * Precisa ir direto pro <body> (portal). O <main> da página tem
   * `position: relative`, o que cria um contexto de empilhamento próprio —
   * preso lá dentro, nenhum z-index do modal consegue ficar acima de um
   * irmão do <main> (como a barra de navegação do celular). Renderizando
   * fora dessa árvore, o modal disputa camada direto com o resto da página.
   */
  if (typeof document === 'undefined') return null;
  return createPortal(conteudo, document.body);
}
