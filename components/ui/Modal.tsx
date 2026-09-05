'use client';

import React from 'react';
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className={cn(
              'relative bg-surface w-full rounded-panel shadow-overlay',
              'flex flex-col max-h-[92vh] overflow-hidden',
              LARGURA[size]
            )}
          >
            {(title || headerAction) && (
              <div className="p-5 border-b border-line bg-surface-sunken flex items-center justify-between gap-3 shrink-0">
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

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">{children}</div>

            {footer && (
              <div className="p-4 bg-surface-sunken border-t border-line shrink-0 flex items-center gap-3">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
