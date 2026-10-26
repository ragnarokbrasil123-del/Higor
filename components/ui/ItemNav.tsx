'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ============================================================
   Item da navegação lateral (desktop).

   Estava escrito à mão 13 vezes em app/page.tsx, com a mesma
   cadeia de classes copiada. Um item novo nascia por cópia, e
   mudar o visual da navegação era mudar 13 lugares.

   O estado ativo usa `bg-brand` com `text-brand-ink`: no tema
   Olimpo Aqua isso é branco sobre azul (4,56:1). O valor do token
   `brand` foi escolhido justamente para este par passar em AA,
   porque é o mais repetido do app.

   `aria-current="page"` existe para quem usa leitor de tela saber
   onde está — o destaque de cor sozinho não informa isso.
   ============================================================ */

interface ItemNavProps {
  icone: LucideIcon;
  rotulo: string;
  ativo: boolean;
  aoClicar: () => void;
  /** Contador à direita (pendências, por exemplo). */
  contador?: number;
}

export function ItemNav({ icone: Icone, rotulo, ativo, aoClicar, contador }: ItemNavProps) {
  return (
    <button
      onClick={aoClicar}
      aria-current={ativo ? 'page' : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-control border text-left',
        'transition-colors motion-safe:duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        ativo
          ? 'bg-brand text-brand-ink border-brand shadow-raised'
          : 'text-ink-on-dark border-transparent hover:bg-surface-raised-soft hover:text-ink-inverse'
      )}
    >
      <Icone className="w-5 h-5 shrink-0" />
      <span className="font-bold text-sm flex-1 min-w-0 truncate">{rotulo}</span>
      {contador !== undefined && contador > 0 && (
        <span
          className={cn(
            'numero shrink-0 min-w-5 px-1.5 py-0.5 rounded-badge text-micro font-black text-center',
            ativo ? 'bg-brand-ink/20 text-brand-ink' : 'bg-surface-raised-soft text-ink-on-dark'
          )}
        >
          {contador}
        </span>
      )}
    </button>
  );
}
