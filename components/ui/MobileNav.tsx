'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Aparece na barra inferior (as principais). O resto vai no menu "Mais". */
  primary?: boolean;
}

interface MobileNavProps {
  items: NavItem[];
  active: string;
  onSelect: (key: string) => void;
}

/**
 * Navegação de celular.
 *
 * Antes eram 9 abas numa barra rolando na horizontal: para achar a última
 * o professor tinha que arrastar às cegas, com a mão molhada.
 *
 * Agora: até 4 atalhos fixos + botão "Mais", que abre uma folha inferior
 * com tudo, em alvos grandes. Nada rola na horizontal.
 */
export function MobileNav({ items, active, onSelect }: MobileNavProps) {
  const [aberto, setAberto] = React.useState(false);

  const principais = items.filter(i => i.primary).slice(0, 4);
  const noMenu = items.filter(i => !principais.includes(i));
  const ativoEstaNoMenu = noMenu.some(i => i.key === active);

  const escolher = (k: string) => {
    onSelect(k);
    setAberto(false);
  };

  return (
    <>
      <nav className="md:hidden grid grid-cols-5 gap-1 px-2 py-2 bg-surface-deep border-t border-surface-raised z-50 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {principais.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            aria-current={active === key ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-1 min-h-14 rounded-control transition-colors',
              active === key ? 'bg-brand text-brand-ink' : 'text-ink-on-dark-muted active:bg-surface-raised'
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-micro font-bold leading-none">{label}</span>
          </button>
        ))}

        {noMenu.length > 0 && (
          <button
            onClick={() => setAberto(true)}
            aria-label="Mais abas"
            className={cn(
              'flex flex-col items-center justify-center gap-1 min-h-14 rounded-control transition-colors',
              ativoEstaNoMenu ? 'bg-brand text-brand-ink' : 'text-ink-on-dark-muted active:bg-surface-raised'
            )}
          >
            <Menu className="w-5 h-5 shrink-0" />
            <span className="text-micro font-bold leading-none">Mais</span>
          </button>
        )}
      </nav>

      <AnimatePresence>
        {aberto && (
          <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAberto(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative bg-surface-deep rounded-t-panel border-t border-surface-raised-soft pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <span className="text-sm font-black text-white uppercase tracking-wider">Todas as abas</span>
                <button
                  onClick={() => setAberto(false)}
                  aria-label="Fechar"
                  className="p-2.5 min-w-11 min-h-11 flex items-center justify-center text-ink-on-dark-muted active:text-white rounded-control"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 px-4 pb-2">
                {items.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => escolher(key)}
                    className={cn(
                      'flex items-center gap-3 p-4 min-h-14 rounded-card border text-left transition-colors',
                      active === key
                        ? 'bg-brand text-brand-ink border-brand'
                        : 'bg-surface-raised text-ink-on-dark border-surface-raised-soft active:bg-surface-raised-soft'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-bold leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
